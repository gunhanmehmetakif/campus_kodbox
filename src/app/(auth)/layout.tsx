import { AuthLayout } from "@/components/auth/auth-layout";

/** Giriş, kayıt ve şifre ekranlarının iki sütunlu çerçevesi (statik). */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}
