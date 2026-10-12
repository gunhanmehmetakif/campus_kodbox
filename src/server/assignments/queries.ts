import "server-only";

import { notFound } from "next/navigation";
import { connection } from "next/server";

import { requireRole } from "@/lib/auth";
import type { Page } from "@/lib/page";
import { findOwnedCourse } from "@/server/courses/service";

import {
  findOwnedAssignment,
  getAssignmentDetail,
  getStudentAssignmentView,
  listAssignmentSummaries,
  listPendingGradingItems,
  listSubmissionHistory,
  listSubmissionRows,
  type AssignmentDetail,
  type AssignmentSummary,
  type PendingGradingItem,
  type StudentAssignmentView,
  type SubmissionRow,
} from "./service";

export type { AssignmentDetail, AssignmentSummary, Page, PendingGradingItem, StudentAssignmentView, SubmissionRow };
export type { SubmissionWindow } from "./rules";

export async function listCourseAssignments(courseId: string): Promise<AssignmentSummary[]> {
  await connection();
  const user = await requireRole("instructor");
  if (!(await findOwnedCourse(courseId, user.id))) notFound();
  return listAssignmentSummaries(courseId);
}

export async function getAssignmentForInstructor(assignmentId: string): Promise<AssignmentDetail> {
  await connection();
  const user = await requireRole("instructor");
  const detail = await getAssignmentDetail(assignmentId, user.id);
  if (!detail) notFound();
  return detail;
}

export async function listSubmissions(
  assignmentId: string,
  o: { filter?: "ungraded" | "missing" | "late" | "all"; page?: number } = {},
): Promise<Page<SubmissionRow>> {
  await connection();
  const user = await requireRole("instructor");
  const owned = await findOwnedAssignment(assignmentId, user.id);
  if (!owned) notFound();
  return listSubmissionRows(assignmentId, owned.course.id, o);
}

export async function getSubmissionHistory(
  submissionId: string,
): Promise<Array<{ url: string; submittedAt: Date; isLate: boolean }>> {
  await connection();
  const user = await requireRole("instructor");
  const history = await listSubmissionHistory(submissionId, user.id);
  if (!history) notFound();
  return history;
}

export async function getAssignmentForStudent(assignmentId: string): Promise<StudentAssignmentView> {
  await connection();
  const user = await requireRole("student");
  const view = await getStudentAssignmentView(assignmentId, user.id, new Date());
  if (!view) notFound();
  return view;
}

export async function listPendingGrading(): Promise<PendingGradingItem[]> {
  await connection();
  const user = await requireRole("instructor");
  return listPendingGradingItems(user.id);
}
