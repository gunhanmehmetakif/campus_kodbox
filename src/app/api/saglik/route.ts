import { sql } from "drizzle-orm";

import { db } from "@/db";

/** Liveness + database check for the container HEALTHCHECK and Coolify. No auth, never cached. */
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error("[health] database check failed", error);
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
