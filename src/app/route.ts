import { redirect } from "next/navigation";

import { homePathForRole, routes } from "@/lib/routes";
import { getCurrentUser } from "@/lib/server/auth";

/**
 * Kök adres: oturuma ve role göre yönlendirir.
 *   oturum yok → /giris · şifre değişmeli → /sifre-degistir · aksi halde rolün paneli
 * (Sayfa değil Route Handler: içerik üretmez, statik kabuk gerektirmez.)
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) redirect(routes.login);
  redirect(user.mustChangePassword ? routes.changePassword : homePathForRole(user.role));
}
