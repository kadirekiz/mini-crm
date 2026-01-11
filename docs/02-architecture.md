# Architecture & Design

## Teknoloji Yığını
- Node.js + Express (REST API)
- PostgreSQL
- Sequelize ORM + migrations
- Jest + Supertest (entegrasyon testleri)
- Swagger UI (`/docs`)
- Docker (Postgres için)

## Katmanlar
- **Routes (HTTP)**: Express route tanımları (request/response)
- **Services**: İş kuralları (ör. sipariş oluşturma, stok düşümü, transaction)
- **Models (Sequelize)**: DB erişim katmanı ve ilişkiler
- **Scripts (ETL)**: Dosya okuma, normalize, duplicate çözümü, raporlama

## Veritabanı Şeması (Yüksek Seviye)
- `customers`
- `products`
- `orders`
- `order_items`

İlişkiler:
- Customer 1 — N Orders (customer order için)
- Order 1 — N OrderItems
- Product 1 — N OrderItems

Guest order için `orders.customer_id` nullable olup guest alanları doldurulur.

## Kritik Tasarım Kararları
### Transaction Kullanımı
Sipariş oluşturma sırasında:
- Order + OrderItems yazımı
- Stok düşümü
tek transaction içinde ele alınır. Böylece kısmi yazım/stock tutarsızlığı engellenir.

### Hata Yönetimi
- Hatalar tutarlı JSON formatında döndürülür (code/message/details).
- Stok yetersizliği `409 CONFLICT` olarak modellenmiştir.

### Soft Delete
- Customer ve Product için `isActive` mantığı ile soft delete uygulanır.
- Listelemelerde default aktif kayıtlar döner, `includeInactive=true` ile tümü döner.

## UML (Mermaid)

### Use Case
```mermaid
flowchart LR
  A[User] --> C1[Manage Customers]
  A --> C2[Manage Products]
  A --> C3[Create Orders]
  A --> C4[Update Order Status]
  A --> C5[Import Customers (ETL)]


sequenceDiagram
  participant U as Client
  participant API as Orders API
  participant S as OrderService
  participant DB as PostgreSQL

  U->>API: POST /api/orders (customerId, items)
  API->>S: createOrder()
  S->>DB: BEGIN TX
  S->>DB: INSERT orders
  S->>DB: INSERT order_items
  S->>DB: UPDATE products (stock decrement)
  S->>DB: COMMIT
  S-->>API: order detail
  API-->>U: 201 Created (order)


sequenceDiagram
  participant U as User
  participant ETL as importCustomers.js
  participant DB as PostgreSQL

  U->>ETL: Run with --dry-run
  ETL->>DB: SELECT by email/phone (duplicate check)
  ETL-->>U: summary (wouldCreate/wouldUpdate/wouldUnchanged)
  ETL-->>U: JSON report (warningsByCode)



---

## 4) `docs/04-test-report.md`

```md
# Test Report

## Test Tipleri
Bu projede ağırlıklı olarak **entegrasyon testleri** kullanılmıştır.
- Jest + Supertest ile HTTP üzerinden API endpoint’leri test edilir.
- Test koşusunda DB şeması temizlenir ve migration’lar uygulanır.

## Nasıl Çalıştırılır?
```bash
npm test

