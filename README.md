## Quick Start (Local)

## Repository
GitHub: https://github.com/kadirekiz/mini-crm

## CI / PR History
- CI: GitHub Actions (CI workflow)
- PR & Code Review: Pull Requests sekmesi

### Requirements
- Docker Desktop
- Node.js (>= 20)
- npm

### Setup
```bash
cp .env.example .env
npm install
npm run db:up
npm run migrate


# MiniCRM (Yarım Kalmış Proje)

Bu proje, küçük bir e-ticaret firmasının müşteri ve sipariş yönetimi için başlanmış **ama tamamlanmamış** bir MiniCRM sistemidir.

## Durum

> Proje yaklaşık %40 civarında tamamlanmıştır.
> API uçları, testler, loglama ve migration yapısı **tamamlanmamıştır**.

## Hızlı Başlangıç (Önerilen: Docker ile Postgres)

### 1) Projeyi aç

```bash
cd mini-crm
```

### 2) Env dosyasını hazırla

```bash
cp .env.example .env
```

### 3) Veritabanını (Postgres) ayağa kaldır

```bash
npm run db:up
```

DB'nin ayağa kalktığını görmek için:

```bash
docker ps
```

### 4) Bağımlılıkları kur

```bash
npm install
```

### 5) Migration'ları çalıştır

```bash
npm run migrate
```

### 6) Uygulamayı çalıştır

```bash
npm run dev
```

Uygulama varsayılan olarak: `http://localhost:3000`

Swagger UI (API dokümantasyonu): `http://localhost:3000/docs`

## Docker'ı kapatmak (İsteğe bağlı)

```bash
npm run db:down
```

DB verisini de silip sıfırdan başlamak istersen:

```bash
npm run db:reset
```


## Test

```bash
npm test
```

Not: Testler `NODE_ENV=test` ile çalışır, `DB_NAME_TEST` veritabanını kullanır ve migration'ları otomatik uygular.

## Yeni: Products ve Orders (Step 3)

Not: Sipariş listelemede kalemleri de görmek istersen: `/api/orders?includeItems=true`

### Postgres (Docker)
```bash
npm run db:up
npm run migrate
npm run dev
```

### Örnek istekler

#### Product oluştur
```bash
curl -i -X POST "http://localhost:3000/api/products"   -H "Content-Type: application/json"   -d '{"name":"Keyboard","sku":"KB-001","price":199.90,"trackStock":true,"stockQuantity":5}'; echo
```

#### Order (customer ile)
```bash
# önce customer ve product oluşturduktan sonra:
curl -i -X POST "http://localhost:3000/api/orders"   -H "Content-Type: application/json"   -d '{"customerId":1,"items":[{"productId":1,"quantity":2}],"shippingAddress":"Istanbul"}'; echo
```

#### Order (guest)
```bash
curl -i -X POST "http://localhost:3000/api/orders"   -H "Content-Type: application/json"   -d '{"guest":{"firstName":"Ada","lastName":"Lovelace"},"items":[{"productId":1,"quantity":1}],"shippingAddress":"Istanbul"}'; echo
```
## Step 5: ETL (Excel/CSV'den Customer Import)

Bu adımda, dış kaynaktan (CSV/XLSX) gelen müşteri verisini **normalize ederek** sisteme aktaran bir ETL scripti eklenmiştir.

### Neler yapar?
- Email'i lowercase yapar; format geçersizse `NULL` yapar (rapora yazar).
- Telefonu mümkünse `+90...` formatına çevirir; tanınamazsa `NULL` yapar (rapora yazar).
- `firstName` boşsa: `lastName`'den türetir, o da yoksa `"Unknown"` yapar (rapora yazar).
- Duplicate tespiti:
  - Önce `email` (varsa)
  - Email yoksa `phone`
- Duplicate bulunduğunda **sadece boş alanları dolduracak şekilde merge** eder (mevcut dolu alanları ezmez).
- İşlem sonunda JSON raporu üretir.

### Örnek veri dosyası
- `data/sample_customers.csv`

### Dry-run (DB'ye yazmadan rapor üret)
```bash
npm run etl:dryrun-customers
```

### Import (DB'ye yazar)
```bash
npm run etl:import-customers
```

Rapor dosyaları:
- `reports/etl-customers-dryrun.json`
- `reports/etl-customers-report.json`

### Kendi dosyanla çalıştırma
```bash
node scripts/etl/importCustomers.js --file data/my_customers.xlsx --sheet Sheet1 --report reports/my-report.json
```

> İpucu: Script'i çalıştırmadan önce DB'nin çalıştığından emin ol:
> `npm run db:up`
