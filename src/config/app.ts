/** Product identity and school mail domains used by UI (pure module, client + server safe). */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "Kodbox Campus";
export const APP_SHORT_NAME = "Campus";
export const APP_TAGLINE = "Ders, materyal ve ödev platformu";

export type SchoolAudience = "student" | "staff";

/** Fixed mail domain per login tab. Placeholder for the first school (MKÜ); multi-school comes later. */
export const SCHOOL_EMAIL_DOMAINS: Record<SchoolAudience, string> = {
  student: "ogr.mku.edu.tr",
  staff: "mku.edu.tr",
};

export const AUDIENCE_LABELS: Record<SchoolAudience, string> = {
  student: "Öğrenci",
  staff: "Personel",
};
