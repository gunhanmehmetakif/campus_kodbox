import "server-only";

import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { getRequestNow } from "@/lib/server/now";

import {
  findStudentCourse,
  getDashboard,
  listCourseAssignments,
  listCourseFeed,
  listPastCourseCards,
  type AnnouncementItem,
  type FeedItem,
  type Page,
  type StudentAssignmentListItem,
  type StudentCourseCard,
  type StudentCourseView,
  type StudentDashboard,
  type UpcomingItem,
} from "./service";

export type {
  AnnouncementItem,
  FeedItem,
  Page,
  StudentAssignmentListItem,
  StudentCourseCard,
  StudentCourseView,
  StudentDashboard,
  UpcomingItem,
};
export type { SubmissionWindow } from "@/server/assignments/rules";

export async function getStudentDashboard(): Promise<StudentDashboard> {
  const now = new Date(await getRequestNow());
  const user = await requireRole("student");
  return getDashboard(user.id, now);
}

export async function listPastCourses(): Promise<StudentCourseCard[]> {
  const now = new Date(await getRequestNow());
  const user = await requireRole("student");
  return listPastCourseCards(user.id, now);
}

export async function getStudentCourse(courseId: string): Promise<StudentCourseView> {
  await getRequestNow();
  const user = await requireRole("student");
  const course = await findStudentCourse(courseId, user.id);
  if (!course) notFound();
  return course;
}

export async function listStudentCourseFeed(
  courseId: string,
  o: { tab: "akis" | "materyaller"; page?: number },
): Promise<Page<FeedItem>> {
  await getRequestNow();
  const user = await requireRole("student");
  const feed = await listCourseFeed(courseId, user.id, o);
  if (!feed) notFound();
  return feed;
}

export async function listStudentCourseAssignments(
  courseId: string,
  o: { filter: "bekleyen" | "teslim" | "puan" },
): Promise<StudentAssignmentListItem[]> {
  const now = new Date(await getRequestNow());
  const user = await requireRole("student");
  const items = await listCourseAssignments(courseId, user.id, now, o);
  if (!items) notFound();
  return items;
}
