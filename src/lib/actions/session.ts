"use server";

import { redirect } from "next/navigation";

import { routes } from "@/lib/routes";
import { audit } from "@/lib/server/audit";
import { getCurrentUser } from "@/lib/server/auth";
import { invalidateSession } from "@/lib/server/session";

/**
 * Çıkış yap: mevcut oturumu DB'den siler, çerezi temizler, giriş sayfasına yönlendirir.
 * Kullanım: <form action={signOutAction}><button>Çıkış yap</button></form>
 */
export async function signOutAction(): Promise<void> {
  const user = await getCurrentUser();
  await invalidateSession(user?.sessionId);
  if (user) await audit(user.id, "auth.logout", { type: "user", id: user.id });
  redirect(routes.login);
}
