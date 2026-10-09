# Kodbox — Ders & Ödev Platformu · Ürün / UX Planı (v3)

> Genel amaçlı (sadece kod dersi değil) ders, materyal ve ödev platformu.
> İlk desteklenen okul: Mustafa Kemal Üniversitesi (`@ogr.mku.edu.tr`). Çok okullu yapıya hazır.
> Platform **dosya depolamaz**. Tüm dosyalar link olarak paylaşılır (Drive vb.).

---

## 1. Roller

| Rol | Hesap nasıl oluşur | Giriş |
|---|---|---|
| **Admin** | İlk kurulumda seed script ile (bir `@mku.edu.tr` maili) | Personel girişi: mail + şifre |
| **Eğitmen** | **Sadece admin oluşturur.** Admin eğitmenin okul mailini (`isim.soyisim@mku.edu.tr`), görünen adını (örn. "Dr. Öğr. Üyesi Ahmet Yılmaz") ve geçici şifresini girer | Personel girişi: **okul maili** + şifre. İlk girişte şifre değiştirmesi istenir. İsterse Google/Apple bağlar |
| **Öğrenci** | Kendisi kayıt olur (okul maili doğrulamalı) | Öğrenci girişi: **okul maili** + şifre · veya bağladığı Google/Apple hesabı |

- Eğitmen kendi kendine kayıt olamaz.
- Bir dersin tek eğitmeni olur. Asistan özelliği şimdilik yok.

## 2. Kimlik doğrulama akışları

### 2.1 Giriş ekranı
- **Herkes okul mailiyle giriş yapar.** Ekranın üstünde iki sekme bulunur: **Öğrenci** | **Personel**.
  Seçilen sekmeye göre mail kutusunun sağında sabit domain gösterilir:
  - Öğrenci: `[ 260000009      ] @ogr.mku.edu.tr`
  - Personel: `[ ahmet.yilmaz   ] @mku.edu.tr`
  - Kullanıcı mailin tamamını yapıştırırsa `@` sonrası otomatik temizlenir ve sekme uygun olana geçer.
  - Son seçilen sekme tarayıcıda hatırlanır.
- `Şifre` → **Giriş**
- **Robot doğrulaması:** Cloudflare Turnstile (çoğu kullanıcıda bulmaca çıkmadan, görünmez çalışır)
- Ayraç: "veya"
- **Google ile giriş** · **Apple ile giriş**
- Linkler: "Kayıt ol" · "Şifremi unuttum"
- Google/Apple ile girmeye çalışan hesap hiçbir kullanıcıya bağlı değilse kullanıcı
  **"Bu Google/Apple hesabı bir kullanıcıya bağlı değil. Önce kayıt olup ayarlardan bağlayabilirsiniz."**
  mesajıyla Kayıt ekranına yönlendirilir. Sosyal girişle **yeni hesap oluşturulmaz.**

### 2.2 Öğrenci kaydı
1. Kayıt ekranında okul seçilir (şimdilik tek seçenek, MKÜ). Ardından numara girilir: `[ 260000009 ] @ogr.mku.edu.tr`
2. Numaranın formatı kontrol edilir. Bu kontrol okul bazında ayarlanabilen bir regex'tir. MKÜ için varsayılan `^\d{6,12}$`, yani esnek tutuldu. Asıl doğrulama mail sahipliğiyle yapılır. Numaranın bir derste kayıtlı olması **şart değildir.** Formda Turnstile robot doğrulaması bulunur.
3. Ekranda her zaman aynı mesaj gösterilir: *"Numaranız doğruysa okul mailinize bir doğrulama linki gönderdik."*
   - Numara zaten kayıtlıysa yine aynı mesaj gösterilir, mail ise "Zaten hesabınız var, şifrenizi sıfırlamak için…" içerikli olur.
4. Mail içindeki link tek kullanımlıktır ve 24 saat geçerlidir. Linke tıklayan öğrenci **şifre belirler** (ve KVKK onay kutusunu işaretler). Bundan sonra hesap aktiftir.
5. Sonraki adım (atlanabilir): *"Daha hızlı giriş için Google veya Apple hesabınızı bağlayın"*.
6. Hesap ayarlarından bağlantılar eklenip kaldırılabilir ve şifre değiştirilebilir.
7. Öğrenci bir derse eklendiyse dersi panelinde otomatik görür. Eklenmediyse panelde "Henüz bir derse eklenmediniz" boş durumu gösterilir.

### 2.3 Şifre sıfırlama
Giriş ekranındaki gibi Öğrenci/Personel sekmesi seçilip mail girilir → kayıtlı mail adresine sıfırlama linki gider (tek kullanımlık, 1 saat geçerli) → yeni şifre belirlenir.
Eğitmenler için link admin'in girdiği eğitmen mailine gider. Admin ayrıca eğitmenin şifresini elle de sıfırlayabilir.

### 2.4 Spam / kötüye kullanım koruması
- **Cloudflare Turnstile** bulunan formlar: giriş, kayıt, şifremi unuttum, doğrulama mailini tekrar gönder.
- **Rate limit** (veritabanında tutulur):
  - aynı numaraya en fazla 3 mail/saat,
  - aynı IP'den en fazla 10 kayıt veya sıfırlama isteği/saat,
  - aynı hesaba 5 başarısız girişten sonra 15 dk bekleme.
- Mail tekrar gönderme butonu 60 sn bekleme süresiyle çalışır.

### 2.5 Mail kullanımı
Sistem **sadece kimlik doğrulama** için mail gönderir: kayıt doğrulama ve şifre sıfırlama.
Diğer tüm bildirimler site içinde gösterilir (bkz. §6).

## 3. Kişisel veri / KVKK

- **Ad-soyad tutulmaz.** Öğrenci sadece okul numarasıyla temsil edilir.
- Okul numarası ve mail adresi veritabanında **şifreli** (AES-256-GCM) saklanır.
  Öğrenci maili numaradan türetilir (`{no}@{student_email_domain}`).
  Arama ve tekillik için ayrıca **HMAC-SHA256 "blind index"** sütunu tutulur. Böylece numara düz metin olarak saklanmadan sorgulanabilir.
- Şifreler **argon2id** ile hash'lenir.
- **Admin** öğrenci numaralarını maskeli görür: `26*******9`.
- **Eğitmen** kendi dersindeki öğrencilerin numaralarını tam görür, çünkü onları kendisi eklemiştir ve teslimleri numara üzerinden takip eder.
- Kayıt sırasında aydınlatma metni gösterilir ve onay kutusu işaretlenmeden kayıt tamamlanmaz.

## 4. Eğitmen akışları

### 4.1 Ders yönetimi
- **Yeni ders**: ders adı, ders kodu (örn. BİL101), dönem (örn. 2026-2027 Güz), açıklama.
- **Öğrenci ekleme**: tek tek, toplu yapıştırma (alt alta / virgüllü) veya CSV/Excel yükleme ile.
  Sonuç özeti: `✓ 42 eklendi · ↺ 3 zaten vardı · ✗ 2 geçersiz (liste)`.
- Öğrenci listesinde her satırın durumu görünür: **Henüz kayıt olmadı** / **Aktif**. Eğitmen öğrenciyi dersten çıkarabilir.
- **Arşivleme**: dönem bitince ders "Arşivlendi" durumuna alınır. Arşivlenmiş ders salt okunurdur ve panelde "Geçmiş dersler" altında görünür.
  Admin bir dönemin tüm derslerini tek seferde arşivleyebilir.

### 4.2 İçerik tipleri (ders içinde)
1. **Duyuru**: zengin metin (Markdown).
2. **Materyal / ders notu**: başlık, zengin metin gövde ve **0..n link** (Drive, YouTube, indirme linki vb.).
   Ders notu doğrudan metin olarak da yazılabilir. Dosya yüklenmez.
3. **Ödev**: bkz. §4.3.

Tüm içerikler "Taslak" olarak kaydedilebilir veya **ileri tarihli yayın** için zamanlanabilir.

### 4.3 Ödev ayarları
| Alan | Açıklama |
|---|---|
| Başlık, açıklama (Markdown), kaynak linkleri | |
| Teslim tipi | **Link teslimi** (varsayılan: Google Drive linki) · **Teslim gerektirmeyen** (sadece bilgilendirme) |
| Süre | **Süresiz** veya **son teslim tarihi/saati** |
| Geç teslim | Kapalı · Açık (isteğe bağlı **son kabul tarihi** ve **geç teslim cezası**: sabit puan veya %) |
| Puanlama | Kapalı · Açık (maksimum puan, örn. 100) |

- Eğitmen tarihleri **her zaman** değiştirebilir, süre dolmuş olsa bile. Örneğin teslimi yeniden açabilir veya geç teslim penceresi ekleyebilir.
  Tarih değişince derse kayıtlı öğrencilere site içi bildirim gider.
- Ceza otomatik hesaplanmaz, **öneri** olarak gösterilir. Puanı her zaman eğitmen girer: "Ham puan 80 · Geç teslim −%10 → Önerilen 72".

### 4.4 Teslimleri inceleme
Ödev sayfasındaki "Teslimler" sekmesinde bir tablo bulunur:
öğrenci no · durum (Teslim etti / Etmedi / Geç) · teslim zamanı · link (yeni sekmede açılır) · puan · geri bildirim.
- Filtreler: Teslim etmeyenler / Geç teslimler / Puanlanmamışlar.
- Satır içinden puan ve geri bildirim girilir. Öğrenciye **"Puanı yayınla"** ile gösterilir (toplu yayınlama da mümkün).
- **CSV/Excel dışa aktarma.**

## 5. Öğrenci akışları

### 5.1 Panel
- **Yaklaşan teslimler** (tüm dersler, en yakın tarih en üstte; kalan süre sayacı; gecikenler kırmızı)
- **Derslerim** kartları (aktif dönem) · "Geçmiş dersler" (arşiv)
- Son duyurular

### 5.2 Ders sayfası
Sekmeler: **Akış** (duyurular) · **Materyaller** · **Ödevler** (Bekleyen / Teslim edilen / Puanlanan).

### 5.3 Ödev teslimi
- Ödev detay ekranında açıklama, son tarih, kalan süre ve geç teslim kuralları gösterilir.
- **Teslim kartı**, adım adım rehber içerir:
  1. Dosyanı Google Drive'a yükle
  2. Sağ tık → **Paylaş** → Genel erişim: **"Bağlantıya sahip olan herkes"** → Görüntüleyen
  3. **Bağlantıyı kopyala** ve aşağıya yapıştır
  4. ⚠️ Teslimden sonra dosyayı değiştirme. Teslim zamanı kayıt altına alınır.
- Link alanının kontrolü: geçerli URL olmalı ve varsayılan olarak `drive.google.com` / `docs.google.com` olmalı (eğitmen ödev ayarında "her link kabul" seçebilir).
- Öğrenci süre dolana kadar teslimini **güncelleyebilir**. Her değişiklik **teslim geçmişi**ne yazılır ve eğitmen geçmişi görür.
- Süre dolduysa: geç teslim kapalıysa kart kilitlenir. Açıksa "Geç teslim, −%X ceza uygulanabilir" uyarısıyla teslime izin verilir.
- Puan yayınlandığında puan ve geri bildirim gösterilir.

## 6. Site içi bildirimler
Üst bardaki 🔔 ikonunda okunmamış sayısı görünür, listede bildirimler okundu olarak işaretlenebilir.
Bildirim üreten olaylar:
- Öğrenci: derse eklendin · yeni duyuru/materyal/ödev · ödev tarihi değişti · son tarihe 24 saat kaldı · puanın yayınlandı
- Eğitmen: (isteğe bağlı) günlük özet olarak "X ödevine N yeni teslim"

## 7. Admin paneli
- **Eğitmenler**: oluştur (okul maili, görünen ad, geçici şifre), düzenle, şifre sıfırla, devre dışı bırak. Eğitmen maili `@mku.edu.tr` domain'inde olmalıdır (okul ayarından gelir).
- **Dersler**: tüm dersler, dönem filtresi, toplu arşivleme.
- **Öğrenciler**: maskeli numarayla arama, hesabı devre dışı bırakma, kayıt durumunu görme.
- **Okullar**: ad, öğrenci mail domain'i, numara format regex'i (şimdilik sadece MKÜ).
- **Dönemler**: dönem tanımla, aktif dönemi seç.
- Kritik işlemler için **denetim kaydı** (audit log).

## 8. Veri modeli (özet)
```
schools(id, name, student_email_domain, staff_email_domain, student_no_regex)
users(id, role[admin|instructor|student], school_id,
      email_enc, email_hash UNIQUE,            -- giriş kimliği (herkes için okul maili)
      student_no_enc NULL, student_no_hash NULL, -- sadece öğrenci (roster eşleşmesi için)
      display_name NULL,                        -- sadece eğitmen/admin (öğrencide isim tutulmaz)
      password_hash, status[pending|active|disabled], must_change_password,
      created_at)
oauth_accounts(id, user_id, provider[google|apple], provider_user_id UNIQUE)
sessions(id, user_id, expires_at)
email_tokens(id, user_id?, login_id_hash, purpose[verify|reset], token_hash, expires_at, used_at)
terms(id, name, is_active)
courses(id, instructor_id, term_id, code, name, description, archived_at)
course_roster(course_id, student_no_hash, student_no_enc, user_id NULL, added_at)
   -- numara, öğrenci kayıt olmadan önce de durur; kayıt olunca user_id bağlanır
posts(id, course_id, type[announcement|material], title, body_md, links jsonb, publish_at, status)
assignments(id, course_id, title, body_md, links jsonb, submission_type[link|none],
            allow_any_link, due_at NULL, late_allowed, late_until NULL,
            late_penalty_type[none|points|percent], late_penalty_value,
            max_score NULL, publish_at, status)
submissions(id, assignment_id, student_id, url, submitted_at, is_late,
            score NULL, feedback, score_published_at)
submission_history(id, submission_id, url, submitted_at)
notifications(id, user_id, type, payload jsonb, read_at, created_at)
audit_logs(id, actor_id, action, target, created_at)
```

## 9. Teknik mimari (karar verildi)

| Katman | Seçim | Neden |
|---|---|---|
| Uygulama | **Next.js 15 (App Router) + TypeScript** | Tek repo içinde UI ve API (server actions / route handlers) |
| UI | **Tailwind CSS + shadcn/ui** | Hızlı, erişilebilir, tutarlı bileşenler |
| Veritabanı | **PostgreSQL 16** | İlişkisel veri, jsonb |
| ORM | **Drizzle ORM** | Tip güvenli, SQL'e yakın, migration'lar net |
| Auth | **Kendi oturum katmanı** (DB session + httpOnly cookie) + **Arctic** (Google/Apple OAuth) + **argon2id** | Kimlik numara/mail şifreli saklandığı için hazır auth kütüphanelerinin "düz email" varsayımı uymuyor; Lucia rehberindeki kanıtlanmış desen |
| Doğrulama | **Zod** | Form ve API girdileri |
| Bot koruması | **Cloudflare Turnstile** + DB tabanlı rate limit | Ücretsiz, KVKK açısından reCAPTCHA'dan daha hafif, çoğu kullanıcıda bulmaca çıkmaz |
| Mail | **Resend** (alternatif SES) | Basit API, SPF/DKIM kurulumu kolay |
| Zamanlanmış işler | Uygulama içi cron endpoint'i + Coolify scheduled task | "24 saat kaldı" bildirimi, zamanlı yayın |
| Deploy | **Docker → Coolify** (Postgres de Coolify'da) | Mevcut altyapınız |
| Test | Vitest (birim) + Playwright (uçtan uca kritik akışlar) | |

**Domain önerisi:** Platform genel amaçlı ve çok okullu olacağı için **okul adı içermeyen kök domain** kullanılmalı (örn. `kodbox.com.tr`).
Okul seçimi mail domain'inden yapıldığı için okul bazında subdomain'e gerek yok. Domain sadece env değişkeninden okunur, karar sonradan değiştirilebilir.

**Apple ile giriş notu:** Ücretli Apple Developer hesabı (yıllık $99) ve doğrulanmış domain gerektirir.
Hesap hazır olana kadar buton feature-flag ile kapalı tutulur, Google ile giriş ilk sürümde çalışır.

## 10. Kabul edilen riskler
1. Drive dosyası teslimden sonra değiştirilebilir. Risk kabul edildi. Teslim zamanı ve geçmişi kayıt altında tutulur.
2. Paylaşım izni unutulabilir. Teslim kartındaki rehberle azaltılır.
3. `ogr.mku.edu.tr` mail teslimi canlı ortamda gerçek adresle test edilecek.

## 11. Geliştirme fazları (agent iş paketleri)
| Faz | Kapsam | Bağımlılık |
|---|---|---|
| **F0 Altyapı** | Repo iskeleti, Next.js, Tailwind/shadcn, Drizzle + şema + migration, şifreleme/blind-index yardımcıları, Docker, seed (admin + MKÜ okulu) | — |
| **F1 Kimlik** | Kayıt (mail doğrulama), giriş, oturum, şifre sıfırlama, Google/Apple bağlama ve giriş, ilk girişte şifre değiştirme, rol bazlı yetki middleware'i | F0 |
| **F2 Admin** | Eğitmen CRUD, okul/dönem yönetimi, öğrenci arama (maskeli), audit log | F1 |
| **F3 Eğitmen – ders** | Ders CRUD, öğrenci ekleme (tekli/toplu/CSV), arşivleme, duyuru & materyal | F1 |
| **F4 Ödev & teslim** | Ödev CRUD + tüm ayarlar, öğrenci teslim kartı, teslim geçmişi, teslimler tablosu, puan/geri bildirim, CSV export | F3 |
| **F5 Öğrenci paneli** | Panel, yaklaşan teslimler, ders sayfası | F3, F4 |
| **F6 Bildirimler & zamanlama** | Bildirim modeli + zil UI, olay tetikleyicileri, cron (24 saat kala, zamanlı yayın) | F4 |
| **F7 Cila & yayın** | KVKK metni, boş durumlar, mobil uyum, Playwright testleri, Coolify deploy | Hepsi |

F2 ve F3 paralel yürütülebilir. F5 ve F6 da paralel yürütülebilir.

## 12. Kararlaştırılanlar (son)
- Öğrenci no formatı: esnek regex (`^\d{6,12}$`), admin panelinden değiştirilebilir.
- Giriş herkes için okul maili + şifre. Öğrenci/Personel sekmesi ve sabit domain eki kullanılır. Ayrıca numara veya kullanıcı adı yok.
- Giriş, kayıt ve sıfırlama formlarında Turnstile + rate limit uygulanır.
