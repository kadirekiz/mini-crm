cat > docs/04-test-report.md <<'EOF'
# Test Report

## Test Tipleri
Bu projede ağırlıklı olarak **entegrasyon testleri** kullanılmıştır.
- Jest + Supertest ile HTTP üzerinden API endpoint’leri test edilir.
- Test koşusunda DB şeması temizlenir ve migration’lar uygulanır.

## Nasıl Çalıştırılır?
```bash
npm test

