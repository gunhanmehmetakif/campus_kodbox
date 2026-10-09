# Kodbox Campus

Ders, materyal ve ödev platformu (Next.js 16 + PostgreSQL + Drizzle). Ürün kararları: `docs/PRD.md`, geliştirme kuralları: `docs/SOZLESME.md`, güncel durum: `docs/DURUM.md`.

## Kurulum

Gereksinimler: Node.js 22+, Docker.

1. Bağımlılıkları kur: `npm install`
2. Ortam dosyasını hazırla: `.env.example` dosyasını `.env` olarak kopyala ve boş anahtarları doldur
   (`SESSION_SECRET`, `DATA_ENCRYPTION_KEY`, `BLIND_INDEX_KEY`, `SEED_ADMIN_PASSWORD`). Üretim komutları dosyanın içinde yazıyor.
3. Veritabanını başlat: `npm run db:up` (Postgres 16, port 5433; test veritabanı `kodbox_test` otomatik oluşur)
4. Tabloları oluştur: `npm run db:migrate`
5. Başlangıç verisi (MKÜ, aktif dönem, admin): `npm run db:seed` (tekrar çalıştırmak güvenlidir)
6. Geliştirme sunucusu: `npm run dev` → http://localhost:3000

Geliştirmede mailler gönderilmez, `.dev-mail/` klasörüne HTML olarak yazılır. Turnstile için `.env.example` içindeki test anahtarları yeterlidir.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run check` | typecheck + lint + test |
| `npm test` | Vitest (DB testleri `kodbox_test` veritabanını kullanır, erişilemezse atlanır) |
| `npm run db:generate` | Şema değişikliğinden migration üretir |
| `npm run db:migrate` | Migration'ları uygular |
| `npm run db:seed` | Idempotent başlangıç verisi |
| `npm run db:reset` | Yerel veritabanını sıfırlar, migrate + seed (yalnız localhost) |
| `npm run db:down` | Postgres'i durdurur (veri korunur) |

İlk admin girişinde şifre değiştirmek zorunludur.
