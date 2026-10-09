/**
 * Link yardımcıları (saf; istemci + sunucu). Materyal linkleri ve ödev teslim linki kontrolü.
 */

export type LinkKind =
  | "drive-file"
  | "drive-folder"
  | "docs"
  | "sheets"
  | "slides"
  | "forms"
  | "youtube"
  | "github"
  | "generic";

/** URL'i ayrıştırır; geçersizse null. Sadece http/https kabul edilir. */
export function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function hostIs(url: URL, ...hosts: string[]) {
  const h = url.hostname.toLowerCase();
  return hosts.some((host) => h === host || h.endsWith(`.${host}`));
}

/** Linkin türü (ikon ve etiket seçimi için). */
export function detectLinkKind(value: string): LinkKind {
  const url = parseHttpUrl(value);
  if (!url) return "generic";
  if (hostIs(url, "docs.google.com")) {
    if (url.pathname.startsWith("/spreadsheets")) return "sheets";
    if (url.pathname.startsWith("/presentation")) return "slides";
    if (url.pathname.startsWith("/forms")) return "forms";
    return "docs";
  }
  if (hostIs(url, "drive.google.com")) {
    return url.pathname.includes("/folders/") ? "drive-folder" : "drive-file";
  }
  if (hostIs(url, "youtube.com", "youtu.be", "youtube-nocookie.com")) return "youtube";
  if (hostIs(url, "github.com")) return "github";
  return "generic";
}

export const LINK_KIND_LABEL: Record<LinkKind, string> = {
  "drive-file": "Google Drive",
  "drive-folder": "Drive klasörü",
  docs: "Google Dokümanlar",
  sheets: "Google E-Tablolar",
  slides: "Google Slaytlar",
  forms: "Google Formlar",
  youtube: "YouTube",
  github: "GitHub",
  generic: "Bağlantı",
};

/** Görünen kısa alan adı: "drive.google.com", "youtu.be" (www. atılır). */
export function displayHost(value: string): string {
  const url = parseHttpUrl(value);
  return url ? url.hostname.replace(/^www\./, "") : value;
}

/**
 * Ödev teslim linki Google Drive/Docs'a mı ait? (PLAN.md §5.3)
 * Eğitmen "her link kabul" seçmediyse teslimde zorunlu.
 */
export function isGoogleDriveLink(value: string): boolean {
  const url = parseHttpUrl(value);
  return Boolean(url && url.protocol === "https:" && hostIs(url, "drive.google.com", "docs.google.com"));
}
