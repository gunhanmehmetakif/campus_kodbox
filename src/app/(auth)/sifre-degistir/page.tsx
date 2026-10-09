import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { AuthCardSkeleton } from "@/components/auth/auth-card-skeleton";
import { ChangePasswordForm } from "@/components/auth/password-forms";
import { getCurrentUser } from "@/lib/auth";
import { loginUrl, routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Şifre değiştir" };

async function ChangePasswordContent() {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(routes.changePassword));
  return (
    <AuthCard
      title="Şifrenizi değiştirin"
      description={user.mustChangePassword ? "Devam etmek için geçici şifrenizi değiştirmeniz gerekiyor." : undefined}
    >
      <ChangePasswordForm mustChange={user.mustChangePassword} />
    </AuthCard>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ChangePasswordContent />
    </Suspense>
  );
}
