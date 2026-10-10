import type { Metadata } from "next";

import { KvkkDraftBanner, KvkkText } from "@/components/auth/kvkk-text";

export const metadata: Metadata = { title: "KVKK aydınlatma metni" };

export default function KvkkPage() {
  return (
    <article className="space-y-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Kişisel Verilerin İşlenmesine İlişkin Aydınlatma Metni
      </h1>
      <KvkkDraftBanner />
      <KvkkText />
    </article>
  );
}
