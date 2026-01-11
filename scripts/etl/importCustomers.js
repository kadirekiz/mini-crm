// scripts/etl/importCustomers.js
//
// Kullanım örnekleri:
//   node scripts/etl/importCustomers.js --file data/sample_customers.csv
//   node scripts/etl/importCustomers.js --file data/sample_customers.xlsx --sheet Sheet1
//   node scripts/etl/importCustomers.js --file data/sample_customers.csv --dry-run --report reports/dryrun.json
//
// Not: Bu script, DB'ye yazmadan önce verileri normalize etmeye çalışır.
// - Email => lowercase
// - Telefon => +90... (E.164 benzeri)
// - firstName boşsa lastName'den türetir veya "Unknown" yapar
// - Duplicate yakalama: email (varsa) aksi halde phone
//
// Rapor çıktısı JSON olarak yazılır (varsayılan: reports/etl-customers-report.json)

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// .env yükle
require('dotenv').config();

const {
  normalizeHeader,
  cleanString,
  normalizeEmail,
  normalizePhone,
  sanitizeName
} = require('./normalize');

function computeMergePatch(existing, incoming) {
  // Mevcut kayıtta boş olan alanları, incoming ile doldur (dolu alanları ezme)
  const patch = {};
  const fields = ['firstName', 'lastName', 'phone', 'email', 'address'];

  for (const f of fields) {
    const cur = existing ? existing[f] : null;
    const inc = incoming ? incoming[f] : null;

    const curEmpty = cur === null || cur === undefined || String(cur).trim() === '';
    const incNonEmpty = inc !== null && inc !== undefined && String(inc).trim() !== '';

    if (curEmpty && incNonEmpty) {
      patch[f] = inc;
    }
  }

  return patch;
}


function buildHeaderMap(row) {
  const map = {};
  for (const k of Object.keys(row)) {
    map[normalizeHeader(k)] = k;
  }
  return map;
}

function pick(row, headerMap, candidates) {
  for (const key of candidates) {
    const actual = headerMap[key];
    if (!actual) continue;
    const v = row[actual];
    if (v === null || v === undefined) continue;
    const s = cleanString(v);
    if (s) return s;
  }
  return '';
}

function nowIso() {
  return new Date().toISOString();
}

async function main() {
  const argv = yargs(hideBin(process.argv))
    .option('file', { type: 'string', demandOption: true, describe: 'CSV/XLSX dosya yolu' })
    .option('sheet', { type: 'string', describe: 'XLSX sheet adı (opsiyonel)' })
    .option('dry-run', { type: 'boolean', default: false, describe: 'DB yazmadan sadece rapor üret' })
    .option('report', { type: 'string', default: 'reports/etl-customers-report.json', describe: 'Rapor JSON çıktısı' })
    .option('limit', { type: 'number', default: 0, describe: 'İlk N satırı işle (0 = hepsi)' })
    .help()
    .parse();
    
  const dryRun = Boolean(argv['dry-run']);
  const filePath = path.resolve(process.cwd(), argv.file);
  const reportPath = path.resolve(process.cwd(), argv.report);
  const startedAt = nowIso();

  if (!fs.existsSync(filePath)) {
    console.error(`Dosya bulunamadı: ${filePath}`);
    process.exit(1);
  }

  // Dosyayı oku
  let workbook;
  try {
    workbook = xlsx.readFile(filePath, { raw: false });
  } catch (e) {
    console.error('Dosya okunamadı (CSV/XLSX olmalı). Hata:', e.message);
    process.exit(1);
  }

  const sheetName = argv.sheet || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.error(`Sheet bulunamadı: ${sheetName}. Mevcut sheet'ler: ${workbook.SheetNames.join(', ')}`);
    process.exit(1);
  }

  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
  const limitedRows = argv.limit > 0 ? rows.slice(0, argv.limit) : rows;

  const report = {
    meta: {
      file: path.relative(process.cwd(), filePath),
      sheet: sheetName,
      env: process.env.NODE_ENV || 'development',
      dryRun: Boolean(argv['dry-run']),
      startedAt,
      finishedAt: null
    },
    summary: {
      dryRun: Boolean(dryRun),
      totalRows: limitedRows.length,
      created: 0,
      updated: 0,
      unchanged: 0,
      skipped: 0,
      warnings: 0,
      errors: 0
    },
    items: [] // satır bazlı detaylar
  };

  const fieldCandidates = {
    firstName: ['firstname', 'first_name', 'ad', 'isim', 'name', 'musteriadi', 'musteri_ad'],
    lastName: ['lastname', 'last_name', 'soyad', 'surname', 'familyname', 'musterisoyadi', 'musteri_soyad'],
    email: ['email', 'e_mail', 'eposta', 'e_posta', 'mail'],
    phone: ['phone', 'telefon', 'gsm', 'mobile', 'ceptelefonu', 'cep_telefonu'],
    address: ['address', 'adres', 'adres1', 'fulladdress', 'tamadres', 'shippingaddress', 'kargoadresi', 'kargo_adresi']
  };

  // DB bağlantısı (dry-run modunda da mevcut kayıtları kontrol etmek için gerekir)
  let Customer, sequelize;
  {
    const models = require('../../src/models');
    Customer = models.Customer;
    sequelize = models.sequelize;
  }

  async function upsertCustomer(payload, match) {
    // match: { email, phone }
    let existing = null;

    if (match.email) {
      existing = await Customer.findOne({ where: { email: match.email } });
    }
    if (!existing && match.phone) {
      existing = await Customer.findOne({ where: { phone: match.phone } });
    }

    if (!existing) {
      const created = await Customer.create(payload);
      return { action: 'created', id: created.id, matchedOn: null };
    }

    // merge: sadece boş alanları doldur
    const updates = {};
    const fields = ['firstName', 'lastName', 'email', 'phone', 'address'];
    for (const f of fields) {
      const incoming = payload[f];
      const current = existing[f];
      const incomingHas = incoming !== null && incoming !== undefined && String(incoming).trim() !== '';
      const currentHas = current !== null && current !== undefined && String(current).trim() !== '';
      if (!currentHas && incomingHas) {
        updates[f] = incoming;
      }
    }

    if (Object.keys(updates).length === 0) {
      return { action: 'unchanged', id: existing.id, matchedOn: match.email ? 'email' : 'phone' };
    }

    await existing.update(updates);
    return { action: 'updated', id: existing.id, matchedOn: match.email ? 'email' : 'phone' };
  }

  for (let i = 0; i < limitedRows.length; i++) {
    const row = limitedRows[i];
    const rowNumber = i + 2; // header row = 1 varsayımı
    const headerMap = buildHeaderMap(row);

    const rawFirst = pick(row, headerMap, fieldCandidates.firstName);
    const rawLast = pick(row, headerMap, fieldCandidates.lastName);
    const rawEmail = pick(row, headerMap, fieldCandidates.email);
    const rawPhone = pick(row, headerMap, fieldCandidates.phone);
    const rawAddress = pick(row, headerMap, fieldCandidates.address);

    let firstName = sanitizeName(rawFirst);
    let lastName = sanitizeName(rawLast);
    if (!firstName) {
      if (lastName) {
        // lastName'i firstName'e taşı
        report.summary.warnings += 1;
        report.items.push({
          row: rowNumber,
          level: 'warning',
          code: 'MISSING_FIRSTNAME',
          message: 'firstName boştu; lastName firstName olarak kullanıldı',
          details: { originalLastName: lastName }
        });
        firstName = lastName;
        lastName = '';
      } else {
        report.summary.warnings += 1;
        report.items.push({
          row: rowNumber,
          level: 'warning',
          code: 'MISSING_NAME',
          message: 'firstName/lastName boştu; firstName="Unknown" olarak set edildi',
          details: {}
        });
        firstName = 'Unknown';
      }
    }

    const emailRes = normalizeEmail(rawEmail);
    const phoneRes = normalizePhone(rawPhone);
    const address = cleanString(rawAddress);

    if (rawEmail && !emailRes.ok) {
      report.summary.warnings += 1;
      report.items.push({
        row: rowNumber,
        level: 'warning',
        code: 'INVALID_EMAIL',
        message: 'Email formatı geçersiz; email NULL yapıldı',
        details: { value: rawEmail }
      });
    }

    if (rawPhone && !phoneRes.ok) {
      report.summary.warnings += 1;
      report.items.push({
        row: rowNumber,
        level: 'warning',
        code: 'INVALID_PHONE',
        message: 'Telefon formatı tanınamadı; phone NULL yapıldı',
        details: { value: rawPhone }
      });
    }

    const email = emailRes.value;
    const phone = phoneRes.value;

    // Dedup anahtarı yoksa, yine de create yaparız ama raporlarız
    if (!email && !phone) {
      report.summary.warnings += 1;
      report.items.push({
        row: rowNumber,
        level: 'warning',
        code: 'NO_DEDUP_KEY',
        message: 'Email/phone boş; duplicate tespiti yapılamadı',
        details: {}
      });
    }

    const payload = {
      firstName,
      lastName: lastName || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      isActive: true
    };

    /*if (argv['dry-run']) {
      report.summary.skipped += 1;
      continue;
    }*/
    // Dry-run planlama: DB'den mevcut müşteri var mı kontrol edip ne yapılacağını hesapla
    const match = { email, phone };

    let existing = null;
    if (match.email) {
      existing = await Customer.findOne({ where: { email: match.email } });
    }
    if (!existing && match.phone) {
      existing = await Customer.findOne({ where: { phone: match.phone } });
    }

    const patch = existing ? computeMergePatch(existing.toJSON(), payload) : {};
    const plannedAction = !existing ? 'created' : (Object.keys(patch).length > 0 ? 'updated' : 'unchanged');

    if (dryRun) {
      if (plannedAction === 'created') report.summary.created += 1;
      else if (plannedAction === 'updated') report.summary.updated += 1;
      else report.summary.unchanged += 1;

      report.items.push({
        row: rowNumber,
        level: 'info',
        code: `DRYRUN_${plannedAction.toUpperCase()}`,
        message: `Dry-run: Customer ${plannedAction}`,
        details: { matchedOn: match.email ? 'email' : (match.phone ? 'phone' : null) }
      });

      continue;
    }

    try {
      const { action, id, matchedOn } = await upsertCustomer(payload, { email, phone });
      if (action === 'created') report.summary.created += 1;
      if (action === 'updated') report.summary.updated += 1;
      if (action === 'unchanged') report.summary.unchanged += 1;

      report.items.push({
        row: rowNumber,
        level: 'info',
        code: action.toUpperCase(),
        message: `Customer ${action}`,
        details: { id, matchedOn }
      });
    } catch (e) {
      report.summary.errors += 1;
      report.items.push({
        row: rowNumber,
        level: 'error',
        code: 'DB_ERROR',
        message: e.message,
        details: { stack: e.stack }
      });
    }
  }

  report.meta.finishedAt = nowIso();

  // Raporu yaz
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

const warningsByCode = {};
const errorsByCode = {};

for (const it of report.items || []) {
  if (it.level === 'warning') inc(warningsByCode, it.code || 'UNKNOWN');
  if (it.level === 'error') inc(errorsByCode, it.code || 'UNKNOWN');
}

report.summary.warningsByCode = warningsByCode;
report.summary.errorsByCode = errorsByCode;

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  // Konsola özet bas
  console.log('ETL tamamlandı.');
  console.log(JSON.stringify({
    file: report.meta.file,
    totalRows: report.summary.totalRows,
    created: report.summary.created,
    updated: report.summary.updated,
    unchanged: report.summary.unchanged,
    skipped: report.summary.skipped,
    warnings: report.summary.warnings,
    errors: report.summary.errors,
    report: path.relative(process.cwd(), reportPath)
  }, null, 2));

  if (sequelize) {
    await sequelize.close();
  }

  // Hata varsa non-zero exit code
  if (report.summary.errors > 0) process.exit(2);
}

main().catch((err) => {
  console.error('Beklenmeyen hata:', err);
  process.exit(1);
});
