/**
 * Product identity. Pure module (client + server safe). Name and domain come from env so they
 * can be changed without code edits; NEXT_PUBLIC_ values are inlined at build time.
 */
export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Kodbox Campus",
  tagline: "Ders, materyal ve ödev platformu",
} as const;
