import type {
  getMyCourse,
  listCoursePosts,
  listMyCourses,
  listRoster,
  listTermsForCourseForm,
} from "@/server/courses/queries";

export type CourseSummary = Awaited<ReturnType<typeof listMyCourses>>[number];
export type CourseDetail = Awaited<ReturnType<typeof getMyCourse>>;
export type CoursePost = Awaited<ReturnType<typeof listCoursePosts>>[number];
export type RosterRow = Awaited<ReturnType<typeof listRoster>>["items"][number];
export type TermOption = Awaited<ReturnType<typeof listTermsForCourseForm>>[number];
