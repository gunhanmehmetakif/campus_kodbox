"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { fail, failFromZod, failUnexpected, ok, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { CourseError } from "@/server/courses/service";

import {
  checkSubmissionLinkSchema,
  deleteAssignmentSchema,
  gradeSubmissionSchema,
  publishScoresSchema,
  saveAssignmentSchema,
  submitAssignmentSchema,
} from "./schemas";
import {
  AssignmentError,
  checkSubmissionLink,
  deleteAssignment,
  gradeSubmission,
  publishScores,
  saveAssignment,
  submitAssignment,
} from "./service";

type Prev<T> = ActionResult<T> | null;

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Maps expected errors to a failure; anything else is logged and generic. */
function toFailure(error: unknown) {
  unstable_rethrow(error);
  if (error instanceof AssignmentError || error instanceof CourseError) return fail(error.message);
  return failUnexpected(error);
}

function revalidateCourse(courseId: string) {
  revalidatePath(`/egitmen/dersler/${courseId}`, "layout");
  revalidatePath(routes.instructor.home);
}

function revalidateAssignment(assignmentId: string) {
  revalidatePath(`/egitmen/odevler/${assignmentId}`, "layout");
  revalidatePath(`/ogrenci/odevler/${assignmentId}`);
}

export async function saveAssignmentAction(
  _prev: Prev<{ id: string; status: "draft" | "published" }>,
  formData: FormData,
): Promise<ActionResult<{ id: string; status: "draft" | "published" }>> {
  try {
    const user = await requireRole("instructor");
    const parsed = saveAssignmentSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    const result = await saveAssignment(user, parsed.data);
    revalidateCourse(parsed.data.courseId);
    revalidateAssignment(result.id);
    return ok(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deleteAssignmentAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const user = await requireRole("instructor");
    const parsed = deleteAssignmentSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    await deleteAssignment(user, parsed.data);
    revalidatePath("/egitmen/dersler", "layout");
    revalidatePath(routes.instructor.home);
    return ok();
  } catch (error) {
    return toFailure(error);
  }
}

export async function gradeSubmissionAction(
  _prev: Prev<{ score: number | null; gradedAt: Date | null }>,
  formData: FormData,
): Promise<ActionResult<{ score: number | null; gradedAt: Date | null }>> {
  try {
    const user = await requireRole("instructor");
    const parsed = gradeSubmissionSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    return ok(await gradeSubmission(user, parsed.data));
  } catch (error) {
    return toFailure(error);
  }
}

export async function publishScoresAction(
  _prev: Prev<{ count: number }>,
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireRole("instructor");
    const parsed = publishScoresSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    const result = await publishScores(user, parsed.data);
    revalidateAssignment(parsed.data.assignmentId);
    return ok(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function submitAssignmentAction(
  _prev: Prev<{ submittedAt: Date; isLate: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ submittedAt: Date; isLate: boolean }>> {
  try {
    const user = await requireRole("student");
    const parsed = submitAssignmentSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error, "Geçerli bir bağlantı girin.");
    const result = await submitAssignment(user, parsed.data);
    revalidateAssignment(parsed.data.assignmentId);
    return ok(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function checkSubmissionLinkAction(
  _prev: Prev<{ access: "public" | "private" | "unknown" }>,
  formData: FormData,
): Promise<ActionResult<{ access: "public" | "private" | "unknown" }>> {
  try {
    const user = await requireRole("student");
    const parsed = checkSubmissionLinkSchema.safeParse(formToObject(formData));
    if (!parsed.success) return ok({ access: "unknown" as const });
    return ok({ access: await checkSubmissionLink(user.id, parsed.data.url) });
  } catch (error) {
    return toFailure(error);
  }
}
