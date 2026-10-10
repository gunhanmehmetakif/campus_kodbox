import { env } from "@/lib/env";
import { safeEqual } from "@/lib/server/crypto";
import { runCleanup, runDueReminders } from "@/server/notifications/reminders";

/** Hourly job: 24h assignment reminders + housekeeping. Protected by `Authorization: Bearer CRON_SECRET`. */
export async function POST(request: Request) {
  const secret = env.CRON_SECRET;
  if (!secret) return new Response("Not found", { status: 404 });

  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !safeEqual(token, secret)) return new Response("Unauthorized", { status: 401 });

  try {
    const now = new Date();
    const reminders = await runDueReminders(now);
    const cleanup = await runCleanup(now);
    return Response.json({ reminders, cleanup }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cron] hourly job failed", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
