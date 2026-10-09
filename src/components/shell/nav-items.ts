import {
  Bell,
  BookOpen,
  GraduationCap,
  History,
  LayoutDashboard,
  CalendarRange,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

export type Role = "admin" | "instructor" | "student";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Exact-match highlighting (role home pages). */
  exact?: boolean;
  /** Shown directly in the mobile bottom bar; the rest go under "Daha". */
  primary?: boolean;
};

const bell: NavItem = { href: "/bildirimler", label: "Bildirimler", icon: Bell, primary: true };
const account: NavItem = { href: "/hesap", label: "Hesap", icon: UserCog, primary: true };

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  student: [
    { href: "/ogrenci", label: "Panel", icon: LayoutDashboard, exact: true, primary: true },
    bell,
    account,
  ],
  instructor: [
    { href: "/egitmen", label: "Panel", icon: LayoutDashboard, exact: true, primary: true },
    { href: "/egitmen/dersler", label: "Derslerim", icon: BookOpen, primary: true },
    bell,
    account,
  ],
  admin: [
    { href: "/admin", label: "Panel", icon: LayoutDashboard, exact: true, primary: true },
    { href: "/admin/egitmenler", label: "Eğitmenler", icon: GraduationCap, primary: true },
    { href: "/admin/dersler", label: "Dersler", icon: BookOpen, primary: true },
    { href: "/admin/ogrenciler", label: "Öğrenciler", icon: Users },
    { href: "/admin/donemler", label: "Dönemler", icon: CalendarRange },
    { href: "/admin/okullar", label: "Okullar", icon: GraduationCap },
    { href: "/admin/denetim", label: "Denetim kaydı", icon: History },
    account,
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  student: "Öğrenci",
  instructor: "Eğitmen",
  admin: "Yönetici",
};

export const ROLE_HOME: Record<Role, string> = {
  student: "/ogrenci",
  instructor: "/egitmen",
  admin: "/admin",
};

export function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
