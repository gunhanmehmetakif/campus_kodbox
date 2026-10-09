import "server-only";

import { requireRole } from "@/lib/auth";

import * as service from "./service";

export type { Page } from "./service";
export { AUDIT_ACTION_OPTIONS } from "./service";

/**
 * Admin read queries (docs/fazlar/F2-F3-admin-ders.md section 2). Every query checks the role
 * itself. Student numbers are returned masked only; encrypted fields never leave this layer.
 */

export async function getAdminDashboard() {
  const admin = await requireRole("admin");
  return service.getDashboard(admin.schoolId);
}

export async function listInstructors(o: { page?: number; q?: string; status?: "active" | "disabled" } = {}) {
  const admin = await requireRole("admin");
  return service.listInstructors(admin.schoolId, o);
}

export async function listStudents(o: { page?: number; studentNo?: string; status?: "active" | "disabled" } = {}) {
  const admin = await requireRole("admin");
  return service.listStudents(admin.schoolId, o);
}

export async function listCoursesForAdmin(o: { page?: number; termId?: string; archived?: boolean } = {}) {
  const admin = await requireRole("admin");
  return service.listCourses(admin.schoolId, o);
}

export async function listTerms() {
  const admin = await requireRole("admin");
  return service.listTerms(admin.schoolId);
}

export async function getSchoolSettings() {
  const admin = await requireRole("admin");
  return service.getSchool(admin.schoolId);
}

export async function listAuditLogs(o: { page?: number; action?: string } = {}) {
  const admin = await requireRole("admin");
  return service.listAuditLogs(admin.schoolId, o);
}
