"use client";

import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/hooks/use-theme";

/**
 * Toast kabı (root layout'ta bir kez). Kullanım: `import { toast } from "sonner"`.
 * Buton fiiliyle aynı fiil: "Yayınla" → toast.success("Yayınlandı").
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-laurel" />,
        info: <InfoIcon className="size-4 text-sky" />,
        warning: <TriangleAlertIcon className="size-4 text-saffron" />,
        error: <OctagonXIcon className="size-4 text-brick" />,
        loading: <Loader2Icon className="size-4 animate-spin text-ink-soft" />,
      }}
      style={
        {
          "--normal-bg": "var(--surface)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--line)",
          "--border-radius": "10px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-sans text-sm shadow-lg",
          description: "text-ink-soft",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
