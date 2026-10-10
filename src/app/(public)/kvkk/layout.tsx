import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { routes } from "@/lib/routes";

export default function KvkkLayout({ children }: LayoutProps<"/kvkk">) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-prose flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Logo />
        </Link>
        <Link
          href={routes.login}
          className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-4 hover:no-underline"
        >
          Girişe dön
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
