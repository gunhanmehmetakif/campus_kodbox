import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";

import { ThemeScript } from "@/components/theme/theme-script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

/* DESIGN.md · Tipografi — latin-ext alt kümesi Türkçe karakterler (ğ ş ı İ ö ü ç) için şart. */
const display = Schibsted_Grotesk({
  variable: "--font-schibsted-grotesk",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700"],
  display: "swap",
});

const body = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Kodbox", template: "%s · Kodbox" },
  description: "Ders, materyal ve ödev platformu. Derslerin, ödevlerin, teslimlerin — tek yerde.",
  applicationName: "Kodbox",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1525" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      // Tema betiği <html data-theme> özniteliğini hydration'dan önce ayarlar.
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
