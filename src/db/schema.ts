/**
 * Kodbox Campus database schema (docs/PRD.md section 10).
 *
 * Conventions
 * - UUID primary keys (gen_random_uuid()); `sessions.id` is the SHA-256 of the cookie token.
 * - All timestamps are `timestamptz` (stored UTC, shown as Europe/Istanbul).
 * - Personal data (email, student no, roster names) is stored encrypted (`*_enc`, AES-256-GCM)
 *   plus a searchable blind index (`*_hash`, HMAC-SHA256). Never write plaintext.
 *   See src/lib/server/crypto.ts.
 * - Students have no display name (KVKK); `users.display_name` is staff only.
 * - Schema changes after F0 go through a new migration (npm run db:generate); never edit an
 *   existing migration.
 */
import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => tstz("created_at").notNull().defaultNow();
const updatedAt = () =>
  tstz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Link attached to a post or assignment (`links` jsonb array element). */
export type LinkItem = { title: string; url: string };

/* ───────────────────────────────── Enums ───────────────────────────────── */

export const userRole = pgEnum("user_role", ["admin", "instructor", "student"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "disabled"]);
export const themePreference = pgEnum("theme_preference", ["system", "light", "dark"]);
/** Apple is not offered in v1 but the column stays provider-generic. */
export const oauthProvider = pgEnum("oauth_provider", ["google", "apple"]);
export const emailTokenPurpose = pgEnum("email_token_purpose", ["verify", "reset"]);
export const postType = pgEnum("post_type", ["announcement", "material"]);
/** Content state. There is no scheduled publishing in v1: draft or published. */
export const contentStatus = pgEnum("content_status", ["draft", "published"]);
export const submissionType = pgEnum("submission_type", ["link", "none"]);
export const latePenaltyType = pgEnum("late_penalty_type", ["none", "points", "percent"]);

export type UserRole = (typeof userRole.enumValues)[number];
export type UserStatus = (typeof userStatus.enumValues)[number];
export type ThemePreference = (typeof themePreference.enumValues)[number];
export type OAuthProvider = (typeof oauthProvider.enumValues)[number];
export type EmailTokenPurpose = (typeof emailTokenPurpose.enumValues)[number];
export type PostType = (typeof postType.enumValues)[number];
export type ContentStatus = (typeof contentStatus.enumValues)[number];
export type SubmissionType = (typeof submissionType.enumValues)[number];
export type LatePenaltyType = (typeof latePenaltyType.enumValues)[number];

/* ──────────────────────────────── Schools ──────────────────────────────── */

export const schools = pgTable(
  "schools",
  {
    id: id(),
    name: text("name").notNull(),
    /** Short code (e.g. "mku"). */
    slug: text("slug").notNull(),
    /** Student mail domain, e.g. "ogr.mku.edu.tr". Student email = `${no}@${domain}`. */
    studentEmailDomain: text("student_email_domain").notNull(),
    /** Staff (instructor/admin) mail domain, e.g. "mku.edu.tr". */
    staffEmailDomain: text("staff_email_domain").notNull(),
    /** Student number format regex, e.g. "^\d{6,12}$". */
    studentNoRegex: text("student_no_regex").notNull().default("^\\d{6,12}$"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("schools_slug_uq").on(t.slug),
    uniqueIndex("schools_student_email_domain_uq").on(t.studentEmailDomain),
    uniqueIndex("schools_staff_email_domain_uq").on(t.staffEmailDomain),
    check(
      "schools_domains_lowercase_chk",
      sql`${t.studentEmailDomain} = lower(${t.studentEmailDomain}) AND ${t.staffEmailDomain} = lower(${t.staffEmailDomain})`,
    ),
  ],
);

/* ──────────────────────────────── Users ──────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    role: userRole("role").notNull(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),

    /** School email, encrypted (login identity for everyone). */
    emailEnc: text("email_enc").notNull(),
    /** blindIndex(email): login lookup and uniqueness. */
    emailHash: text("email_hash").notNull(),

    /** Students only: school number, encrypted. */
    studentNoEnc: text("student_no_enc"),
    /** Students only: blindIndex(studentNo), matches course_roster. */
    studentNoHash: text("student_no_hash"),

    /** Staff only (instructor/admin). Students have no name (KVKK). */
    displayName: text("display_name"),

    /** argon2id hash. Null only while status = pending. */
    passwordHash: text("password_hash"),
    status: userStatus("status").notNull().default("pending"),
    /** True after an admin-issued temporary password; forces /sifre-degistir. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    theme: themePreference("theme").notNull().default("system"),

    kvkkAcceptedAt: tstz("kvkk_accepted_at"),
    emailVerifiedAt: tstz("email_verified_at"),
    passwordChangedAt: tstz("password_changed_at"),
    lastLoginAt: tstz("last_login_at"),
    disabledAt: tstz("disabled_at"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("users_email_hash_uq").on(t.emailHash),
    uniqueIndex("users_school_student_no_hash_uq").on(t.schoolId, t.studentNoHash),
    index("users_role_idx").on(t.role),
    index("users_school_id_idx").on(t.schoolId),
    check(
      "users_student_no_role_chk",
      sql`(${t.role} = 'student' AND ${t.studentNoHash} IS NOT NULL AND ${t.studentNoEnc} IS NOT NULL AND ${t.displayName} IS NULL)
       OR (${t.role} <> 'student' AND ${t.studentNoHash} IS NULL AND ${t.studentNoEnc} IS NULL)`,
    ),
    check("users_active_has_password_chk", sql`${t.status} <> 'active' OR ${t.passwordHash} IS NOT NULL`),
  ],
);

/* ───────────────────────────── OAuth accounts ───────────────────────────── */

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProvider("provider").notNull(),
    /** Provider's user id (Google `sub`). */
    providerUserId: text("provider_user_id").notNull(),
    /** Provider email shown in settings ("Bağlı: …"), encrypted. */
    providerEmailEnc: text("provider_email_enc"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("oauth_accounts_provider_user_uq").on(t.provider, t.providerUserId),
    uniqueIndex("oauth_accounts_user_provider_uq").on(t.userId, t.provider),
  ],
);

/* ──────────────────────────────── Sessions ──────────────────────────────── */

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256(token) hex. The raw token only lives in the user's cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "Remember me": 90 day sliding expiry. Otherwise a short sliding window + session cookie. */
    remember: boolean("remember").notNull().default(true),
    expiresAt: tstz("expires_at").notNull(),
    createdAt: createdAt(),
    lastSeenAt: tstz("last_seen_at").notNull().defaultNow(),
    /** Truncated User-Agent for the session list. */
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_expires_at_idx").on(t.expiresAt)],
);

/* ──────────────────────────── Email tokens (verify / reset) ──────────────────────────── */

export const emailTokens = pgTable(
  "email_tokens",
  {
    id: id(),
    /** Set for reset; null for verify when the user does not exist yet. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** blindIndex(school email): which identity the token was issued for. */
    loginIdHash: text("login_id_hash").notNull(),
    purpose: emailTokenPurpose("purpose").notNull(),
    /** SHA-256(token) hex. The raw token only lives in the mail link. */
    tokenHash: text("token_hash").notNull(),
    expiresAt: tstz("expires_at").notNull(),
    usedAt: tstz("used_at"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("email_tokens_token_hash_uq").on(t.tokenHash),
    index("email_tokens_login_id_purpose_idx").on(t.loginIdHash, t.purpose),
    index("email_tokens_expires_at_idx").on(t.expiresAt),
  ],
);

/* ─────────────────────────────── Rate limits ─────────────────────────────── */

/**
 * Fixed-window counters, e.g. "mail:{hash}", "register:ip:{ip}", "login-fail:{hash}".
 * Logic: src/lib/server/rate-limit.ts
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    windowStart: tstz("window_start").notNull(),
    count: integer("count").notNull().default(0),
    /** windowStart + window length; expired rows are purged periodically. */
    expiresAt: tstz("expires_at").notNull(),
  },
  (t) => [index("rate_limits_expires_at_idx").on(t.expiresAt)],
);

/* ───────────────────────────── Push subscriptions ───────────────────────────── */

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Push service URL, unique per browser/device. */
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    lastUsedAt: tstz("last_used_at"),
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_uq").on(t.endpoint),
    index("push_subscriptions_user_id_idx").on(t.userId),
  ],
);

/* ───────────────────────────────── Terms ───────────────────────────────── */

export const terms = pgTable(
  "terms",
  {
    id: id(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** e.g. "2026-2027 Güz". */
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("terms_school_name_uq").on(t.schoolId, t.name),
    /** At most one active term per school. */
    uniqueIndex("terms_one_active_per_school_uq").on(t.schoolId).where(sql`${t.isActive}`),
    check("terms_dates_chk", sql`${t.startsOn} IS NULL OR ${t.endsOn} IS NULL OR ${t.endsOn} >= ${t.startsOn}`),
  ],
);

/* ──────────────────────────────── Courses ──────────────────────────────── */

export const courses = pgTable(
  "courses",
  {
    id: id(),
    instructorId: uuid("instructor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "restrict" }),
    /** Upper case, no spaces (e.g. "BİL101"). */
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Set when archived (read-only, listed under past courses). */
    archivedAt: tstz("archived_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("courses_instructor_id_idx").on(t.instructorId),
    index("courses_term_id_idx").on(t.termId),
    uniqueIndex("courses_instructor_term_code_uq").on(t.instructorId, t.termId, t.code),
  ],
);

/* ───────────────────────────── Course roster ───────────────────────────── */

/**
 * Student numbers an instructor added to a course. A number can be here before the student
 * registers; `user_id` is linked at registration (matched by `student_no_hash`).
 */
export const courseRoster = pgTable(
  "course_roster",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    studentNoHash: text("student_no_hash").notNull(),
    studentNoEnc: text("student_no_enc").notNull(),
    /** Optional name pasted by the instructor, encrypted. Visible only to the course instructor. */
    displayNameEnc: text("display_name_enc"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    addedById: uuid("added_by_id").references(() => users.id, { onDelete: "set null" }),
    addedAt: tstz("added_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("course_roster_course_student_uq").on(t.courseId, t.studentNoHash),
    index("course_roster_student_no_hash_idx").on(t.studentNoHash),
    index("course_roster_user_id_idx").on(t.userId),
  ],
);

/* ─────────────────────────── Announcements & materials ─────────────────────────── */

export const posts = pgTable(
  "posts",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    type: postType("type").notNull(),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    links: jsonb("links").$type<LinkItem[]>().notNull().default([]),
    status: contentStatus("status").notNull().default("draft"),
    /** Set when published (draft: null). */
    publishedAt: tstz("published_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("posts_course_feed_idx").on(t.courseId, t.status, t.publishedAt.desc()),
    check("posts_published_has_date_chk", sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`),
  ],
);

/* ─────────────────────────────── Assignments ─────────────────────────────── */

export const assignments = pgTable(
  "assignments",
  {
    id: id(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    links: jsonb("links").$type<LinkItem[]>().notNull().default([]),

    /** link: students submit a link. none: informational, no submission. */
    submissionType: submissionType("submission_type").notNull().default("link"),
    /** false: only drive.google.com / docs.google.com links are accepted. */
    allowAnyLink: boolean("allow_any_link").notNull().default(false),

    /** Null = no deadline. */
    dueAt: tstz("due_at"),
    lateAllowed: boolean("late_allowed").notNull().default(false),
    /** Last accepted late submission time; null with lateAllowed = open ended. */
    lateUntil: tstz("late_until"),
    latePenaltyType: latePenaltyType("late_penalty_type").notNull().default("none"),
    /** points: points deducted. percent: 0-100. Only a suggestion, never applied automatically. */
    latePenaltyValue: numeric("late_penalty_value", { precision: 6, scale: 2, mode: "number" }),

    /** Null = grading off. */
    maxScore: numeric("max_score", { precision: 6, scale: 2, mode: "number" }),

    status: contentStatus("status").notNull().default("draft"),
    publishedAt: tstz("published_at"),
    /** When the "24 hours left" reminder was sent (F6). Reset when the due date changes. */
    dueReminderSentAt: tstz("due_reminder_sent_at"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("assignments_course_idx").on(t.courseId, t.status, t.dueAt),
    index("assignments_due_at_idx").on(t.dueAt),
    index("assignments_published_due_idx")
      .on(t.dueAt)
      .where(sql`${t.status} = 'published' AND ${t.dueAt} IS NOT NULL`),
    check("assignments_published_has_date_chk", sql`${t.status} <> 'published' OR ${t.publishedAt} IS NOT NULL`),
    check(
      "assignments_late_window_chk",
      sql`${t.lateUntil} IS NULL OR (${t.dueAt} IS NOT NULL AND ${t.lateAllowed} AND ${t.lateUntil} > ${t.dueAt})`,
    ),
    check("assignments_late_requires_due_chk", sql`NOT ${t.lateAllowed} OR ${t.dueAt} IS NOT NULL`),
    check(
      "assignments_penalty_chk",
      sql`(${t.latePenaltyType} = 'none' AND ${t.latePenaltyValue} IS NULL)
       OR (${t.latePenaltyType} = 'points' AND ${t.latePenaltyValue} > 0)
       OR (${t.latePenaltyType} = 'percent' AND ${t.latePenaltyValue} > 0 AND ${t.latePenaltyValue} <= 100)`,
    ),
    check("assignments_max_score_chk", sql`${t.maxScore} IS NULL OR ${t.maxScore} > 0`),
  ],
);

/* ─────────────────────────────── Submissions ─────────────────────────────── */

export const submissions = pgTable(
  "submissions",
  {
    id: id(),
    assignmentId: uuid("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /** Latest submission time; the first one is the oldest submission_history row. */
    submittedAt: tstz("submitted_at").notNull().defaultNow(),
    isLate: boolean("is_late").notNull().default(false),

    score: numeric("score", { precision: 6, scale: 2, mode: "number" }),
    feedback: text("feedback"),
    gradedAt: tstz("graded_at"),
    gradedById: uuid("graded_by_id").references(() => users.id, { onDelete: "set null" }),
    /** When set, score and feedback are visible to the student. */
    scorePublishedAt: tstz("score_published_at"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("submissions_assignment_student_uq").on(t.assignmentId, t.studentId),
    index("submissions_student_id_idx").on(t.studentId),
    check("submissions_score_chk", sql`${t.score} IS NULL OR ${t.score} >= 0`),
  ],
);

export const submissionHistory = pgTable(
  "submission_history",
  {
    id: id(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    submittedAt: tstz("submitted_at").notNull().defaultNow(),
    isLate: boolean("is_late").notNull().default(false),
  },
  (t) => [index("submission_history_submission_idx").on(t.submissionId, t.submittedAt.desc())],
);

/* ─────────────────────────────── Notifications ─────────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Notification type (see src/lib/server/notifications.ts). */
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    readAt: tstz("read_at"),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("notifications_user_unread_idx").on(t.userId).where(sql`${t.readAt} IS NULL`),
  ],
);

/* ─────────────────────────────── Audit log ─────────────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    /** Null for system jobs (cron, seed). */
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** e.g. "instructor.create" (see src/lib/server/audit.ts). */
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    /** Extra context. No plaintext personal data: use ids or masked values. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_created_at_idx").on(t.createdAt.desc()),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt.desc()),
    index("audit_logs_target_idx").on(t.targetType, t.targetId),
  ],
);

/* ─────────────────────────────── Relations ─────────────────────────────── */

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  terms: many(terms),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  oauthAccounts: many(oauthAccounts),
  sessions: many(sessions),
  pushSubscriptions: many(pushSubscriptions),
  coursesTaught: many(courses),
  submissions: many(submissions),
  notifications: many(notifications),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const emailTokensRelations = relations(emailTokens, ({ one }) => ({
  user: one(users, { fields: [emailTokens.userId], references: [users.id] }),
  school: one(schools, { fields: [emailTokens.schoolId], references: [schools.id] }),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  school: one(schools, { fields: [terms.schoolId], references: [schools.id] }),
  courses: many(courses),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(users, { fields: [courses.instructorId], references: [users.id] }),
  term: one(terms, { fields: [courses.termId], references: [terms.id] }),
  roster: many(courseRoster),
  posts: many(posts),
  assignments: many(assignments),
}));

export const courseRosterRelations = relations(courseRoster, ({ one }) => ({
  course: one(courses, { fields: [courseRoster.courseId], references: [courses.id] }),
  user: one(users, { fields: [courseRoster.userId], references: [users.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  course: one(courses, { fields: [posts.courseId], references: [courses.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, { fields: [assignments.courseId], references: [courses.id] }),
  author: one(users, { fields: [assignments.authorId], references: [users.id] }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  student: one(users, { fields: [submissions.studentId], references: [users.id] }),
  history: many(submissionHistory),
}));

export const submissionHistoryRelations = relations(submissionHistory, ({ one }) => ({
  submission: one(submissions, { fields: [submissionHistory.submissionId], references: [submissions.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

/* ─────────────────────────────── Row types ─────────────────────────────── */

export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type Term = typeof terms.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseRosterEntry = typeof courseRoster.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionHistoryEntry = typeof submissionHistory.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
