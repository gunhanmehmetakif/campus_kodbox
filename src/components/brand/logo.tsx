import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path
        d="M18 20h6v10l12-10h8L31 32l14 12h-8L24 33v11h-6z"
        className="fill-primary-foreground"
      />
    </svg>
  );
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showName ? (
        <span className="font-heading text-lg font-semibold tracking-tight">{APP_NAME}</span>
      ) : (
        <span className="sr-only">{APP_NAME}</span>
      )}
    </span>
  );
}
