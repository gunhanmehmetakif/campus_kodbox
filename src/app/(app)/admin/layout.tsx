import { RoleGate } from "@/components/app-shell/role-gate";

/**
 * Rol kapısı: bu klasördeki her şey sadece "admin" rolüne açıktır.
 * NOT: Layout'lar istemci gezinmelerinde yeniden çalışmaz; her page.tsx ve Server Action
 * kendi requireRole("admin") çağrısını AYRICA yapar.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGate role="admin">{children}</RoleGate>;
}
