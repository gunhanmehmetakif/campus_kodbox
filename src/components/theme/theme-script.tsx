import { themeInitScript } from "@/lib/theme";

/**
 * <head> içinde, ilk boyamadan önce çalışan tema betiği (karanlık modda beyaz yanıp sönmeyi önler).
 * Root layout'ta bir kez kullanılır. <html suppressHydrationWarning> ile birlikte.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />;
}
