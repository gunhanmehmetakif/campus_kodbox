"use client";

import { PartyPopper } from "lucide-react";
import { useState } from "react";

import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Shown after registration (`?hosgeldin=1`); offers to link Google, dismissible. */
export function WelcomeCard({ canLinkGoogle }: { canLinkGoogle: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <Card className="border-primary/20 bg-accent/40">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <PartyPopper className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="font-heading text-base font-medium">Hoş geldiniz</h2>
            <p className="text-sm text-muted-foreground">
              {canLinkGoogle
                ? "Hesabınız hazır. Daha hızlı giriş için Google hesabınızı bağlayın."
                : "Hesabınız hazır."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {canLinkGoogle ? (
            <GoogleButton
              href="/api/auth/google?intent=link"
              label="Google'ı bağla"
              variant="default"
              className="h-11 w-full text-sm sm:w-auto"
            />
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full text-sm sm:w-auto"
            onClick={() => setDismissed(true)}
          >
            {canLinkGoogle ? "Şimdi değil" : "Tamam"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
