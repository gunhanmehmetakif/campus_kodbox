import { RoleGate } from "@/components/app-shell/role-gate";

/**
 * Rol kapısı: bu klasördeki her şey sadece "instructor" rolüne açıktır.
 * NOT: Layout'lar istemci gezinmelerinde yeniden çalışmaz; her page.tsx ve Server Action
 * kendi requireRole("instructor") çağrısını AYRICA yapar.
 */
export default function InstructorLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="instructor">{children}</RoleGate>;
}
