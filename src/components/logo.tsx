import { cn } from "@/lib/utils";

/**
 * Kodbox metin logosu (DESIGN.md): display font, "k" harfi laurel.
 */
export function Logo({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "font-display font-bold tracking-heading text-ink select-none",
        size === "sm" && "text-base",
        size === "md" && "text-lg",
        size === "lg" && "text-2xl",
        className,
      )}
    >
      <span className="text-laurel">k</span>odbox
    </span>
  );
}
