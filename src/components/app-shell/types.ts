import type { UserRole } from "@/db/schema";
import type { ThemeChoice } from "@/lib/theme";

/**
 * Kabuğa (istemci) geçirilen kullanıcı özeti. KİŞİSEL VERİ SINIRI: tam mail/numara YOK,
 * sadece maskeli mail. Sunucuda toShellUser(currentUser) ile üretilir.
 */
export type ShellUser = {
  role: UserRole;
  roleLabel: string;
  displayName: string | null;
  maskedEmail: string;
  theme: ThemeChoice;
};
