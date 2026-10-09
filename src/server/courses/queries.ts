import "server-only";

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { requireRole } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { absoluteUrl } from "@/lib/server/mail";

import {
  findOwnedCourse,
  findPostForInstructor,
  getCourseDetail,
  listCoursesOf,
  listPostRows,
  listRosterRows,
  listTermsForSchool,
  type Page,
  type PostRow,
  type RosterRow,
} from "./service";

export type { Page };

export type CoursePost = PostRow;

export async function listTermsForCourseForm(): Promise<Array<{ id: string; name: string; isActive: boolean }>> {
  await connection();
  const user = await requireRole("instructor");
  return listTermsForSchool(user.schoolId);
}

export async function listMyCourses(o: { archived: boolean }): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    termName: string;
    studentCount: number;
    registeredCount: number;
    archivedAt: Date | null;
  }>
> {
  await connection();
  const user = await requireRole("instructor");
  return listCoursesOf(user.id, o.archived);
}

export async function getMyCourse(courseId: string): Promise<{
  id: string;
  code: string;
  name: string;
  description: string | null;
  term: { id: string; name: string };
  archivedAt: Date | null;
  studentCount: number;
  registeredCount: number;
  studentNoRegex: string;
  registerUrl: string;
}> {
  await connection();
  const user = await requireRole("instructor");
  const course = await getCourseDetail(courseId, user.id, user.schoolId);
  if (!course) notFound();
  return {
    id: course.id,
    code: course.code,
    name: course.name,
    description: course.description,
    term: { id: course.termId, name: course.termName },
    archivedAt: course.archivedAt,
    studentCount: course.studentCount,
    registeredCount: course.registeredCount,
    studentNoRegex: course.studentNoRegex,
    registerUrl: absoluteUrl(routes.register),
  };
}

export async function listRoster(
  courseId: string,
  o: { page?: number; studentNo?: string; filter?: "all" | "registered" | "unregistered" } = {},
): Promise<Page<RosterRow>> {
  await connection();
  const user = await requireRole("instructor");
  if (!(await findOwnedCourse(courseId, user.id))) notFound();
  return listRosterRows(courseId, o);
}

export async function listCoursePosts(
  courseId: string,
  o: { type: "announcement" | "material" },
): Promise<CoursePost[]> {
  await connection();
  const user = await requireRole("instructor");
  if (!(await findOwnedCourse(courseId, user.id))) notFound();
  return listPostRows(courseId, o.type);
}

export async function getCoursePost(postId: string): Promise<CoursePost & { courseId: string }> {
  await connection();
  const user = await requireRole("instructor");
  const post = await findPostForInstructor(postId, user.id);
  if (!post) notFound();
  return post;
}
