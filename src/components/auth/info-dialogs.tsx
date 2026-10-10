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

/** Short KVKK summary shown from the registration form; the full text lives at /kvkk. */
export function KvkkDialog() {
  return (
    <Dialog>
      <DialogTrigger className={triggerClass}>Aydınlatma metnini oku</DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>KVKK aydınlatma metni</DialogTitle>
          <DialogDescription>{APP_NAME} kişisel verilerinizi nasıl işler?</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
          <li>
            <strong>Hangi veriler:</strong> öğrenci numaranız, okul e-posta adresiniz, ders kayıtlarınız, ödev
            teslimleriniz ve puanlarınız. Ad soyad istenmez.
          </li>
          <li>
            <strong>Neden:</strong> derslere erişiminizi sağlamak, ödev teslimini ve değerlendirmesini yürütmek,
            hesabınızı korumak ve bildirim göndermek.
          </li>
          <li>
            <strong>Kimler görür:</strong> dersinizin eğitmeni tam numaranızı görür, yönetici yalnızca maskeli
            halini. Verileriniz satılmaz ve reklam için paylaşılmaz.
          </li>
          <li>
            <strong>Haklarınız:</strong> verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini
            isteme ve başvuru hakkına sahipsiniz (KVKK m.11).
          </li>
        </ul>
        <a
          href="/kvkk"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4 hover:no-underline"
        >
          Tam metni oku
        </a>
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
          <p>
            <a
              href="https://ogrposta.mku.edu.tr/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center font-medium text-primary underline underline-offset-4 hover:no-underline"
            >
              Öğrenci posta girişini aç (ogrposta.mku.edu.tr)
            </a>
          </p>
          <p>Mail birkaç dakika içinde gelmezse gereksiz (spam) klasörüne de bakın.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
