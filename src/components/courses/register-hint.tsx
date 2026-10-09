"use client";

import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

/** Tells the instructor how students register, with a copyable link. */
export function RegisterHint({ registerUrl }: { registerUrl: string }) {
  const display = registerUrl.replace(/^https?:\/\//, "");

  async function copy() {
    try {
      await navigator.clipboard.writeText(registerUrl);
      toast.success("Link kopyalandı.", { id: "register-link-copied" });
    } catch {
      toast.error("Link kopyalanamadı. Elle seçip kopyalayın.");
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <Link2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Öğrencilerinize <strong className="font-semibold break-all">{display}</strong> adresinden kayıt olmalarını
          söyleyin.
        </span>
      </p>
      <Button type="button" variant="outline" className="h-11 shrink-0 bg-background" onClick={copy}>
        <Copy aria-hidden="true" />
        Linki kopyala
      </Button>
    </div>
  );
}
