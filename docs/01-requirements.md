# Requirements Specification (MiniCRM)

Bu doküman, “müşteri talepleri” belirsiz bırakıldığında geliştirme ekibinin netleştirmek için sorduğu sorular ve proje boyunca uygulanan kararları özetler.

## Kapsam
Sistem; müşteri, ürün ve sipariş yönetimi için REST API sağlar. Ayrıca CSV/XLSX üzerinden müşteri içe aktarma (ETL) ve API dokümantasyonu (Swagger) içerir.

## Varsayımlar ve Kararlar

### 1) Customer
- Müşteri kaydı `firstName` alanına ihtiyaç duyar.
- `email` opsiyoneldir; format geçersizse ETL sırasında `NULL` yapılır ve uyarı raporlanır.
- `phone` opsiyoneldir; normalize edilerek Türkiye formatında `+90XXXXXXXXXX` şeklinde saklanır (uygulanabiliyorsa).
- Silme işlemi fiziksel silme değil, **soft delete** (inactive) olarak ele alınır.
- Listeleme endpoint’i default olarak sadece aktif müşterileri döndürür; `includeInactive=true` ile pasifler dahil edilir.

### 2) Product
- Ürünler `sku` ile benzersizdir.
- Ürün soft delete (inactive) destekler.
- `trackStock=true` ise stok adedi takip edilir. Sipariş oluşturulurken stok yeterli değilse işlem reddedilir.

### 3) Order
- Sipariş 2 şekilde oluşturulabilir:
  - Customer order: `customerId` ile
  - Guest order: `guest` bilgileri ile (customerId null)
- Sipariş kalemleri zorunludur (`items[]`).
- Sipariş toplamı, kalemlerin `unitPrice * quantity` toplamı ile hesaplanır.
- Stok takibi açık ürünlerde sipariş oluşunca stok düşer.
- Stok yetersizliğinde API `409 CONFLICT` döndürür.
- Sipariş durumları: `pending`, `preparing`, `shipped`, `delivered`, `cancelled` (uygulamada bu set kullanılmaktadır).

## API Gereksinimleri (Özet)
- Customers CRUD (soft delete dahil)
- Products CRUD (soft delete + sku unique)
- Orders create/list/detail + status update
- Swagger UI: `/docs`
- ETL: müşteri import (dry-run + raporlama)

## ETL Gereksinimleri
- CSV/XLSX dosyası okutulur.
- Email normalize edilir (lowercase); invalid email NULL yapılır.
- Telefon normalize edilir (`+90` formatı hedeflenir); normalize edilemiyorsa NULL yapılır.
- Duplicate çözümü:
  - Öncelik: email
  - Yoksa: phone
- Dry-run: DB’ye yazmadan “would create/update/unchanged” sayılarını verir.
- Rapor: `warningsByCode` ve `errorsByCode` içerir.
