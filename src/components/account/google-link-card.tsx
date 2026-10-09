"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FormError, formError } from "@/components/auth/form-parts";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { unlinkGoogleAction } from "@/server/auth/actions";

function UnlinkButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className="h-11 w-full text-sm sm:w-auto">
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      Kaldır
    </Button>
  );
}

type GoogleLinkCardProps = {
  /** null when no Google account is linked. */
  google: { email: string | null } | null;
};

export function GoogleLinkCard({ google }: GoogleLinkCardProps) {
  const [state, formAction] = useActionState(unlinkGoogleAction, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google hesabı</CardTitle>
        <CardDescription>Bağlarsanız şifre yazmadan tek dokunuşla giriş yapabilirsiniz.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <FormError message={formError(state)} />
        {google ? (
          <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm break-all">
              Bağlı: <span className="font-medium">{google.email ?? "Google hesabı"}</span>
            </p>
            <UnlinkButton />
          </form>
        ) : (
          <GoogleButton
            href="/api/auth/google?intent=link"
            label="Google hesabını bağla"
            className="h-11 w-full text-sm sm:w-auto"
          />
        )}
      </CardContent>
    </Card>
  );
}
