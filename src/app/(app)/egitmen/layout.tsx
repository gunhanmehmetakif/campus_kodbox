import { requireRole } from "@/lib/auth";

export default async function InstructorLayout({ children }: LayoutProps<"/">) {
  await requireRole("instructor");
  return children;
}
