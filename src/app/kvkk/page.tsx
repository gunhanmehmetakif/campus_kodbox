import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Aydınlatma metni" };

/**
 * KVKK aydınlatma metni. İçerik PLAN.md §3'teki veri işleme kararlarını özetler.
 * F7: Hukuki onaydan geçmiş nihai metinle değiştirilecek (şu an taslak olarak işaretli).
 */
export default function KvkkPage() {
  return (
    <main className="min-h-dvh bg-paper px-4 py-10 sm:px-6">
      <article className="mx-auto flex max-w-[72ch] flex-col gap-6">
        <Link href="/" className="w-fit rounded-md" aria-label="Kodbox ana sayfa">
          <Logo />
        </Link>
        <header className="flex flex-col gap-3">
          <Badge variant="saffron">Taslak</Badge>
          <h1 className="text-2xl font-bold">Kişisel Verilerin Korunması Aydınlatma Metni</h1>
          <p className="text-sm text-ink-soft">
            Bu metin, Kodbox platformunda hangi kişisel verilerin, hangi amaçla ve nasıl işlendiğini açıklar.
          </p>
        </header>
        <section className="flex flex-col gap-3 text-sm leading-relaxed text-ink">
          <h2 className="text-base font-semibold">İşlenen veriler</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Öğrenciler için: okul numarası ve okul numarasından türetilen okul e-posta adresi.</li>
            <li>Eğitmen ve yöneticiler için: okul e-posta adresi ve görünen ad (unvan dahil).</li>
            <li>Ödev teslimleri: teslim edilen bağlantı, teslim zamanı, puan ve geri bildirim.</li>
          </ul>
          <p>Öğrencilerin adı ve soyadı platformda tutulmaz.</p>
          <h2 className="pt-2 text-base font-semibold">Nasıl korunur?</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Okul numarası ve e-posta adresi veritabanında şifreli (AES-256-GCM) saklanır.</li>
            <li>Şifreler geri döndürülemez biçimde (argon2id) saklanır.</li>
            <li>Yöneticiler öğrenci numaralarını maskeli görür; eğitmenler yalnızca kendi derslerindeki öğrencileri görür.</li>
            <li>Platform dosya barındırmaz; teslimler öğrencinin paylaştığı bağlantılardır.</li>
          </ul>
          <h2 className="pt-2 text-base font-semibold">Amaç</h2>
          <p>
            Veriler yalnızca ders, materyal ve ödev süreçlerinin yürütülmesi, hesabın doğrulanması ve güvenliğinin
            sağlanması amacıyla işlenir. Platform e-postayı yalnızca hesap doğrulama ve şifre sıfırlama için kullanır.
          </p>
        </section>
      </article>
    </main>
  );
}
