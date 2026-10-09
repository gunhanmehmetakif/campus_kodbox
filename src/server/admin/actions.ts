"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";

import { fail, failFromZod, failUnexpected, ok, type ActionResult } from "@/lib/action";
import { requireRole, type AuthUser } from "@/lib/auth";

import {
  archiveTermCoursesSchema,
  createInstructorSchema,
  createTermSchema,
  resetInstructorPasswordSchema,
  setActiveTermSchema,
  setUserStatusSchema,
  updateInstructorSchema,
  updateSchoolSchema,
  updateTermSchema,
} from "./schemas";
import * as service from "./service";

type Prev<T> = ActionResult<T> | null;

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

/**
 * Shared action skeleton: admin role check, Zod parse, service call, error mapping.
 * Expected failures (`AdminError`) carry Turkish messages; anything else is logged and generic.
 */
async function run<S extends z.ZodType, T>(
  schema: S,
  formData: FormData,
  handler: (admin: AuthUser, input: z.infer<S>) => Promise<T>,
  paths: string[],
): Promise<ActionResult<T>> {
  try {
    const admin = await requireRole("admin");
    const parsed = schema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);
    const data = await handler(admin, parsed.data);
    for (const path of paths) revalidatePath(path);
    return ok(data);
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof service.AdminError) return fail(error.message);
    return failUnexpected(error);
  }
}

const INSTRUCTORS = "/admin/egitmenler";
const STUDENTS = "/admin/ogrenciler";
const COURSES = "/admin/dersler";
const TERMS = "/admin/donemler";
const DASHBOARD = "/admin";

export async function createInstructorAction(
  _prev: Prev<{ id: string; tempPassword: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string; tempPassword: string }>> {
  return run(createInstructorSchema, formData, (admin, input) => service.createInstructor(admin, input), [
    INSTRUCTORS,
    DASHBOARD,
  ]);
}

export async function updateInstructorAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  return run(updateInstructorSchema, formData, (admin, input) => service.updateInstructor(admin, input), [INSTRUCTORS]);
}

export async function resetInstructorPasswordAction(
  _prev: Prev<{ tempPassword: string }>,
  formData: FormData,
): Promise<ActionResult<{ tempPassword: string }>> {
  return run(
    resetInstructorPasswordSchema,
    formData,
    (admin, input) => service.resetInstructorPassword(admin, input.id),
    [INSTRUCTORS],
  );
}

export async function setUserStatusAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  return run(setUserStatusSchema, formData, (admin, input) => service.setUserStatus(admin, input), [
    INSTRUCTORS,
    STUDENTS,
    DASHBOARD,
  ]);
}

export async function createTermAction(
  _prev: Prev<{ id: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return run(createTermSchema, formData, (admin, input) => service.createTerm(admin, input), [TERMS]);
}

export async function updateTermAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  return run(updateTermSchema, formData, (admin, input) => service.updateTerm(admin, input), [TERMS, COURSES]);
}

export async function setActiveTermAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  return run(setActiveTermSchema, formData, (admin, input) => service.setActiveTerm(admin, input.id), [
    TERMS,
    COURSES,
    DASHBOARD,
  ]);
}

export async function archiveTermCoursesAction(
  _prev: Prev<{ count: number }>,
  formData: FormData,
): Promise<ActionResult<{ count: number }>> {
  return run(archiveTermCoursesSchema, formData, (admin, input) => service.archiveTermCourses(admin, input.id), [
    TERMS,
    COURSES,
    DASHBOARD,
  ]);
}

export async function updateSchoolAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  return run(updateSchoolSchema, formData, (admin, input) => service.updateSchool(admin, input), ["/admin/okullar"]);
}
