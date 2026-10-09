import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { APP_TAGLINE } from "@/config/app";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="flex flex-col items-center gap-1 text-center">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <p className="text-sm text-muted-foreground">{APP_TAGLINE}</p>
      </div>
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
