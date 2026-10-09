import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Rozet. Durum rozetleri için ton varyantları (laurel/saffron/brick/sky/neutral) kullanın:
 *   <Badge variant="saffron">Taslak</Badge>  <Badge variant="neutral">Süresiz</Badge>
 */
const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-laurel text-on-accent [a]:hover:bg-laurel/90",
        secondary: "bg-surface-sunken text-ink [a]:hover:bg-line",
        outline: "border-line text-ink [a]:hover:bg-paper",
        destructive: "bg-brick-tint text-brick",
        laurel: "bg-laurel-tint text-laurel",
        saffron: "bg-saffron-tint text-saffron-ink",
        brick: "bg-brick-tint text-brick",
        sky: "bg-sky-tint text-sky",
        neutral: "border-line bg-paper text-ink-soft",
        ghost: "text-ink-soft hover:bg-paper",
        link: "text-laurel underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";

  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
