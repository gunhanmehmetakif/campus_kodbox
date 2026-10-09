"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { APP_NAME, SCHOOL_EMAIL_DOMAINS } from "@/config/app";

const triggerClass =
  "inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4 hover:no-underline";

/** KVKK disclosure shown from the registration form. Draft text; to be confirmed by the school/legal. */
export function KvkkDialog() {
  return (
    <Dialog>
      <DialogTrigger className={triggerClass}>Aydınlatma metnini oku</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>KVKK aydınlatma metni</DialogTitle>
          <DialogDescription>{APP_NAME} kişisel verilerinizi nasıl işler?</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            <strong>İşlenen veriler:</strong> öğrenci numaranız, okul mail adresiniz, şifrenizin geri döndürülemez
            özeti, ders kayıtlarınız, ödev teslimleriniz ve aldığınız puanlar. Ad ve soyad bilgisi tutulmaz.
          </p>
          <p>
            <strong>Amaç:</strong> derslere erişiminizi sağlamak, ödev teslimini ve değerlendirmesini yürütmek,
            hesabınızın güvenliğini korumak ve size sistem bildirimleri göndermek.
          </p>
          <p>
            <strong>Saklama ve koruma:</strong> öğrenci numaranız ve mail adresiniz şifrelenerek saklanır. Yönetici
            numaranızı maskeli görür; yalnızca dersinizin eğitmeni tam numaranızı görebilir.
          </p>
          <p>
            <strong>Paylaşım:</strong> verileriniz yasal zorunluluklar dışında üçüncü kişilerle paylaşılmaz.
          </p>
          <p>
            <strong>Haklarınız:</strong> verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini
            isteme haklarına sahipsiniz. Başvurular için okul yönetimiyle iletişime geçin.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Explains how a student reaches the school mailbox the verification link was sent to. */
export function MailHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger className={triggerClass}>Okul mailinize nasıl girersiniz?</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Okul mailinize giriş</DialogTitle>
          <DialogDescription>Doğrulama linki okul mail kutunuza gönderilir.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            Okul mail adresiniz öğrenci numaranızdan oluşur:{" "}
            <span className="font-mono">numaranız@{SCHOOL_EMAIL_DOMAINS.student}</span>
          </p>
          <p>
            Bu adrese üniversitenin e-posta girişinden, okul mail şifrenizle ulaşabilirsiniz. Şifrenizi bilmiyorsanız
            üniversitenin bilgi işlem birimine başvurun.
          </p>
          <p>Mail birkaç dakika içinde gelmezse gereksiz (spam) klasörüne de bakın.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
