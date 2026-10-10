import type { ReactNode } from "react";

import { LEGAL } from "@/config/app";

/** Single source of the KVKK notice. Mirrors docs/KVKK-aydinlatma.md; update that file first. */

const PLACEHOLDER = "[belirlenecek]";

function val(value: string | null): string {
  return value ?? PLACEHOLDER;
}

export function isLegalDraft(): boolean {
  const { controllerName, address, email, hostingProvider, hostingCountry, effectiveDate } = LEGAL;
  return [controllerName, address, email, hostingProvider, hostingCountry, effectiveDate].some((v) => v === null);
}

export function KvkkDraftBanner() {
  if (!isLegalDraft()) return null;
  return (
    <div
      role="note"
      className="rounded-lg border border-status-pending/30 bg-status-pending-bg px-4 py-3 text-sm text-status-pending"
    >
      Bu metin taslaktır, yayın öncesi veri sorumlusu bilgileri eklenecektir.
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Ul({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-muted-foreground">{children}</ul>;
}

/** Table on wider screens, stacked cards with labelled rows below `sm` (no horizontal scroll at 375px). */
function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <>
      <div className="hidden sm:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium text-muted-foreground first:pl-0">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b align-top last:border-b-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 first:pl-0">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 sm:hidden">
        {rows.map((row, i) => (
          <li key={i} className="rounded-lg border bg-card p-3 text-sm">
            <dl className="space-y-2">
              {row.map((cell, j) => (
                <div key={j}>
                  <dt className="text-xs font-medium text-muted-foreground">{head[j]}</dt>
                  <dd className="break-words">{cell}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function KvkkText() {
  return (
    <div className="space-y-8 text-sm leading-relaxed [&_strong]:font-semibold">
      <p>
        <strong>Son güncelleme:</strong> {val(LEGAL.effectiveDate)}
      </p>

      <p>
        Bu metin, <strong>Kodbox Campus</strong> ders ve ödev platformunu (&quot;Platform&quot;) kullanan öğrenci,
        eğitmen ve yöneticilerin kişisel verilerinin nasıl işlendiğini açıklamak amacıyla, 6698 sayılı Kişisel
        Verilerin Korunması Kanunu&apos;nun (&quot;Kanun&quot;) 10. maddesi uyarınca hazırlanmıştır.
      </p>

      <Section title="1. Veri sorumlusu">
        <p>
          Kişisel verileriniz, veri sorumlusu sıfatıyla <strong>{val(LEGAL.controllerName)}</strong> (&quot;Kodbox&quot;)
          tarafından işlenmektedir.
        </p>
        <Ul>
          <li>Adres: {val(LEGAL.address)}</li>
          <li>E-posta: {val(LEGAL.email)}</li>
          {LEGAL.kep ? <li>KEP adresi: {LEGAL.kep}</li> : null}
        </Ul>
        <p>
          Platform; eğitmenlerin ders açtığı, duyuru ve materyal paylaştığı, ödev verdiği; öğrencilerin ödevlerini
          Google Drive bağlantısıyla teslim ettiği bir hizmettir. Platform dosya saklamaz; teslim edilen dosyalar
          öğrencinin kendi Google Drive hesabında kalır.
        </p>
      </Section>

      <Section title="2. İşlenen kişisel veriler">
        <DataTable
          head={["Kategori", "Veriler", "Kimden"]}
          rows={[
            [
              "Kimlik",
              "Öğrenci numarası. Eğitmen ve yöneticiler için görünen ad ve unvan. Ders listesine eğitmen tarafından eklenmişse öğrencinin adı soyadı",
              "Öğrenci, eğitmen, yönetici",
            ],
            ["İletişim", "Okul e-posta adresi", "Öğrenci, eğitmen, yönetici"],
            [
              "Müşteri işlem / eğitim",
              "Kayıtlı olunan dersler, ödev teslim bağlantıları ve teslim zamanları, teslim geçmişi, puanlar, eğitmen geri bildirimleri, platform içi bildirimler",
              "Öğrenci, eğitmen",
            ],
            [
              "İşlem güvenliği",
              "Şifrenin geri döndürülemez özeti (argon2id), oturum kayıtları ve tarayıcı bilgisi (user-agent), IP adresi, giriş denemesi sayaçları, robot doğrulaması sonucu, yönetici işlemlerine ait denetim kayıtları",
              "Otomatik",
            ],
            [
              "Bağlantılı hesap (isteğe bağlı)",
              "Google hesabı bağlanırsa Google hesap kimliği",
              "Öğrenci, eğitmen",
            ],
            [
              "Cihaz bildirimi (isteğe bağlı)",
              "Bildirimlere izin verilirse tarayıcının bildirim abonelik adresi ve anahtarları",
              "Öğrenci",
            ],
            [
              "Tercih ve onay",
              "Tema tercihi, bu aydınlatma metninin okunduğu tarih",
              "Öğrenci, eğitmen",
            ],
          ]}
        />
        <p>
          Öğrenciden ad soyad <strong>istenmez</strong>. Öğrenci numarası ve e-posta adresi veritabanında
          şifrelenerek (AES-256-GCM) saklanır. Özel nitelikli kişisel veri (sağlık, din, biyometrik vb.)
          işlenmez; ödev açıklamalarına veya teslim bağlantılarına bu tür veri eklenmemesini rica ederiz.
        </p>
      </Section>

      <Section title="3. İşleme amaçları ve hukuki sebepler">
        <DataTable
          head={["Amaç", "Hukuki sebep (Kanun m.5/2)"]}
          rows={[
            [
              "Hesap oluşturma, okul e-postasının doğrulanması, giriş ve şifre sıfırlama",
              "(c) Sözleşmenin kurulması ve ifası için gerekli olması",
            ],
            [
              "Öğrencinin derslere eşleştirilmesi, duyuru, materyal ve ödevlerin sunulması",
              "(c) Sözleşmenin ifası",
            ],
            [
              "Ödev teslimi, teslim zamanının ve geçmişinin kaydı, puanlama ve geri bildirim",
              "(c) Sözleşmenin ifası",
            ],
            ["Platform içi bildirimler ve son teslim hatırlatmaları", "(c) Sözleşmenin ifası"],
            [
              "Telefona/tarayıcıya anlık bildirim (push) gönderilmesi",
              "(c) Sözleşmenin ifası. Yalnızca cihazda izin verildiğinde çalışır, istenildiğinde hesap ayarlarından kapatılabilir.",
            ],
            ["Google hesabıyla giriş", "(c) Sözleşmenin ifası. Yalnızca kullanıcı bağlarsa."],
            [
              "Hesap güvenliği, kötüye kullanım ve otomatik saldırıların önlenmesi (robot doğrulaması, giriş denemesi sınırı, oturum yönetimi)",
              "(f) Temel hak ve özgürlüklere zarar vermemek kaydıyla veri sorumlusunun meşru menfaati",
            ],
            [
              "Yönetici işlemlerinin denetim kaydı",
              "(f) Meşru menfaat. (ç) Hukuki yükümlülük: 5651 sayılı Kanun ve ilgili mevzuat kapsamındaki yükümlülükler",
            ],
            [
              "Yetkili kurum ve kuruluşların bilgi taleplerinin karşılanması, hukuki uyuşmazlıklarda delil",
              "(ç) Hukuki yükümlülük. (e) Bir hakkın tesisi, kullanılması veya korunması",
            ],
          ]}
        />
        <p>
          Platformda açık rızaya dayanan bir işleme faaliyeti yoktur. Bu metnin okunduğunun işaretlenmesi
          bilgilendirildiğinizi gösterir, açık rıza anlamına gelmez.
        </p>
      </Section>

      <Section title="4. Toplama yöntemi">
        <p>Kişisel verileriniz:</p>
        <Ul>
          <li>kayıt, giriş, ödev teslimi ve hesap formlarına girdiğiniz bilgilerden,</li>
          <li>
            eğitmeninizin ders listesine eklediği öğrenci numarası (ve varsa ad soyad) bilgisinden,
          </li>
          <li>
            Platformu kullanırken sunucularımızca otomatik olarak oluşturulan kayıtlardan (oturum, güvenlik ve
            işlem kayıtları),
          </li>
        </Ul>
        <p>elektronik ortamda, kısmen otomatik yollarla toplanır.</p>
      </Section>

      <Section title="5. Kişisel verilerin kimlere aktarılabileceği">
        <p>
          Kişisel verileriniz satılmaz ve reklam amacıyla paylaşılmaz. Yalnızca aşağıdaki alıcı gruplarına,
          belirtilen amaçla sınırlı olarak aktarılabilir.
        </p>
        <p>
          <strong>Platform içinde (rol bazlı erişim):</strong>
        </p>
        <Ul>
          <li>
            <strong>Dersinizin eğitmeni:</strong> öğrenci numaranızı, (eklediyse) adınızı soyadınızı, teslimlerinizi,
            puan ve geri bildirimlerinizi görür. Başka derslerin eğitmenleri göremez.
          </li>
          <li>
            <strong>Platform yöneticisi:</strong> öğrenci numaralarını yalnızca maskelenmiş biçimde (ör.{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">26*******9</code>) görür. Adınızı
            soyadınızı göremez.
          </li>
        </Ul>
        <p>
          <strong>Hizmet sağlayıcılar (veri işleyen):</strong>
        </p>
        <DataTable
          head={["Alıcı", "Aktarılan veri", "Amaç", "Konum"]}
          rows={[
            [
              `Barındırma hizmeti: ${val(LEGAL.hostingProvider)}`,
              "Platform veritabanı ve kayıtlar (şifreli alanlar şifreli olarak)",
              "Hizmetin çalıştırılması",
              val(LEGAL.hostingCountry),
            ],
            [
              "Resend, Inc. (e-posta gönderimi)",
              "Okul e-posta adresi, doğrulama/şifre sıfırlama e-postasının içeriği",
              "Doğrulama ve şifre sıfırlama e-postalarının iletilmesi",
              "ABD",
            ],
            [
              "Cloudflare, Inc. (Turnstile robot doğrulaması)",
              "IP adresi, tarayıcı ve cihaz sinyalleri",
              "Otomatik saldırıların önlenmesi",
              "ABD ve küresel ağ",
            ],
            [
              "Google LLC (yalnızca Google ile giriş kullanılırsa)",
              "Google hesap kimliği ve e-posta doğrulama bilgisi",
              "Google ile giriş",
              "ABD",
            ],
            [
              "Tarayıcı bildirim servisleri: Google, Apple, Mozilla (yalnızca bildirime izin verilirse)",
              <>
                Bildirim abonelik adresi ve <strong>uçtan uca şifrelenmiş</strong> bildirim içeriği
              </>,
              "Anlık bildirimin cihaza iletilmesi",
              "ABD",
            ],
          ]}
        />
        <p>
          <strong>Yurt dışına aktarım:</strong> Yukarıda konumu yurt dışı olan alıcılara aktarım, Kanun&apos;un 9.
          maddesine uygun olarak yapılır. Bu alıcılarla Kişisel Verileri Koruma Kurulu&apos;nun ilan ettiği{" "}
          <strong>standart sözleşmeler</strong> imzalanmış ve Kuruma bildirilmiştir. Bildirim içeriği bildirim
          servisi tarafından okunamayacak şekilde şifrelenir.
        </p>
        <p>
          <strong>Yetkili kurumlar:</strong> Kanunen yetkili kamu kurum ve kuruluşlarına ve yargı mercilerine, talep
          halinde ve hukuki yükümlülük kapsamında.
        </p>
      </Section>

      <Section title="6. Saklama süreleri">
        <DataTable
          head={["Veri", "Süre"]}
          rows={[
            [
              "Hesap, ders kaydı, teslim ve puanlar",
              "Hesabınız açık olduğu sürece. Hesap silindiğinde veya silme talebiniz kabul edildiğinde en geç 30 gün içinde silinir ya da anonim hale getirilir. Hukuki yükümlülük gerektiren kayıtlar ilgili süre boyunca saklanır.",
            ],
            [
              "\"Beni hatırla\" ile açılan oturum",
              "Son kullanımdan itibaren 90 gün. İşaret kaldırılırsa tarayıcı kapanınca biter.",
            ],
            ["Okunmuş bildirimler", "90 gün"],
            [
              "Giriş denemesi ve istek sayaçları (IP içerir)",
              "Sayaç süresi dolunca (en fazla birkaç saat) otomatik silinir.",
            ],
            [
              "Doğrulama ve şifre sıfırlama bağlantıları",
              "Kullanıldığında veya süresi dolduğunda (24 saat / 1 saat) geçersiz olur.",
            ],
            ["Yönetici denetim kayıtları", "2 yıl"],
            [
              "Cihaz bildirim aboneliği",
              "Bildirimi kapatana veya tarayıcı aboneliği geçersiz kılana kadar",
            ],
          ]}
        />
        <p>Süresi dolan veriler periyodik imha işlemiyle silinir veya anonim hale getirilir.</p>
      </Section>

      <Section title="7. Çerezler ve tarayıcı depolaması">
        <p>
          Platform yalnızca <strong>zorunlu</strong> çerezler kullanır:
        </p>
        <Ul>
          <li>
            <strong>Oturum çerezi:</strong> giriş yaptığınızı tanımak için (httpOnly, güvenli).
          </li>
          <li>
            <strong>&quot;Beni hatırla&quot; çerezi:</strong> oturumunuzun 90 gün açık kalması için.
          </li>
          <li>
            <strong>Google ile giriş sırasında</strong> kısa ömürlü güvenlik çerezleri.
          </li>
        </Ul>
        <p>
          Tarayıcınızın yerel depolamasında yalnızca arayüz tercihleri tutulur (ör. son kullanılan giriş sekmesi,
          bildirim kartının kapatıldığı bilgisi). Reklam, analitik veya takip çerezi kullanılmaz.
        </p>
      </Section>

      <Section title="8. Haklarınız (Kanun m.11)">
        <p>Kodbox&apos;a başvurarak:</p>
        <Ul>
          <li>kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
          <li>işlenmişse buna ilişkin bilgi talep etme,</li>
          <li>işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,</li>
          <li>eksik veya yanlış işlenmişse düzeltilmesini isteme,</li>
          <li>Kanun&apos;un 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,</li>
          <li>
            düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,
          </li>
          <li>
            işlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir
            sonucun ortaya çıkmasına itiraz etme,
          </li>
          <li>Kanuna aykırı işleme sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
        </Ul>
        <p>haklarına sahipsiniz.</p>
      </Section>

      <Section title="9. Başvuru">
        <p>
          Başvurunuzu, Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ&apos;e uygun olarak:
        </p>
        <Ul>
          <li>
            <strong>{val(LEGAL.email)}</strong> adresine, Platformda kayıtlı okul e-posta adresinizden göndererek,
          </li>
          {LEGAL.kep ? (
            <li>{LEGAL.kep} adresine KEP ile ya da güvenli elektronik imza veya mobil imzayla,</li>
          ) : null}
          <li>{val(LEGAL.address)} adresine ıslak imzalı dilekçeyle</li>
        </Ul>
        <p>
          iletebilirsiniz. Başvuruda adınız soyadınız, (yazılı başvuruda) imzanız, T.C. kimlik numaranız (yabancılar
          için uyruk ve pasaport/kimlik numarası), tebligata esas adresiniz, varsa e-posta adresiniz ve talep
          konunuz bulunmalıdır. Öğrenci başvurularında kimlik doğrulaması için öğrenci numarası da belirtilmelidir.
        </p>
        <p>
          Başvurular en geç <strong>30 gün</strong> içinde ücretsiz sonuçlandırılır. İşlemin ayrıca bir maliyet
          gerektirmesi halinde Kurulca belirlenen tarifedeki ücret alınabilir. Başvurunuzun reddedilmesi, verilen
          cevabın yetersiz bulunması veya süresinde cevap verilmemesi halinde Kişisel Verileri Koruma Kurulu&apos;na
          şikâyette bulunabilirsiniz.
        </p>
      </Section>

      <Section title="10. Değişiklikler">
        <p>
          Bu metin, işleme faaliyetlerinde değişiklik olduğunda güncellenir. Güncel metin her zaman{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">/kvkk</code> adresinde yayımlanır.
          Önemli değişiklikler Platform içi bildirimle duyurulur.
        </p>
      </Section>
    </div>
  );
}
