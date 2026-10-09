# Kodbox

Genel amaçlı ders, materyal ve ödev platformu. İlk okul: Hatay Mustafa Kemal Üniversitesi (`@ogr.mku.edu.tr`).
Platform dosya barındırmaz; her şey bağlantı olarak paylaşılır.

- Ürün planı: [`PLAN.md`](./PLAN.md)
- Tasarım sistemi: [`DESIGN.md`](./DESIGN.md)
- **Kod kuralları (geliştiriciler ve agent'lar için zorunlu okuma):** [`CONVENTIONS.md`](./CONVENTIONS.md)

## Teknoloji

Next.js 16.4 (App Router, Cache Components + Partial Prefetching, Turbopack) · React 19 · TypeScript ·
Tailwind CSS v4 · shadcn/ui (Radix) · PostgreSQL 16 · Drizzle ORM · Zod 4 · argon2id · Arctic (OAuth) ·
Resend · Cloudflare Turnstile · Vitest.

## Kurulum

Gereksinimler: Node.js ≥ 22, Docker Desktop.

```bash
npm install
cp .env.example .env.local      # anahtarları doldurun (aşağıya bakın)
npm run db:up                   # Postgres 16 → localhost:5433 (kodbox + kodbox_test veritabanları)
npm run db:migrate              # şemayı uygula
npm run db:seed                 # MKÜ okulu, aktif dönem, ilk admin
npm run db:seed:demo            # (isteğe bağlı) demo eğitmen, öğrenciler, dersler, ödevler
npm run dev                     # http://localhost:3000
```

`.env.local` için anahtar üretimi:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"  # SESSION_SECRET
openssl rand -base64 32                                                       # DATA_ENCRYPTION_KEY
openssl rand -base64 32                                                       # BLIND_INDEX_KEY (farklı olmalı)
```

`RESEND_API_KEY` boşsa mailler gönderilmez; konsola yazılır ve `.dev-mail/` klasörüne HTML olarak kaydedilir.
Turnstile için `.env.example`'daki Cloudflare test anahtarları yerelde her zaman geçer.

## Komutlar

| Komut | Açıklama |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi / sunucusu |
| `npm run typecheck` | Rota tiplerini üretir + `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Vitest (birim + `kodbox_test` üzerinde DB entegrasyon testleri) |
| `npm run check` | typecheck + lint + test |
| `npm run db:up` / `db:down` | Docker Postgres'i başlat / durdur |
| `npm run db:generate` | Şema değişikliğinden yeni migration üret (`drizzle/`) |
| `npm run db:migrate` | Migration'ları uygula |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Temel veri (idempotent; admin şifresini sıfırlamaz) |
| `npm run db:seed:demo` | Demo verisini **silip yeniden** oluşturur (tarihler "şimdi"ye göre) |
| `npm run db:reset` | YEREL veritabanını sil → migrate → seed |

## Hesaplar

| Rol | Giriş | Şifre | Not |
|---|---|---|---|
| Admin | `admin@mku.edu.tr` (Personel sekmesi) | `.env.local` → `ADMIN_PASSWORD` | İlk girişte şifre değiştirmeye zorlanır |
| Eğitmen (demo) | `demo.egitmen@mku.edu.tr` (Personel) | `Demo1234` | Dr. Öğr. Üyesi Deniz Aksoy · BİL101, MAT201 |
| Öğrenci (demo) | `260000101@ogr.mku.edu.tr` (Öğrenci) | `Demo1234` | BİL101 + MAT201, teslimleri ve bildirimleri var |
| Öğrenci (demo) | `260000102@ogr.mku.edu.tr` | `Demo1234` | MAT201'de geç teslimi (2 sürüm geçmişli) var |
| Öğrenci (demo) | `260000103@ogr.mku.edu.tr` | `Demo1234` | Sadece BİL101 |

Demo verisinde ödevler farklı durumlardadır: süresi geçmiş (puanı yayınlanmış), 24 saat içinde biten (geç teslim
açık), 5 gün sonra biten, süresiz (teslim gerektirmeyen), geç teslim penceresinde olan ve zamanlanmış.
BİL101 listesinde henüz kayıt olmamış bir numara (`260000199`) da vardır.

> F0 itibarıyla giriş formu görsel iskelettir; giriş/kayıt akışları F1'de bağlanır.

## Klasör yapısı

```
src/
  app/
    (auth)/            giris, kayit, sifremi-unuttum, dogrula/[token], sifre-sifirla/[token], sifre-degistir
    (app)/             oturumlu kabuk (AppShell): ogrenci/, egitmen/, admin/, hesap/, bildirimler/
    %5Ftasarim/        /_tasarim stil rehberi (sadece geliştirmede)
    kvkk/              aydınlatma metni
    route.ts           "/" → oturum ve role göre yönlendirme
  components/
    ui/                shadcn/ui bileşenleri (Kodbox token'larına bağlı)
    app-shell/         kabuk, menü, breadcrumb, bildirim zili, kullanıcı menüsü
    auth/              auth düzeni, mozaik, auth formları
    *.tsx              ortak bileşenler (deadline-ribbon, markdown, link-list, form-field …)
  db/                  schema.ts, index.ts (Drizzle istemcisi), seed/
  hooks/               use-now, use-theme, use-login-kind
  lib/
    server/            SADECE sunucu: crypto, password, session, auth, rate-limit, turnstile, mail, …
    actions/           paylaşılan Server Action'lar (çıkış, tema)
    *.ts               saf yardımcılar (dates, identity, deadline, routes, links, mask, action-state …)
  proxy.ts             iyimser oturum kontrolü (Next 16'da middleware → proxy)
drizzle/               SQL migration'ları
docker/                Postgres init betikleri
scripts/               Next dışı betikler için env yükleyici
test/                  Vitest kurulumu
```

## Güvenlik özeti

- E-posta ve öğrenci numarası AES-256-GCM ile şifreli + HMAC-SHA256 blind index ile aranabilir.
- Şifreler argon2id (OWASP parametreleri). DB tabanlı oturum: çerezde rastgele token, DB'de SHA-256'sı; 30 gün kayan.
- Canlıda çerez `__Host-kodbox_session` (Secure). Bu yüzden `npm start` ile **http** üzerinde yerel deneme yaparken
  oturum tutulmaz; yerel geliştirmede `npm run dev` kullanın.
- Rate limit veritabanında; Turnstile; CSP ve güvenlik başlıkları `next.config.ts`'te.
