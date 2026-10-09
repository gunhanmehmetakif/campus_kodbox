"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

const MESSAGES = {
  linked: { type: "success", text: "Google hesabınız bağlandı." },
  taken: { type: "error", text: "Bu Google hesabı başka bir kullanıcıya bağlı." },
  error: { type: "error", text: "Google bağlantısı kurulamadı. Tekrar deneyin." },
} as const;

/** Mounts the toaster for /hesap and shows the result of a Google link attempt (`?oauth=`). */
export function AccountToaster({ oauth }: { oauth?: string }) {
  useEffect(() => {
    if (oauth !== "linked" && oauth !== "taken" && oauth !== "error") return;
    const { type, text } = MESSAGES[oauth];
    toast[type](text, { id: "oauth-result" });
  }, [oauth]);

  return <Toaster position="top-center" />;
}
