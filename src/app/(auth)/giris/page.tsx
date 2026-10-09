import type { Metadata } from "next";

import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Giriş" };

export default function LoginPage() {
  return (
    <AuthCard title="Giriş yap" description="Okul mailinizle devam edin.">
      <LoginForm />
    </AuthCard>
  );
}
