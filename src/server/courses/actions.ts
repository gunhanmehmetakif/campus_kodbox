"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { fail, failFromZod, failUnexpected, ok, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { routes } from "@/lib/routes";

import {
  addRosterSchema,
  createCourseSchema,
  deletePostSchema,
  removeRosterEntrySchema,
  savePostSchema,
  setCourseArchivedSchema,
  updateCourseSchema,
} from "./schemas";
import {
  CourseError,
  addRoster,
  createCourse,
  deletePost,
  removeRosterEntry,
  savePost,
  setCourseArchived,
  updateCourse,
  type AddRosterResult,
} from "./service";

type Prev<T> = ActionResult<T> | null;

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/** Maps expected CourseErrors to a failure; anything else is logged and generic. */
function toFailure(error: unknown) {
  unstable_rethrow(error);
  if (error instanceof CourseError) return fail(error.message);
  return failUnexpected(error);
}

const courseHome = (courseId: string) => `/egitmen/dersler/${courseId}`;

function revalidateCourse(courseId: string) {
  revalidatePath(courseHome(courseId), "layout");
  revalidatePath(routes.instructor.home);
  revalidatePath("/egitmen/dersler");
}

export async function createCourseAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  let target: string;
  try {
    const user = await requireRole("instructor");
    const parsed = createCourseSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    const { id } = await createCourse(user, parsed.data);
    revalidatePath(routes.instructor.home);
    revalidatePath("/egitmen/dersler");
    target = `${courseHome(id)}?sekme=ogrenciler`;
  } catch (error) {
    return toFailure(error);
  }
  redirect(target);
}

export async function updateCourseAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const user = await requireRole("instructor");
    const parsed = updateCourseSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    await updateCourse(user, parsed.data);
    revalidateCourse(parsed.data.id);
    return ok();
  } catch (error) {
    return toFailure(error);
  }
}

export async function setCourseArchivedAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const user = await requireRole("instructor");
    const parsed = setCourseArchivedSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    await setCourseArchived(user, parsed.data);
    revalidateCourse(parsed.data.id);
    return ok();
  } catch (error) {
    return toFailure(error);
  }
}

export async function addRosterAction(
  _prev: Prev<AddRosterResult>,
  formData: FormData,
): Promise<ActionResult<AddRosterResult>> {
  try {
    const user = await requireRole("instructor");
    const parsed = addRosterSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    const result = await addRoster(user, parsed.data);
    revalidateCourse(parsed.data.courseId);
    return ok(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function removeRosterEntryAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const user = await requireRole("instructor");
    const parsed = removeRosterEntrySchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    await removeRosterEntry(user, parsed.data);
    revalidateCourse(parsed.data.courseId);
    return ok();
  } catch (error) {
    return toFailure(error);
  }
}

export async function savePostAction(
  _prev: Prev<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole("instructor");
    const parsed = savePostSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    const result = await savePost(user, parsed.data);
    revalidateCourse(parsed.data.courseId);
    return ok(result);
  } catch (error) {
    return toFailure(error);
  }
}

export async function deletePostAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const user = await requireRole("instructor");
    const parsed = deletePostSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    await deletePost(user, parsed.data);
    revalidateCourse(parsed.data.courseId);
    return ok();
  } catch (error) {
    return toFailure(error);
  }
}
