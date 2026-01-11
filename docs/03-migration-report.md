# Migration Report

Bu projede veritabanı şeması Sequelize migration’ları ile yönetilmektedir. Migration’lar artan zaman damgalarıyla sıralı şekilde uygulanır (`npx sequelize db:migrate`). Test ortamında şema her test koşusunda temizlenip migration’lar tekrar uygulanır.

## Migration Listesi ve Amaçları

### 20240101000000-create-customer.js
- `customers` tablosu oluşturulur.
- Müşteri temel alanları tanımlanır (ad/soyad, email, telefon, adres vb.).
- Soft delete için `is_active` benzeri alan mantığı kullanılır (API tarafında “inactive” filtrelenir).

### 20240102000000-create-order.js
- `orders` tablosu oluşturulur.
- Siparişin müşteri ile ilişkisi ve temel alanları tanımlanır (durum, toplam tutar vb.).
- İlerleyen migration’larda siparişin guest senaryosu için genişletilmesi planlanmıştır.

### 20240103000000-fix-initial-schema.js
- İlk şemadaki tutarsızlıkları düzeltir.
- Kolon isimleri, nullability, default değerler, indeks/constraint gibi ayarlamalar bu migration’da stabilize edilir.

### 20240104000000-create-product.js
- `products` tablosu oluşturulur.
- Ürün alanları: `sku` (benzersiz), `price`, `track_stock`, `stock_quantity`, `is_active` vb.
- Stok takibi yapılabilen ürünlerde sipariş anında stok düşümü desteklenir.

### 20240105000000-create-order-items.js
- Sipariş kalemleri için `order_items` tablosu oluşturulur.
- `order_id` ve `product_id` ile ilişki kurulur.
- `quantity`, `unit_price`, `line_total` alanlarıyla sipariş toplamı hesaplaması desteklenir.

### 20240106000000-add-guest-orders.js
- Guest sipariş senaryosu eklenir:
  - `orders.customer_id` alanı nullable hale getirilir (müşteri seçilmeden sipariş oluşturulabilir).
  - `guest_first_name`, `guest_last_name`, `shipping_address` gibi alanlar eklenir.
- Böylece sipariş iki şekilde oluşabilir:
  - Customer order (customerId dolu)
  - Guest order (customerId null + guest alanları dolu)

## Test Ortamı Notu
Test koşularında migration “undo” yerine şema reset yaklaşımı kullanılır:
- `public` schema drop + recreate
- ardından migration’ların yeniden uygulanması

Bu yaklaşım, nullable/non-null değişimleri veya guest order gibi senaryolarda “down migration sırasında mevcut verinin constraint’e takılması” riskini ortadan kaldırır.
