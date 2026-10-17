import { getAuthUser } from "@/lib/auth";
import { buildSubmissionsCsv } from "@/server/assignments/service";

export async function GET(_request: Request, ctx: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await ctx.params;
  const user = await getAuthUser();
  if (!user || user.role !== "instructor" || user.mustChangePassword) return new Response("Not found", { status: 404 });

  const csv = await buildSubmissionsCsv(assignmentId, user.id);
  if (!csv) return new Response("Not found", { status: 404 });

  return new Response(csv.content, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csv.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
