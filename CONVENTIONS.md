# Kodbox — Kod Kuralları (CONVENTIONS)

Bu dosya F1–F7 fazlarında çalışan herkes (insan veya agent) için **bağlayıcıdır**. Amaç: farklı kişilerin
yazdığı kodun tek elden çıkmış gibi tutarlı olması. Önce `PLAN.md` (ürün) ve `DESIGN.md` (görsel dil),
sonra bu dosya okunur. Bir kurala uymayan bir şey yapman gerekirse, kuralı burada güncelle ve nedenini yaz.

---

## 0. Hızlı başlangıç

```bash
npm run db:up && npm run db:migrate && npm run db:seed && npm run db:seed:demo && npm run dev
npm run check        # typecheck + lint + test — commit öncesi YEŞİL olmalı
npm run build        # Cache Components hatalarını sadece build yakalar; büyük değişiklikte çalıştır
```

`/_tasarim` (sadece dev) tüm token'ları, bileşenleri ve Teslim Şeridi durumlarını gösterir. Yeni ortak
bileşen eklediğinde oraya da örneğini ekle.

---

## 1. Next.js 16.4 — eğitim verinden farklı olanlar

`node_modules/next/dist/docs/` güncel dokümandır; şüphede oku.

| Konu | Bu projede |
|---|---|
| Middleware | **`src/proxy.ts`** (`export function proxy`). Sadece iyimser kontrol + başlık. |
| `cookies()`, `headers()`, `params`, `searchParams` | Hepsi **async** (`await`). |
| Cache Components (`cacheComponents: true`) | Veri erişimi varsayılan **dinamik**. Request-time veri (oturum, DB, `params`) okuyan her şey bir `<Suspense>` veya `loading.tsx` **altında** olmalı; yoksa build hatası. |
| Instant navigation doğrulaması | Dev'de ekranın altında "Insight" çıkarsa: o rotaya gezinme bloklanıyor demektir. Çözüm: o klasöre `loading.tsx` ekle veya veriyi `<Suspense>` içine al. **Her `page.tsx` klasöründe `loading.tsx` bulunur** (`PageSkeleton`). |
| `Date.now()` / `new Date()` render'da | Prerender'da build hatası + `react-hooks/purity` lint hatası. Sunucuda **`const now = await getRequestNow()`** (`@/lib/server/now`) kullan. Server Action ve Route Handler içinde `new Date()` serbesttir. |
| Tipler | `PageProps<"/egitmen/dersler/[id]">`, `LayoutProps<…>` globaldir; `npm run typecheck` önce `next typegen` çalıştırır. |
| `_` ile başlayan URL | `_klasor` özel (private) klasördür; URL'de `_` gerekirse klasör adı `%5F…` (bkz. `src/app/%5Ftasarim`). |
| Redirect | `redirect()` Suspense içinde çağrılırsa HTTP 200 + istemci yönlendirmesi (meta refresh) olarak akar; içerik sızmaz. Normaldir. |
| `"use cache"` | Şimdilik **kullanılmıyor**. Kullanacaksan: içinde `cookies()` okunamaz; build sırasında DB'ye bağlanmaya çalışabilir (Docker build'de DB yok!). Kişisel veriyi cache anahtarına koyma. |

---

## 2. Klasör ve rota yapısı

```
src/app/(auth)/…          misafir ekranları, AuthLayout (iki sütun + mozaik). Formlar: components/auth/*
src/app/(app)/layout.tsx  oturum zorunlu kabuk (AppShell). Burada requireUser() var.
src/app/(app)/ogrenci/…   öğrenci  → layout: <RoleGate role="student">
src/app/(app)/egitmen/…   eğitmen  → layout: <RoleGate role="instructor">
src/app/(app)/admin/…     admin    → layout: <RoleGate role="admin">
src/app/(app)/hesap, bildirimler   tüm roller
src/app/route.ts          "/" → role göre yönlendirme
```

**Planlanan rota adları** (Türkçe, küçük harf, ASCII): `/egitmen/dersler/[courseId]`,
`/egitmen/dersler/[courseId]/odevler/[assignmentId]`, `/egitmen/dersler/[courseId]/ogrenciler`,
`/ogrenci/dersler/[courseId]`, `/ogrenci/odevler/[assignmentId]`, `/admin/egitmenler/[userId]` …
Yeni statik segment eklersen `components/app-shell/nav.ts` → `SEGMENT_LABELS`'a etiketini ekle; menüye
girecekse `NAV`'a ekle. Rota string'lerini tekrar tekrar yazma; ortak olanları `src/lib/routes.ts`'e ekle.

**Dosya yerleşimi**
- Rotaya özel bileşen/action: rotanın klasöründe (`page.tsx` yanında `actions.ts`, `course-form.tsx`).
- 2+ yerde kullanılan bileşen: `src/components/` (alan adıyla alt klasör açabilirsin: `components/course/…`).
- Sunucu veri erişimi (sorgular): `src/lib/server/<alan>.ts` (örn. `courses.ts`) — `import "server-only"` ile.
- Saf yardımcılar (istemci+sunucu): `src/lib/*.ts`. **`src/lib/server/*` asla istemci bileşenine import edilmez.**
- Hook'lar: `src/hooks/`.

**Yeni sayfa şablonu**

```tsx
// src/app/(app)/egitmen/dersler/[courseId]/page.tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/server/auth";
import { getCourseForInstructor } from "@/lib/server/courses";

export const metadata: Metadata = { title: "Ders" };

export default async function CoursePage({ params }: PageProps<"/egitmen/dersler/[courseId]">) {
  const user = await requireRole("instructor");          // 1) HER sayfada yetki
  const { courseId } = await params;
  const course = await getCourseForInstructor(user.id, courseId);  // 2) sahiplik sorguda
  if (!course) notFound();                               // 3) başkasının dersi = yok
  return <PageHeader title={course.name} … />;
}
```
+ aynı klasöre `loading.tsx` (`export default function Loading() { return <PageSkeleton />; }`).
Dinamik segmentin breadcrumb etiketi için sayfada `<BreadcrumbLabel segment={courseId} label={course.code} />`.

---

## 3. Yetkilendirme (en önemli bölüm)

`src/lib/server/auth.ts`:

| Fonksiyon | Ne yapar |
|---|---|
| `getCurrentUser()` | Oturumdaki aktif kullanıcı veya `null`. İstek başına tek sorgu (React `cache`). Email/öğrenci no **çözülmüş** gelir. |
| `requireUser(opts?)` | Oturum yoksa `/giris?next=…`'e; `mustChangePassword` ise `/sifre-degistir`'e yönlendirir. |
| `requireRole(role \| role[])` | + rol uymazsa kullanıcının kendi paneline yönlendirir. |
| `redirectIfSignedIn()` | Giriş/kayıt sayfalarında: oturum varsa panele gönderir. |

**Kurallar**
1. **Her** `page.tsx`, **her** Server Action ve **her** Route Handler ilk iş `requireRole`/`requireUser` çağırır.
   Layout'taki `RoleGate` yeterli DEĞİL (layout'lar istemci gezinmesinde yeniden çalışmaz; action'lar
   layout'tan geçmez). Proxy sadece çerez varlığına bakar.
2. **Sahiplik sorgunun içinde**: eğitmen sadece `courses.instructor_id = user.id` olan dersleri; öğrenci sadece
   `course_roster.user_id = user.id` olan dersleri görür. İstemciden gelen `courseId`'ye asla tek başına güvenme.
   Bulunamazsa/başkasınınsa `notFound()` (403 değil — varlık sızdırma).
3. Arşivlenmiş derste (`archived_at` dolu) yazma action'ları reddedilir.
4. Admin öğrenci numarasını **maskeli** görür (`maskStudentNo`); eğitmen kendi dersindekileri tam görür.
5. Kritik işlemlerde `audit(...)` çağır (bkz. §8).

---

## 4. Server Action kalıbı

Dönüş tipi her zaman `ActionState` (`src/lib/action-state.ts`):
`{ ok: true, message?, data? }` | `{ ok: false, error?, fieldErrors?, values? }` | `null` (başlangıç).

```ts
// src/app/(app)/egitmen/dersler/actions.ts
"use server";

import { refresh } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { courses } from "@/db/schema";
import { fail, ok, parseForm, type ActionState } from "@/lib/action-state";
import { audit } from "@/lib/server/audit";
import { requireRole } from "@/lib/server/auth";

const schema = z.object({
  code: z.string().trim().min(3, "Ders kodu en az 3 karakter olmalı. Örn. BİL101 yaz.").max(16),
  name: z.string().trim().min(2, "Ders adını yaz."),
  termId: z.uuid("Dönem seç."),
});

export async function createCourseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole("instructor");                 // 1) yetki
  const parsed = parseForm(schema, formData);                    // 2) doğrulama
  if (!parsed.ok) return parsed.result;                          //    → fieldErrors + values
  const { code, name, termId } = parsed.data;

  try {
    const [course] = await db.insert(courses)
      .values({ instructorId: user.id, termId, code: code.toLocaleUpperCase("tr-TR"), name })
      .returning({ id: courses.id });
    await audit(user.id, "course.create", { type: "course", id: course!.id });
  } catch (e) {
    if (isUniqueViolation(e)) return fail(undefined, { code: ["Bu dönemde aynı kodlu bir dersin var."] }, { code, name, termId });
    throw e;                                                     // beklenmeyen → error.tsx
  }
  refresh();                                                     // 3) ekranı tazele (veya revalidatePath)
  return ok("Ders oluşturuldu.");                                // 4) buton fiiliyle aynı fiil
}
```

İstemci:

```tsx
"use client";
const [state, action] = useActionState(createCourseAction, initialActionState);
useEffect(() => { if (state?.ok && state.message) toast.success(state.message); }, [state]);

<form action={action} className="flex flex-col gap-4" noValidate>
  {state && !state.ok && state.error ? <FormMessage>{state.error}</FormMessage> : null}
  <FormField id="code" label="Ders kodu" error={state?.ok === false ? state.fieldErrors?.code : undefined}>
    <Input name="code" defaultValue={state?.ok === false ? state.values?.code : undefined} />
  </FormField>
  <SubmitButton pendingText="Oluşturuluyor…">Dersi oluştur</SubmitButton>
</form>
```

Notlar
- React 19 form action'ından sonra **form sıfırlanır**; hata durumunda alanları `values` ile geri doldur
  (şifre/token alanları `values`'a otomatik girmez).
- Hata mesajı: ne yanlış + nasıl düzeltilir, özür yok (DESIGN.md · Metin kuralları).
- Beklenen hatalar `fail(...)`; beklenmeyenler throw (kullanıcıya genel hata ekranı).
- Yönlendirme gerekiyorsa `redirect()` action içinde çağrılabilir (try/catch DIŞINDA).
- Postgres unique hata kodu `23505`; yardımcı yazacaksan `src/lib/server/db-errors.ts` olarak ekle.
- Paylaşılan action'lar: `src/lib/actions/` (çıkış: `signOutAction`, tema: `updateThemePreference`).
- Auth formları (`components/auth/*-form.tsx`) `action` prop'u bekler; F1 action yazıp sayfaya geçirir.
  Alan adları her formun başındaki yorumda listelidir.

---

## 5. Şifreli alanlar ve kişisel veri (KVKK)

`src/lib/server/crypto.ts`:

| Ne | Nasıl |
|---|---|
| Yazma | `emailEnc: encrypt(email)`, `emailHash: blindIndex(email)`; öğrenci için `studentNoEnc: encrypt(no)`, `studentNoHash: blindIndex(no)` |
| Arama | **Her zaman hash ile:** `where(eq(users.emailHash, blindIndex(email)))`. `*_enc` sütununda arama/sıralama YAPILAMAZ. |
| Okuma | `decrypt(row.emailEnc)` / `decryptNullable(row.studentNoEnc)`. `getCurrentUser()` zaten çözer. |
| Gösterme | Admin: `maskStudentNo` / `maskEmail`. Maskeleme **sunucuda** yapılır; istemciye tam değer gönderilmez. |
| Öğrenci maili | Saklanan ama türetilebilir: `studentEmail(no, school)` (`src/lib/identity.ts`). |
| Kimlik normalize | Kullanıcı girdisi önce `normalizeLocalPart` / `normalizeStudentNo` / `buildEmail` ile normalize edilir, sonra hash'lenir. |

Kesin yasaklar
- Düz mail/numara: log'a (`console.*`), `audit_logs.metadata`'ya, `notifications.payload`'a, rate limit
  anahtarına, URL'e, cache anahtarına **yazılmaz**. Gerekirse hash veya maskeli değer.
- Öğrencinin adı-soyadı hiçbir yerde tutulmaz/istenmez.
- Sıralama numaraya göre gerekiyorsa: satırları çöz, bellekte sırala (ders listeleri küçüktür).

Anahtar rotasyonu (ileride): `crypto.ts`'te keyring'e `v2` eklenir, `CURRENT_KEY_VERSION="v2"`; eski `v1`
değerleri okunmaya devam eder, bir betikle yeniden şifrelenir. `BLIND_INDEX_KEY` değişirse tüm `*_hash`
sütunları yeniden hesaplanmalıdır.

---

## 6. Veritabanı

- Şema: `src/db/schema.ts` (PLAN §8'in tamamı + gerekli ek alanlar). **Mevcut migration dosyaları düzenlenmez.**
  Zorunlu değişiklikte: şemayı düzenle → `npm run db:generate -- --name <kisa_ad>` → `npm run db:migrate` →
  migration'ı commit'le ve bu dosyaya not düş.
- İstemci: `import { db } from "@/db"` (sadece sunucu). Transaction: `db.transaction(async (tx) => …)`;
  `audit`/`notify` gibi yardımcılar son parametre olarak `tx` alır → aynı commit'e girer.
- Tüm zamanlar `timestamptz`, UTC. PK'ler uuid.
- Drizzle sorgu API'si (`db.query.courses.findMany({ with: … })`) için ilişkiler şemada tanımlı.

**Alan anlamları**
- `posts.status` / `assignments.status`: `draft` | `published`. Öğrencinin görmesi için
  `status = 'published' AND publish_at <= now()`. `publish_at > now()` = **zamanlanmış**. Yayınlanmışsa
  `publish_at` zorunlu (DB check).
- `notified_at`: yayın bildirimi gönderildi mi (F6 cron'u tekrar göndermesin). Hemen yayınlarken action
  bildirimi gönderip `notified_at = now()` yazar; zamanlanmışları cron yapar.
- `assignments.due_reminder_sent_at`: "24 saat kaldı" bildirimi; **son tarih değişince `null`'lanır**.
- Ödev: `due_at null` = süresiz. `late_allowed` + `late_until null` = süresiz geç teslim.
  `late_penalty_type` `none|points|percent` ↔ `late_penalty_value` (check'lerle tutarlı). `max_score null` =
  puanlama kapalı. `submission_type = 'none'` = teslim gerektirmez. `allow_any_link=false` → sadece
  Drive/Docs (`isGoogleDriveLink`, `src/lib/links.ts`).
- `submissions`: öğrenci+ödev başına tek satır (güncel teslim). Her teslim/güncellemede
  `submission_history`'ye satır eklenir. `is_late` teslim anında hesaplanır (`submitted_at > due_at`).
  Puan öğrenciye `score_published_at` dolunca görünür. Ceza otomatik uygulanmaz; öneri hesaplanır.
- `course_roster`: numara (hash+enc) öğrenci kayıt olmadan durur; öğrenci kaydolunca (F1)
  `student_no_hash` eşleşen satırların `user_id`'si doldurulur. "Henüz kayıt olmadı" = `user_id IS NULL`.
- `email_tokens`: token'ın kendisi sadece mail linkinde; DB'de `sha256Hex(token)`. Doğrulama 24 sa,
  sıfırlama 1 sa; tek kullanım (`used_at`).
- `users.status`: `pending | active | disabled`. Sadece `active` oturum açabilir (`getCurrentUser`).
  Devre dışı bırakınca `invalidateAllUserSessions(userId)`.
- `terms`: okul başına en fazla bir `is_active` (kısmi unique index).

---

## 7. Tarih ve saat

Her şey `src/lib/dates.ts` üzerinden; **`toLocaleString`/`date-fns format` doğrudan kullanılmaz**.

| İhtiyaç | Kullan |
|---|---|
| Mutlak tarih göstermek | `<DateTime value={d} />` → `12 Eki 2026, 23:59` (mono). `format="date" \| "time" \| "short" \| "day" \| "long"` |
| Göreli | `<RelativeTime value={d} serverNow={now} />` (dakikada bir güncellenir) |
| Son tarih görselleştirme | `<DeadlineRibbon … serverNow={now} />` (§9) |
| "Şimdi" (sunucu) | `const now = await getRequestNow()` |
| Form: tarih+saat | `<DateTimePicker name="dueAt" defaultValue={…} />` → forma `"2026-10-12T23:59"` (İstanbul) gider; sunucuda `parseDateTimeLocal(formData.get("dueAt"))` → UTC `Date` |
| Saf string | `formatDateTime`, `formatRelative`, `formatCountdown`, `formatDurationLong` |

Zaman dilimi her zaman `Europe/Istanbul`, dil `tr-TR`. Sunucu UTC çalışır; çıktı yine doğrudur.

---

## 8. Güvenlik yardımcıları

| Modül | Kullanım |
|---|---|
| `password.ts` | `hashPassword`, `verifyPassword`, kullanıcı yoksa zamanlama eşitlemek için `verifyPasswordDummy`. Politika: `passwordSchema` / `newPasswordSchema` (`@/lib/password-policy`, istemcide de kullanılır). |
| `session.ts` | `createSession(userId)` (girişte; çerez yazar → sadece action/route handler), `invalidateSession()`, `invalidateAllUserSessions(userId, exceptSessionId?)` (şifre değişince), `listUserSessions`, `purgeExpiredSessions` (cron). |
| `rate-limit.ts` | `consume(rateLimitKey("register-ip", ip), RATE_LIMITS.authRequestPerIp)` → `{ ok, retryAfter }`; `peek` (saymadan), `resetRateLimit` (başarılı girişte). Mesaj: `formatRetryAfter(retryAfter)`. Anahtarda kişisel veri yok → hash kullan. |
| `turnstile.ts` | Formda `<TurnstileWidget siteKey={getTurnstileSiteKey()} resetKey={state} />`; action'da `verifyTurnstile(formData.get(TURNSTILE_FIELD), await getClientIp())`. |
| `mail.ts` | `sendMail({ to, ...verifyEmailTemplate({ link: absoluteUrl(routes.verifyEmail(token)) }) })`. Şablonlar: `verifyEmailTemplate`, `resetPasswordTemplate({ audience })`, `accountExistsTemplate`. Sistem SADECE kimlik maili gönderir. |
| `notifications.ts` | `notify(userIds, "post.published", payload, tx?)`. Tür + payload tipleri `NotificationPayloads`'ta; yeni tür eklersen orada tanımla. Zil sayacı: `getUnreadNotificationCount`. |
| `audit.ts` | `audit(actorId, "instructor.create", { type: "user", id }, { … }, tx?)`. Eylem adları `AuditAction` birleşiminde. |
| `request.ts` | `getClientIp()`, `getUserAgent()` |
| `env.ts` | `env.X` (lazy, Zod doğrulamalı). `process.env` doğrudan okunmaz. İstemciye gereken değer prop olarak geçirilir (NEXT_PUBLIC kullanılmaz). Yeni değişken: şemaya + `.env.example`'a ekle. |

Hesap varlığını sızdırmama: kayıt ve şifre sıfırlamada ekranda **her zaman aynı mesaj**; fark sadece mailde.

---

## 9. UI ve tasarım sistemi

**Token'lar** (`src/app/globals.css`; DESIGN.md'nin birebir karşılığı). Bileşende hex/rgb YAZILMAZ.
- Renk: `bg-paper` (sayfa), `bg-surface` (kart), `border-line`, `text-ink`, `text-ink-soft`, `bg-laurel`/`text-laurel`
  (birincil), `bg-laurel-tint`, `saffron` (≤48 sa; küçük metinde **`text-saffron-ink`**), `brick` (gecikmiş/hata/yıkıcı),
  `sky` (bilgi/teslim edildi), `*-tint` zeminler. shadcn semantikleri (`primary`, `muted`, `destructive`…) bu
  token'lara bağlı.
- Tipografi ölçeği (Tailwind varsayılanı KALDIRILDI): `text-xs` 12 · `text-label` 13 · `text-sm` 14 (gövde) ·
  `text-base` 16 · `text-lg` 20 · `text-xl` 24 · `text-2xl` 32 · `text-3xl` 44. Başlıklar `font-display`
  (h1–h4 otomatik). Öğrenci no, ders kodu, tarih, sayaç: `font-mono` (tabular).
- Köşe: input/buton `rounded-lg` (8px), kart `rounded-xl` (10px). Gölge sadece menü/modal/toast.
- Odak: 2px laurel, 2px offset (global). Kendi odak stilini yazma.
- Düzen: içerik `max-w-content` (1120px) — AppShell zaten sarar. Kenar çubuğu `w-sidebar`.
- Karanlık mod: `dark:` varyantı hem sistem tercihini hem `data-theme`'i izler; token'lar kendiliğinden döner,
  genelde `dark:` yazmana gerek yok.

**Bileşen envanteri** (`src/components/`)

| Bileşen | Ne zaman |
|---|---|
| `ui/*` | shadcn (button, input, textarea, select, checkbox, switch, tabs, dialog, alert-dialog, dropdown-menu, sheet, popover, tooltip, badge, card, table, separator, skeleton, avatar, calendar, sonner). Button varyantları: `default`, `outline`, `secondary`, `ghost`, `destructive`, `destructive-soft`, `link`. Badge tonları: `laurel`, `saffron`, `brick`, `sky`, `neutral`. Tabs: `variant="line"` sayfa sekmeleri, varsayılan segmentli seçim. |
| `page-header` | Her sayfanın başı. Ders sayfasında `size="lg"`, `eyebrow={<CourseCodeBadge …/>}`, `meta` (dönem), sekmeler `children`. |
| `course-code-badge` | Ders kodu HER YERDE bununla. |
| `deadline-ribbon` | **İmza öğesi.** Her ödev kartında/detayında. `variant="compact"` listeler; `axis={{start, end}}` öğrenci panelindeki "Yaklaşan teslimler" ortak ekseni (bugün → +14 gün). Durum mantığı saf: `computeDeadline` (`src/lib/deadline.ts`) — sıralama/filtrede de onu kullan. |
| `empty-state` | Boş listeler; mutlaka eylem öner ("Henüz ödev yok" + "Ödev oluştur"). |
| `form-field` / `FormMessage` | Etiket + kontrol + açıklama + hata; tek çocuğa id/aria bağlar. |
| `submit-button` | Form gönderimi (pending durumu). |
| `email-local-input` | Okul maili girişi (domain eki sabit, yapıştırılan maili kırpar, sekme algılar). |
| `password-input` | Göster/gizle. |
| `date-time-picker` | Son tarih / geç kabul / yayın zamanı. |
| `date-time`, `relative-time` | Tarih gösterimi. |
| `markdown` | Kullanıcı Markdown'ı (güvenli; ham HTML yok). |
| `link-list` | Materyal/ödev linkleri (domain ikonlu). |
| `turnstile-widget` | Turnstile. |
| `app-shell/*` | Kabuk (dokunma gerekmez); `BreadcrumbLabel`, `NAV`, `SEGMENT_LABELS`, `PageSkeleton`, `RoleGate`. |
| `auth/*` | `AuthHeader`, `AuthDivider`, auth formları, `OAuthButtons`. |
| `section-placeholder` | F0 iskeleti; gerçek sayfa yazılınca kaldır. |

**Metin**: Tüm arayüz Türkçe. Öğrenciye "sen", eğitmen/admin ekranlarında nötr/"siz". Buton = eylemin kendisi
("Ödevi yayınla"), toast aynı fiil ("Ödev yayınlandı"). Toast: `import { toast } from "sonner"`.
İkonlar: `lucide-react` (v1'de marka ikonları yok; marka logosu gerekirse inline SVG, bkz. `oauth-buttons.tsx`).

**Erişilebilirlik**: her alanın görünür `<Label>`'ı; ikon butonlarda `aria-label`; klavyeyle her şey;
dış linkler `target="_blank" rel="noopener noreferrer"` + `sr-only` "(yeni sekmede açılır)".

---

## 10. Testler

- Vitest. Test dosyası test ettiği modülün **yanında**: `foo.ts` → `foo.test.ts`.
- `server-only` testlerde boş modüle yönlenir; `test/setup.ts` sabit test anahtarlarını ayarlar.
- DB'ye dokunan testler `*.db.test.ts`; `TEST_DATABASE_URL` (varsayılan docker'daki `kodbox_test`) üzerinde
  çalışır, erişilemezse atlanır. Örnek: `src/lib/server/rate-limit.db.test.ts` (migration'ı kendisi uygular).
- Saf mantığı (tarih, durum, doğrulama, hesaplama — ör. geç teslim cezası önerisi) saf fonksiyona çıkar ve
  birim testini yaz. Server Action'ların iş kuralları test edilebilir saf fonksiyonlara dayanmalı.
- Uçtan uca (Playwright) F7'de.

---

## 11. Verilen kararlar (F0)

| Karar | Neden |
|---|---|
| Cache Components + Partial Prefetching **açık** bırakıldı | create-next-app 16.4 varsayılanı ve Next'in bir sonraki ana sürümde zorunlu yapacağı model. Sonucu: oturum okuyan her şey Suspense/loading.tsx altında. |
| Oturum kabuğu `(app)/layout.tsx` içinde `<Suspense>` ile; rol kapısı `RoleGate` | Statik iskelet anında görünür; gezinmeler bloklanmaz. |
| `/` bir Route Handler | Sadece yönlendirme yapan bir sayfa statik kabuk gerektirmesin, gerçek HTTP 307 dönsün. |
| shadcn tabanı **Radix** (`radix-nova`); `cn` kendi `src/lib/utils.ts`'imiz | shadcn CLI `cn` paketini getiriyordu; özel tipografi ölçeğimizi bilen `extendTailwindMerge` gerekli. `npx shadcn add …` sonrası bileşendeki `from "cn"` importunu `from "@/lib/utils"` yap ve renkleri token'lara bağla. |
| Tema: kendi küçük store'umuz (`use-theme`) + `<head>` betiği | next-themes React 19'da script uyarısı veriyor; DESIGN `data-theme` istiyor. Tercih localStorage + `users.theme`. |
| CSP statik, `script-src 'unsafe-inline'` | Nonce tabanlı CSP her sayfayı dinamik yapıp statik kabuğu bozar. Diğer başlıklar (frame-ancestors, HSTS…) tam. |
| Canlıda çerez adı `__Host-kodbox_session` | Alt domain çerez enjeksiyonuna karşı. Yerel `npm start` (http) ile oturum tutulmaz; dev kullan. |
| `SESSION_SECRET` oturum için değil, `sign/unsign` (OAuth state çerezi vb.) için | Oturumlar DB'de rastgele token; imza gerekmez. |
| Rate limit: satır kilitli `SELECT … FOR UPDATE` + saf `decideRateLimit` | Eşzamanlılıkta doğru (DB testiyle doğrulandı), algoritma birim testli. Sabit pencere: 5 hatalı giriş → pencere sonuna kadar (≤15 dk) kilit. |
| Env lazy doğrulama | `next build` gizli anahtarlar olmadan derlenebilsin (Docker). |
| Betikler `@next/env` ile env yükler; seed `tsx --conditions=react-server` | Next ile aynı .env öncelikleri; `server-only` importları betiklerde çalışsın. |
| Tipografi `text-label` (13px) eklendi, Tailwind varsayılan ölçeği kaldırıldı | DESIGN ölçeği dışına çıkılmasın. |
| Türetilmiş token'lar: `--saffron-ink`, `--line-strong`, `--surface-sunken`, `--sky-tint`, `--on-accent`, `--scrim`, `--tessera-*` | Kontrast (saffron metin ≈3:1 → ≈5:1) ve auth panelinin her temada koyu olması için. Hepsi globals.css'te. |
| Mail şablonlarında sabit hex | Mail istemcileri CSS değişkeni desteklemez; tek istisna (`mail-templates.ts`). |
| `output: "standalone"` eklenmedi | Windows'ta symlink sorunları; Docker/Coolify yapılandırması F7'de. |
| Okul adı seed'de "Hatay Mustafa Kemal Üniversitesi" | Resmi ad. Admin panelinden (F2) değiştirilebilir. |

## 12. Commit öncesi kontrol listesi

- [ ] `npm run check` yeşil; büyük değişiklikte `npm run build` de yeşil
- [ ] Yeni sayfada `requireRole` + `loading.tsx`; yeni action'da `requireRole` + Zod + `ActionState`
- [ ] Kişisel veri log/URL/payload/metadata'ya yazılmadı; arama hash ile
- [ ] Renk/font sadece token'lardan; metinler Türkçe ve DESIGN kurallarında
- [ ] Yeni env değişkeni `.env.example` + `env.ts`'te; yeni ortak bileşen `/_tasarim`'da
- [ ] Şema değiştiyse yeni migration commit'lendi ve §6 güncellendi
