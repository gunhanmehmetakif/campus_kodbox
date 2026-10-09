import { cn } from "@/lib/utils";

/**
 * Ders kodu rozeti (DESIGN.md): her yerde mono, harf aralıklı, rozet içinde → `BİL101`.
 * Kod Türkçe kurallarıyla büyük harfe çevrilir (i → İ).
 */
export function CourseCodeBadge({
  code,
  size = "md",
  tone = "default",
  className,
}: {
  code: string;
  size?: "sm" | "md" | "lg";
  /** `onDark`: koyu zemin üstünde (auth paneli vb.). */
  tone?: "default" | "laurel" | "onDark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border font-mono font-medium tracking-[0.06em] whitespace-nowrap tabular-nums",
        size === "sm" && "h-5 px-1.5 text-xs tracking-[0.04em]",
        size === "md" && "h-6 px-2 text-xs",
        size === "lg" && "h-7 px-2.5 text-label",
        tone === "default" && "border-line bg-paper text-ink",
        tone === "laurel" && "border-transparent bg-laurel-tint text-laurel",
        tone === "onDark" && "border-white/15 bg-white/5 text-white/85",
        className,
      )}
    >
      {code.toLocaleUpperCase("tr-TR")}
    </span>
  );
}
