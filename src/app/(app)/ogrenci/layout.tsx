import { requireRole } from "@/lib/auth";

export default async function StudentLayout({ children }: LayoutProps<"/">) {
  await requireRole("student");
  return children;
}
