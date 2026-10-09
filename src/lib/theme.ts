/**
 * Tema tercihi (DESIGN.md: prefers-color-scheme + manuel `data-theme` anahtarı).
 *
 * - "system": <html>'de data-theme YOK → CSS `prefers-color-scheme`'i izler.
 * - "light" / "dark": <html data-theme="…"> sistem tercihini ezer.
 * Tercih tarayıcıda localStorage'da, oturum açık kullanıcıda ayrıca `users.theme`'de tutulur.
 */

export const THEME_STORAGE_KEY = "kodbox-theme";
export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

/** <head>'de ilk boyamadan ÖNCE çalışan betik (tema yanıp sönmesini önler). */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;
