"use client";

import { Loader2, MonitorSmartphone } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { FormError, formError } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { signOutOtherSessionsAction } from "@/server/auth/actions";

type ActionState = Awaited<ReturnType<typeof signOutOtherSessionsAction>> | null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" disabled={pending} className="h-11 w-full text-sm sm:w-auto">
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MonitorSmartphone aria-hidden="true" />}
      Diğer cihazlardan çıkış yap
    </Button>
  );
}

/** Rendered only when other sessions exist; hides itself after a successful sign-out. */
export function SignOutOthers({ count }: { count: number }) {
  const [done, setDone] = useState(false);

  async function run() {
    const result = await signOutOtherSessionsAction();
    if (result.ok) {
      setDone(true);
      toast.success("Diğer cihazlardaki oturumlar kapatıldı.");
    }
    return result;
  }

  const [state, formAction] = useActionState<ActionState>(run, null);
  if (done) return null;

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={formError(state)} />
      <p className="text-sm text-muted-foreground">Başka {count} cihazda oturumunuz açık.</p>
      <SubmitButton />
    </form>
  );
}
