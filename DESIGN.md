# Kodbox Campus · Tasarım

## Yön
Akademik, ciddi ama sıcak, sakin. Üniversite öğrencisine çocuksu gelmez: büyük illüstrasyon, parlak gradient, emoji ağırlığı yok. Sıcak "kağıt" zemin, koyu mürekkep yazı, tek vurgu rengi (derin lacivert/indigo). Başlıklarda serif, gövdede sans.

## İlkeler
1. **Mobil öncelikli**: 375px'te yatay kaydırma yok. Dokunma hedefi en az 44px (`h-11`, `min-h-11`). Öğrenci akışı telefonda 3 dokunuş.
2. **Token ile stil**: renkler yalnız `globals.css` token'larından (`bg-primary`, `text-status-late`). Bileşende hex yok (tek istisna: `viewport.themeColor` ve `manifest`, çünkü CSS değişkeni okuyamazlar).
3. **Durum anlamı yalnız renkle verilmez**: StatusBadge ikon + metin taşır.
4. **Sakin hareket**: yalnız geçiş ve skeleton. Süsleme animasyonu yok.
5. **Tema**: sistem tercihi (`prefers-color-scheme`); `<html data-theme="light|dark">` ile zorlanabilir. `dark:` varyantı aynı kurala bağlıdır.
6. **Her liste sayfasında** `EmptyState` ve `loading.tsx` (`PageSkeleton`).

## Yazı tipleri
| Rol | Font | Token |
|---|---|---|
| Gövde | Inter (latin + latin-ext, Türkçe karakterler) | `font-sans` |
| Başlık | Source Serif 4 (latin + latin-ext) | `font-heading` |
| Mono (numara, kod) | Geist Mono | `font-mono` |

## Renk token'ları (açık / koyu özet)
| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `background` | sıcak kağıt | koyu lacivert-gri | sayfa zemini |
| `card` | neredeyse beyaz | bir ton açık | kartlar |
| `foreground` | mürekkep | sıcak beyaz | metin |
| `muted-foreground` | gri-mavi | açık gri-mavi | ikincil metin |
| `primary` | derin indigo | açık indigo | birincil eylem, linkler |
| `accent` | soluk indigo | koyu indigo | hover/seçili zemin |
| `destructive` | kırmızı | açık kırmızı | silme, hata |
| `border` / `input` | sıcak gri | %11 / %16 beyaz | çizgiler |
| `sidebar*` | kağıttan hafif koyu | kartla uyumlu | yan menü |

### Teslim durumları
| Durum | Token | Etiket |
|---|---|---|
| Teslim edildi | `status-submitted` (yeşil-teal) | Teslim edildi |
| Gecikti | `status-late` (kırmızı) | Gecikti |
| Bekliyor | `status-pending` (amber) | Bekliyor |
| Puanlandı | `status-graded` (indigo) | Puanlandı |

Her durumun `-bg` eşi vardır (`bg-status-late-bg text-status-late`).

## Bileşenler (`src/components/`)
`common/`: EmptyState, PageHeader, StatusBadge, DeadlineCountdown (kalan süre; gecikmede kırmızı; <24 saat amber), Markdown (sanitize edilmiş), PageSkeleton, PlaceholderPage, DashboardSection.
`auth/`: SchoolEmailInput (sabit domain ekli mail kutusu), AudienceEmailField (Öğrenci/Personel sekmesi + kutu), PasswordInput, AuthCard, LoginForm, GoogleButton.
`shell/`: AppShell (üst bar + masaüstü yan menü + mobil alt menü), nav öğeleri rol bazlıdır (`nav-items.ts`).

Canlı örnekler: geliştirmede `/_tasarim`.
