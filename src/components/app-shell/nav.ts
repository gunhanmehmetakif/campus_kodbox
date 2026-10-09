import {
  BookOpenIcon,
  CalendarRangeIcon,
  GraduationCapIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  SchoolIcon,
  ScrollTextIcon,
  UserCogIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/db/schema";

/**
 * Rol bazlı kenar çubuğu menüsü — TEK KAYNAK.
 * Yeni bir bölüm eklerken buraya ekleyin; breadcrumb etiketleri de SEGMENT_LABELS'tan gelir.
 */
export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** true: sadece tam eşleşmede aktif (panel ana sayfaları için). */
  exact?: boolean;
};

export type NavSection = { title?: string; items: NavItem[] };

export const NAV: Record<UserRole, NavSection[]> = {
  student: [
    {
      items: [
        { label: "Panel", href: "/ogrenci", icon: LayoutDashboardIcon, exact: true },
        { label: "Derslerim", href: "/ogrenci/dersler", icon: BookOpenIcon },
      ],
    },
  ],
  instructor: [
    {
      items: [
        { label: "Panel", href: "/egitmen", icon: LayoutDashboardIcon, exact: true },
        { label: "Derslerim", href: "/egitmen/dersler", icon: BookOpenIcon },
      ],
    },
  ],
  admin: [
    {
      items: [{ label: "Genel bakış", href: "/admin", icon: LayoutDashboardIcon, exact: true }],
    },
    {
      title: "Yönetim",
      items: [
        { label: "Eğitmenler", href: "/admin/egitmenler", icon: UsersIcon },
        { label: "Dersler", href: "/admin/dersler", icon: LibraryIcon },
        { label: "Öğrenciler", href: "/admin/ogrenciler", icon: GraduationCapIcon },
      ],
    },
    {
      title: "Ayarlar",
      items: [
        { label: "Okullar", href: "/admin/okullar", icon: SchoolIcon },
        { label: "Dönemler", href: "/admin/donemler", icon: CalendarRangeIcon },
        { label: "Denetim kaydı", href: "/admin/denetim", icon: ScrollTextIcon },
      ],
    },
  ],
};

/** Tüm rollerde menünün altındaki ortak bağlantılar. */
export const ACCOUNT_NAV: NavItem[] = [{ label: "Hesabım", href: "/hesap", icon: UserCogIcon }];

/** Breadcrumb için URL segmenti → Türkçe etiket. Dinamik segmentler (id) için BreadcrumbLabel kullanın. */
export const SEGMENT_LABELS: Record<string, string> = {
  ogrenci: "Öğrenci",
  egitmen: "Eğitmen",
  admin: "Yönetim",
  dersler: "Dersler",
  odevler: "Ödevler",
  materyaller: "Materyaller",
  duyurular: "Duyurular",
  teslimler: "Teslimler",
  ogrenciler: "Öğrenciler",
  egitmenler: "Eğitmenler",
  okullar: "Okullar",
  donemler: "Dönemler",
  denetim: "Denetim kaydı",
  hesap: "Hesabım",
  bildirimler: "Bildirimler",
  yeni: "Yeni",
  duzenle: "Düzenle",
  ayarlar: "Ayarlar",
};

/** Bir rolün kök yolu (breadcrumb'ta "Panel" olarak gösterilir). */
export const ROLE_ROOTS = new Set(["ogrenci", "egitmen", "admin"]);

export const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Yönetici",
  instructor: "Eğitmen",
  student: "Öğrenci",
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
