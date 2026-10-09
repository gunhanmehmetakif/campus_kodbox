import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, projedeki özel tipografi ölçeğini bilmezse `text-label` gibi
 * sınıfları renk sanıp `text-ink` ile çakıştırır. Bu yüzden ölçeği burada tanıtıyoruz.
 * Yeni bir `--text-*` adımı eklenirse buraya da eklenmeli (bkz. globals.css).
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["xs", "label", "sm", "base", "lg", "xl", "2xl", "3xl"],
      radius: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"],
    },
  },
});

/** Koşullu sınıf birleştirme + Tailwind çakışma çözümü. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
