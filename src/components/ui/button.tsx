import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Buton (DESIGN.md): 8px köşe, birincil eylem laurel, yıkıcı eylem brick.
 * Metin eylemin kendisidir: "Kaydet" değil "Ödevi yayınla".
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Birincil eylem (sayfada genelde bir tane). */
        default: "bg-laurel text-on-accent hover:bg-laurel/90",
        /** İkincil eylem. */
        outline:
          "border-line-strong bg-surface text-ink hover:bg-paper hover:text-ink aria-expanded:bg-paper",
        secondary: "bg-surface-sunken text-ink hover:bg-line aria-expanded:bg-line",
        ghost: "text-ink hover:bg-paper aria-expanded:bg-paper dark:hover:bg-line/60",
        /** Yıkıcı eylem (sil, devre dışı bırak). Onay diyaloğuyla birlikte kullanın. */
        destructive: "bg-brick text-on-accent hover:bg-brick/90 focus-visible:outline-brick",
        /** Yıkıcı ama hafif (satır içi "Kaldır"). */
        "destructive-soft": "bg-brick-tint text-brick hover:bg-brick-tint/70 focus-visible:outline-brick",
        link: "h-auto! px-0! text-laurel underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 rounded-md px-2 text-xs has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1 px-3 text-label has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        icon: "size-9",
        "icon-xs": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
