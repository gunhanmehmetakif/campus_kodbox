import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

import { AccountToaster } from "@/components/account/account-toaster";
import { GoogleLinkCard } from "@/components/account/google-link-card";
import { SignOutOthers } from "@/components/account/sign-out-others";
import { WelcomeCard } from "@/components/account/welcome-card";
import { PushToggleCard } from "@/components/notifications/push-toggle-card";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAccountOverview } from "@/server/auth/queries";
import { getPushConfig } from "@/server/notifications/queries";

export const metadata: Metadata = { title: "Hesap" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, account, push] = await Promise.all([searchParams, getAccountOverview(), getPushConfig()]);
  const welcome = first(params.hosgeldin) === "1";
  const identityLabel = account.role === "student" ? "Öğrenci numarası" : "Ad";
  const showGoogle = account.googleEnabled || account.google !== null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <AccountToaster oauth={first(params.oauth)} />
      <PageHeader title="Hesap" description="Kimlik bilgileriniz, giriş yöntemleriniz ve güvenlik." />

      {welcome ? <WelcomeCard canLinkGoogle={account.googleEnabled && account.google === null} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Kimlik</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="min-w-0 space-y-0.5">
              <dt className="text-muted-foreground">{identityLabel}</dt>
              <dd className={account.role === "student" ? "font-mono font-medium break-all" : "font-medium break-words"}>
                {account.label}
              </dd>
            </div>
            <div className="min-w-0 space-y-0.5">
              <dt className="text-muted-foreground">Okul maili</dt>
              <dd className="font-medium break-all">{account.email}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {account.role === "student" ? <PushToggleCard publicKey={push.publicKey} /> : null}

      {showGoogle ? <GoogleLinkCard google={account.google} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Güvenlik</CardTitle>
          <CardDescription>Şifrenizi düzenli aralıklarla değiştirmeniz önerilir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild variant="outline" className="h-11 w-full text-sm sm:w-auto">
            <Link href="/sifre-degistir">
              <KeyRound aria-hidden="true" />
              Şifre değiştir
            </Link>
          </Button>
          {account.otherSessionCount > 0 ? <SignOutOthers count={account.otherSessionCount} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
