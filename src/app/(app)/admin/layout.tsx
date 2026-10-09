import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  await requireRole("admin");
  return children;
}
