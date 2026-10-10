/**
 * Turns a stored notification (type + payload) into display text, icon and link.
 * Pure module: used by the notification list (server) and by push messages. Never throws.
 */
export type NotificationView = {
  title: string;
  body: string;
  href: string;
  icon: "course" | "post" | "assignment" | "deadline" | "score";
};

const FALLBACK: NotificationView = { title: "Bildirim", body: "", href: "/bildirimler", icon: "post" };

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "14 Eki 21:03" in Istanbul time; null for missing or invalid input. */
function formatDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const parts = Object.fromEntries(dateFormatter.formatToParts(d).map((p) => [p.type, p.value]));
  return `${parts.day} ${parts.month} ${parts.hour}:${parts.minute}`;
}

function str(payload: Record<string, unknown>, key: string): string | null {
  const v = payload[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export function formatNotification(type: string, payload: Record<string, unknown>): NotificationView {
  try {
    return format(type, payload ?? {}) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

function format(type: string, p: Record<string, unknown>): NotificationView | null {
  const code = str(p, "courseCode");
  const courseId = str(p, "courseId");
  const title = str(p, "title");
  const assignmentId = str(p, "assignmentId");

  switch (type) {
    case "course.enrolled": {
      const name = str(p, "courseName");
      if (!code || !courseId || !name) return null;
      return { title: `${code} dersine eklendiniz`, body: name, href: `/ogrenci/dersler/${courseId}`, icon: "course" };
    }
    case "post.published": {
      const postId = str(p, "postId");
      if (!code || !courseId || !postId || !title) return null;
      return {
        title: `${code} · ${p.postType === "material" ? "Yeni materyal" : "Yeni duyuru"}`,
        body: title,
        href: `/ogrenci/dersler/${courseId}?sekme=akis#post-${postId}`,
        icon: "post",
      };
    }
    case "assignment.published": {
      if (!code || !assignmentId || !title) return null;
      const due = formatDate(p.dueAt);
      return {
        title: `${code} · Yeni ödev`,
        body: due ? `${title} · Son teslim ${due}` : title,
        href: `/ogrenci/odevler/${assignmentId}`,
        icon: "assignment",
      };
    }
    case "assignment.dates_changed": {
      if (!code || !assignmentId || !title) return null;
      const due = formatDate(p.dueAt);
      return {
        title: `${code} · Ödev tarihi değişti`,
        body: due ? `${title} · Yeni son teslim ${due}` : `${title} · Süresiz`,
        href: `/ogrenci/odevler/${assignmentId}`,
        icon: "deadline",
      };
    }
    case "assignment.due_soon": {
      const due = formatDate(p.dueAt);
      if (!code || !assignmentId || !title || !due) return null;
      return {
        title: `${code} · Son 24 saat`,
        body: `${title} · Son teslim ${due}`,
        href: `/ogrenci/odevler/${assignmentId}`,
        icon: "deadline",
      };
    }
    case "submission.score_published": {
      if (!code || !assignmentId || !title) return null;
      return {
        title: `${code} · Puanınız yayınlandı`,
        body: title,
        href: `/ogrenci/odevler/${assignmentId}`,
        icon: "score",
      };
    }
    default:
      return null;
  }
}
