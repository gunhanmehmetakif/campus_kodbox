# Kodbox — Tasarım Sistemi

Tüm arayüz bu dosyaya uyar. Renk ve font değerleri sadece buradaki token'lardan türetilir. Kod içine rastgele hex yazılmaz.

## Konu ve ton
Üniversite öğrencisi ve eğitmenlerinin her gün açtığı bir **iş aracı**.
Tek iş: "Ne zaman neyi teslim etmem / kontrol etmem gerekiyor?" sorusunu bir bakışta cevaplamak.
Ton sakin, net ve akademik. Süsleme yok, bilgi hiyerarşisi var.

## Renk token'ları (`src/app/globals.css` içinde CSS değişkeni + Tailwind `@theme`)
| Token | Light | Dark | Kullanım |
|---|---|---|---|
| `--ink` | `#13203A` | `#E6EAF2` | Ana metin, başlıklar |
| `--ink-soft` | `#4A5872` | `#A3AEC2` | İkincil metin |
| `--paper` | `#F4F6F9` | `#0E1525` | Sayfa zemini (soğuk, kâğıt-gri; krem DEĞİL) |
| `--surface` | `#FFFFFF` | `#151E31` | Kartlar, paneller |
| `--line` | `#DDE2EA` | `#26324A` | Kenarlıklar, ayraçlar |
| `--laurel` | `#1E6B57` | `#4FB394` | **Birincil eylem** (Defne yeşili; butonlar, aktif sekme, link) |
| `--laurel-tint` | `#E3F1EC` | `#16352E` | Birincil vurgunun zemini |
| `--saffron` | `#C98512` | `#E8B04B` | **Yaklaşan son tarih** (≤ 48 saat) |
| `--saffron-tint` | `#FBF0DC` | `#3A2C12` | |
| `--brick` | `#B83A28` | `#E5735F` | Gecikmiş / hata / yıkıcı eylem |
| `--brick-tint` | `#F8E4E0` | `#3B1B16` | |
| `--sky` | `#2D5BB8` | `#7EA2E8` | Bilgi, "teslim edildi" durumu |

Karanlık mod: `prefers-color-scheme` + manuel tema anahtarı (`data-theme` attr, kullanıcı menüsünde). `body` arka planı her zaman `--paper`.

## Tipografi (`next/font/google`, `latin-ext` subset şart; Türkçe karakterler: ğ ş ı İ ö ü ç)
- **Display:** `Schibsted Grotesk` (600/700). Sayfa başlıkları, ders adları ve büyük sayaç rakamlarında kullanılır. Ölçülü kullanılır.
- **Gövde:** `Instrument Sans` (400/500/600). Metin, form, buton.
- **Veri:** `JetBrains Mono` (400/500). Öğrenci numaraları, ders kodları, tarih/saat, sayaçlar. `font-variant-numeric: tabular-nums`.
- Ölçek: 12 / 13 / 14 (gövde) / 16 / 20 / 24 / 32 / 44. Satır yüksekliği gövdede 1.55, başlıkta 1.15. Başlıklarda letter-spacing -0.01em.
- Ders kodu her yerde mono, küçük harf aralıklı, rozet içinde gösterilir: `BİL101`.

## İmza öğesi: **Teslim Şeridi** (deadline ribbon)
Uygulamanın akılda kalan tek öğesi. Her ödev kartında ve ödev detayında bulunan ince yatay bir zaman çizgisidir:
```
yayın ●━━━━━━━━━━━━━━━━━━━│▲ şimdi━━━━━━━━━━━━━━━━━○ son tarih ┄┄┄┄┄┄┄○ son kabul (geç)
```
- Dolu kısım geçen süreyi gösterir. Renk durumdan türetilir: normalde `--laurel`, son 48 saatte `--saffron`, son tarih geçtiyse `--brick`, teslim edildiyse `--sky` + ✓.
- Geç teslim penceresi kesikli çizgiyle gösterilir.
- Altında mono rakamlarla kalan süre: `2g 04s 13dk`. Bir dakikadan az kaldığında saniye de gösterilir.
- Süresiz ödevlerde şerit gösterilmez, yerine "Süresiz" rozeti çıkar.
- Öğrenci panelindeki **"Yaklaşan teslimler"** bölümü bu şeritleri alt alta, ortak bir zaman ekseninde (bugün → +14 gün) gösterir.
  Böylece öğrenci tüm derslerin yükünü tek bakışta görür. Sayfanın ana bölümü budur.
- Bileşen: `src/components/deadline-ribbon.tsx` (client; sayaç her saniye değil, dakikada bir güncellenir; son 1 saatte saniyede bir).
- `prefers-reduced-motion` açıksa animasyon kapanır.

Geri kalan her şey sessizdir: bol beyaz alan, 1px `--line` kenarlıklar, 10px köşe yarıçapı (kartlar), 8px (input/buton), gölge sadece açılır menü ve modallarda.

## Düzen
- **Uygulama kabuğu:** solda 248px sabit kenar çubuğu bulunur:
  - üstte logo (`kodbox` metin logosu, display font, "k" harfi laurel),
  - altında rol bazlı menü,
  - en altta kullanıcı (mail maskeli) ve tema anahtarı.
  Üst barda breadcrumb ve 🔔 bildirim zili yer alır. Mobilde kenar çubuğu sheet/drawer olur.
- **İçerik genişliği:** max 1120px, 24px gutter (mobilde 16px).
- **Ders sayfası:** başlık bandında mono ders kodu rozeti, ders adı (display 32) ve dönem; altında sekmeler.
- **Auth ekranları:** iki sütun düzeni.
  - Sol: ürün paneli. `--ink` zeminde ince bir **mozaik tesserası deseni** (Hatay mozaiklerine gönderme; saf CSS grid, düşük opaklık, kare taşlar), üzerinde tek cümle: "Derslerin, ödevlerin, teslimlerin — tek yerde."
  - Sağ: form.
  - Mobilde sol panel gizlenir.

## Bileşen kuralları
- shadcn/ui tabanı (`src/components/ui`), token'lara bağlanmış.
- Her form alanının görünür bir etiketi olur. Placeholder etiket yerine kullanılmaz.
- Hata mesajı alanın altında `--brick` renginde, ne olduğunu ve nasıl düzeltileceğini söyler.
- Odak halkası 2px `--laurel`, 2px offset. Klavyeyle her şey erişilebilir.
- Boş durumlar eyleme çağırır: "Henüz ödev yok · **Ödev oluştur**".
- Tarih ve saat her yerde `tr-TR` biçimindedir (`12 Eki 2026, 23:59`). Zaman dilimi `Europe/Istanbul`.
- Toast: `sonner`. Buton metni ile toast metni aynı fiili kullanır ("Yayınla" → "Yayınlandı").

## Metin kuralları
- Tüm arayüz **Türkçe**. Kısa, aktif cümleler. "Submit" yerine "Teslim et", "Kaydet" yerine eylemin kendisi ("Ödevi yayınla").
- Hata mesajları özür dilemez ve belirsiz değildir: "Bu link Google Drive'a ait değil. drive.google.com ile başlayan bir link yapıştır."
- Öğrenciye "sen" diye hitap edilir, eğitmen ve admin ekranlarında nötr dil kullanılır.
