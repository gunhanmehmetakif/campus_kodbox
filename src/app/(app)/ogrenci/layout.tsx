import { RoleGate } from "@/components/app-shell/role-gate";

/**
 * Rol kapısı: bu klasördeki her şey sadece "student" rolüne açıktır.
 * NOT: Layout'lar istemci gezinmelerinde yeniden çalışmaz; her page.tsx ve Server Action
 * kendi requireRole("student") çağrısını AYRICA yapar.
 */
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="student">{children}</RoleGate>;
}
