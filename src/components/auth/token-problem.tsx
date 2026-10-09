import { LinkIcon } from "lucide-react";
import Link from "next/link";

import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";

type TokenProblemProps = {
  status: "invalid" | "expired" | "used";
  /** Where "Yeni link iste" goes. */
  retryHref: string;
};

const COPY: Record<TokenProblemProps["status"], { title: string; description: string }> = {
  invalid: {
    title: "Link geçersiz",
    description: "Bu link hatalı ya da eksik. Mailinizdeki linkin tamamını açtığınızdan emin olun.",
  },
  expired: {
    title: "Linkin süresi dolmuş",
    description: "Güvenliğiniz için linkler kısa süre geçerlidir. Yeni bir link isteyebilirsiniz.",
  },
  used: {
    title: "Link daha önce kullanılmış",
    description: "Her link yalnızca bir kez kullanılabilir. Yeni bir link isteyebilir ya da giriş yapabilirsiniz.",
  },
};

/** Shared screen for verify/reset links that can no longer be used. */
export function TokenProblem({ status, retryHref }: TokenProblemProps) {
  const { title, description } = COPY[status];
  return (
    <AuthCard title={title} description={description}>
      <div className="space-y-3">
        <div className="flex justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-status-late-bg text-status-late">
            <LinkIcon className="size-6" aria-hidden="true" />
          </span>
        </div>
        <Button asChild size="lg" className="h-11 w-full text-sm">
          <Link href={retryHref}>Yeni link iste</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-11 w-full text-sm">
          <Link href="/giris">Girişe dön</Link>
        </Button>
      </div>
    </AuthCard>
  );
}
