import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-8 shrink-0", className)}>
      <rect width="64" height="64" rx="15" fill="#2b3a67" />
      <rect x="8" y="6" width="48" height="52" rx="6" fill="#f7f3ea" />
      <path d="M38 6h11v20l-5.5-5-5.5 5Z" fill="#e3a948" />
      <path
        d="M19 19v26 M31 19l-10 13 10 13"
        stroke="#2b3a67"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Logo({ className, showName = true }: { className?: string; showName?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showName ? (
        <span className="inline-flex items-baseline gap-1.5" aria-hidden="true">
          <span className="font-heading text-lg font-semibold tracking-tight">kodbox</span>
          <span className="font-mono text-[0.6875rem] tracking-[0.18em] text-muted-foreground">
            CAMPUS
          </span>
        </span>
      ) : null}
      <span className="sr-only">{APP_NAME}</span>
    </span>
  );
}
