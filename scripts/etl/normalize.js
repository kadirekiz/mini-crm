// scripts/etl/normalize.js
// ETL sırasında gelen verileri normalize etmek için yardımcı fonksiyonlar

function normalizeTurkish(str) {
  return String(str)
    .replace(/İ/g, 'I')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'G')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'U')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 'S')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'O')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'C')
    .replace(/ç/g, 'c');
}

function normalizeHeader(h) {
  if (h === null || h === undefined) return '';
  const s = normalizeTurkish(String(h)).toLowerCase().trim();
  return s
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
}

function cleanString(v) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/\s+/g, ' ').trim();
}

function normalizeEmail(emailRaw) {
  const email = cleanString(emailRaw).toLowerCase();
  if (!email) return { value: null, ok: true };
  // Basit, pratik bir kontrol (aşırı katı değil)
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return { value: ok ? email : null, ok };
}

function normalizePhone(phoneRaw) {
  const raw = cleanString(phoneRaw);
  if (!raw) return { value: null, ok: true };

  const hasPlus = raw.trim().startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return { value: null, ok: false };

  // 00 ile başlıyorsa (örn 0090...) kaldır
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Türkiye odaklı normalize
  // +90..., 90..., 0..., gibi prefixleri temizle
  if (digits.startsWith('90')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);

  // Artık ideal durumda 10 hane kalmalı
  if (digits.length === 10) {
    return { value: `+90${digits}`, ok: true };
  }

  // TR değilse ama + ile gelmişse (ülke kodu farklı olabilir) en azından +digits şeklinde sakla
  if (hasPlus && digits.length >= 10) {
    return { value: `+${digits}`, ok: true };
  }

  return { value: null, ok: false };
}



function sanitizeName(nameRaw) {
  const s = cleanString(nameRaw);
  if (!s) return '';
  // Çok basit temizlik
  return s;
}

module.exports = {
  normalizeHeader,
  cleanString,
  normalizeEmail,
  normalizePhone,
  sanitizeName
};
