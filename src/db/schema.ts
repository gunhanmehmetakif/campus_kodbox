/**
 * Kodbox veritabanı şeması (PLAN.md §8'in tam uygulaması).
 *
 * Kurallar
 * - Tüm PK'ler uuid (gen_random_uuid()); `sessions.id` hariç (token'ın SHA-256 hash'i).
 * - Tüm zaman damgaları `timestamptz` (UTC saklanır, gösterimde Europe/Istanbul).
 * - Kişisel veriler (e-posta, öğrenci no) ŞİFRELİ (`*_enc`, AES-256-GCM) + aranabilir
 *   blind index (`*_hash`, HMAC-SHA256) olarak tutulur. Düz metin ASLA yazılmaz.
 *   Yazma/okuma için: src/lib/server/crypto.ts → encrypt / decrypt / blindIndex.
 * - Şema F0'da donduruldu. Sonraki fazlar şemayı değiştirmemeli; zorunlu bir değişiklik
 *   gerekirse yeni bir migration ile (npm run db:generate) yapılır, mevcut migration düzenlenmez.
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

/* ────────────────────────────── Ortak yardımcılar ────────────────────────────── */

const id = () => uuid("id").primaryKey().defaultRandom();
const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => tstz("created_at").notNull().defaultNow();
const updatedAt = () =>
  tstz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** Materyal / ödev kaynak linki. `posts.links` ve `assignments.links` jsonb dizisinin elemanı. */
export type LinkItem = { title: string; url: string };

/* ──────────────────────────────────── Enum'lar ─────────────────────────────────── */

export const userRole = pgEnum("user_role", ["admin", "instructor", "student"]);
export const userStatus = pgEnum("user_status", ["pending", "active", "disabled"]);
export const themePreference = pgEnum("theme_preference", ["system", "light", "dark"]);
export const oauthProvider = pgEnum("oauth_provider", ["google", "apple"]);
export const emailTokenPurpose = pgEnum("email_token_purpose", ["verify", "reset"]);
export const postType = pgEnum("post_type", ["announcement", "material"]);
/**
 * İçerik durumu (duyuru, materyal, ödev).
 * - draft: sadece eğitmen görür.
 * - published: `publish_at <= now()` ise öğrenci görür; `publish_at > now()` ise "zamanlanmış".
 */
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

/* ──────────────────────────────────── Okullar ─────────────────────────────────── */

export const schools = pgTable(
  "schools",
  {
    id: id(),
    name: text("name").notNull(),
    /** Kısa kod (örn. "mku"); URL ve seed için. */
    slug: text("slug").notNull(),
    /** Öğrenci mail domain'i (örn. "ogr.mku.edu.tr"). Öğrenci maili = `${no}@${domain}`. */
    studentEmailDomain: text("student_email_domain").notNull(),
    /** Personel (eğitmen/admin) mail domain'i (örn. "mku.edu.tr"). */
    staffEmailDomain: text("staff_email_domain").notNull(),
    /** Öğrenci numarası format regex'i (örn. "^\d{6,12}$"). */
    studentNoRegex: text("student_no_regex").notNull().default("^\\d{6,12}$"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("schools_slug_uq").on(t.slug),
    uniqueIndex("schools_student_email_domain_uq").on(t.studentEmailDomain),
    check("schools_domains_lowercase_chk", sql`${t.studentEmailDomain} = lower(${t.studentEmailDomain}) AND ${t.staffEmailDomain} = lower(${t.staffEmailDomain})`),
  ],
);

/* ─────────────────────────────────── Kullanıcılar ────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: id(),
    role: userRole("role").notNull(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "restrict" }),

    /** Okul maili, şifreli (giriş kimliği; herkes için). */
    emailEnc: text("email_enc").notNull(),
    /** blindIndex(email) — giriş ve tekillik için. */
    emailHash: text("email_hash").notNull(),

    /** Sadece öğrenci: okul numarası, şifreli. */
    studentNoEnc: text("student_no_enc"),
    /** Sadece öğrenci: blindIndex(studentNo) — course_roster eşleşmesi için. */
    studentNoHash: text("student_no_hash"),

    /** Sadece eğitmen/admin (öğrencide isim TUTULMAZ — KVKK). */
    displayName: text("display_name"),

    /** argon2id hash. null = henüz şifre belirlenmemiş (yalnızca status=pending'de anlamlı). */
    passwordHash: text("password_hash"),
    status: userStatus("status").notNull().default("pending"),
    /** Admin'in verdiği geçici şifreyle ilk girişte true; /sifre-degistir'e zorlanır. */
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    theme: themePreference("theme").notNull().default("system"),

    /** KVKK aydınlatma metni onay zamanı (öğrenci kaydında zorunlu). */
    kvkkAcceptedAt: tstz("kvkk_accepted_at"),
    /** Mail sahipliği doğrulandığı an. */
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
      sql`(${t.role} = 'student' AND ${t.studentNoHash} IS NOT NULL AND ${t.studentNoEnc} IS NOT NULL)
       OR (${t.role} <> 'student' AND ${t.studentNoHash} IS NULL AND ${t.studentNoEnc} IS NULL)`,
    ),
    check("users_active_has_password_chk", sql`${t.status} <> 'active' OR ${t.passwordHash} IS NOT NULL`),
  ],
);

/* ─────────────────────────────── OAuth bağlantıları ─────────────────────────────── */

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProvider("provider").notNull(),
    /** Sağlayıcının kullanıcı kimliği (Google `sub`, Apple `sub`). */
    providerUserId: text("provider_user_id").notNull(),
    /** Sağlayıcıdaki e-posta (ayarlarda "Bağlı: …" göstermek için), şifreli. */
    providerEmailEnc: text("provider_email_enc"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("oauth_accounts_provider_user_uq").on(t.provider, t.providerUserId),
    uniqueIndex("oauth_accounts_user_provider_uq").on(t.userId, t.provider),
  ],
);

/* ──────────────────────────────────── Oturumlar ─────────────────────────────────── */

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256(token) hex. Token'ın kendisi sadece kullanıcının çerezinde durur. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: tstz("expires_at").notNull(),
    createdAt: createdAt(),
    /** Kayan süre uzatıldığında güncellenir (aktif oturum listesi için). */
    lastSeenAt: tstz("last_seen_at").notNull().defaultNow(),
    /** Kısaltılmış User-Agent (oturum listesinde "Chrome · Windows" gibi göstermek için). */
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId), index("sessions_expires_at_idx").on(t.expiresAt)],
);

/* ─────────────────────────── Mail token'ları (doğrulama/sıfırlama) ─────────────────────────── */

export const emailTokens = pgTable(
  "email_tokens",
  {
    id: id(),
    /** Sıfırlama (reset) için dolu; kayıt doğrulamada (verify) kullanıcı henüz yoksa null. */
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** blindIndex(okul maili) — token'ın hangi kimlik için üretildiği (rate limit + tekillik). */
    loginIdHash: text("login_id_hash").notNull(),
    purpose: emailTokenPurpose("purpose").notNull(),
    /** SHA-256(token) hex. Token'ın kendisi sadece mail linkinde durur. */
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

/* ───────────────────────────────── Rate limit sayaçları ───────────────────────────────── */

/**
 * Sabit pencere sayaçları. Anahtar örnekleri: "mail:student:{hash}", "register:ip:{ip}",
 * "login-fail:{emailHash}". Mantık: src/lib/server/rate-limit.ts
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    windowStart: tstz("window_start").notNull(),
    count: integer("count").notNull().default(0),
    /** windowStart + pencere süresi; süresi dolan satırlar periyodik temizlenir. */
    expiresAt: tstz("expires_at").notNull(),
  },
  (t) => [index("rate_limits_expires_at_idx").on(t.expiresAt)],
);

/* ──────────────────────────────────── Dönemler ─────────────────────────────────── */

export const terms = pgTable(
  "terms",
  {
    id: id(),
    schoolId: uuid("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    /** Örn. "2026-2027 Güz". */
    name: text("name").notNull(),
    startsOn: date("starts_on", { mode: "string" }),
    endsOn: date("ends_on", { mode: "string" }),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("terms_school_name_uq").on(t.schoolId, t.name),
    /** Okul başına en fazla bir aktif dönem. */
    uniqueIndex("terms_one_active_per_school_uq").on(t.schoolId).where(sql`${t.isActive}`),
    check("terms_dates_chk", sql`${t.startsOn} IS NULL OR ${t.endsOn} IS NULL OR ${t.endsOn} >= ${t.startsOn}`),
  ],
);

/* ──────────────────────────────────── Dersler ─────────────────────────────────── */

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
    /** Ders kodu, büyük harf, boşluksuz (örn. "BİL101"). Gösterimde mono rozet. */
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    /** Dolu ise ders arşivlenmiştir (salt okunur, "Geçmiş dersler"). */
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

/* ──────────────────────────────── Ders öğrenci listesi ──────────────────────────────── */

/**
 * Eğitmenin eklediği öğrenci numaraları. Numara, öğrenci kayıt olmadan önce de burada durur;
 * öğrenci kayıt olunca `user_id` bağlanır (eşleşme `student_no_hash` ile).
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

/* ───────────────────────────── Duyurular ve materyaller ───────────────────────────── */

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
    /** Yayın anı. Taslakta null olabilir; published iken zorunlu (gelecekteyse zamanlanmış). */
    publishAt: tstz("publish_at"),
    /** Yayın bildirimi gönderildiği an (F6 cron'u tekrar göndermesin diye). */
    notifiedAt: tstz("notified_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("posts_course_feed_idx").on(t.courseId, t.status, t.publishAt.desc()),
    index("posts_pending_publish_idx")
      .on(t.publishAt)
      .where(sql`${t.status} = 'published' AND ${t.notifiedAt} IS NULL`),
    check("posts_published_has_date_chk", sql`${t.status} <> 'published' OR ${t.publishAt} IS NOT NULL`),
  ],
);

/* ──────────────────────────────────── Ödevler ─────────────────────────────────── */

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

    /** link: öğrenci link teslim eder · none: teslim gerektirmeyen (bilgilendirme). */
    submissionType: submissionType("submission_type").notNull().default("link"),
    /** false: sadece drive.google.com / docs.google.com kabul edilir. */
    allowAnyLink: boolean("allow_any_link").notNull().default(false),

    /** null = süresiz. */
    dueAt: tstz("due_at"),
    lateAllowed: boolean("late_allowed").notNull().default(false),
    /** Geç teslim son kabul anı; null + lateAllowed = süresiz geç teslim. */
    lateUntil: tstz("late_until"),
    latePenaltyType: latePenaltyType("late_penalty_type").notNull().default("none"),
    /** points: düşülecek puan · percent: yüzde (0–100). Ceza otomatik uygulanmaz, öneridir. */
    latePenaltyValue: numeric("late_penalty_value", { precision: 6, scale: 2, mode: "number" }),

    /** null = puanlama kapalı. */
    maxScore: numeric("max_score", { precision: 6, scale: 2, mode: "number" }),

    status: contentStatus("status").notNull().default("draft"),
    publishAt: tstz("publish_at"),
    notifiedAt: tstz("notified_at"),
    /** "Son tarihe 24 saat kaldı" bildirimi gönderildiği an (F6). Tarih değişirse null'lanır. */
    dueReminderSentAt: tstz("due_reminder_sent_at"),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("assignments_course_idx").on(t.courseId, t.status, t.dueAt),
    index("assignments_due_at_idx").on(t.dueAt).where(sql`${t.status} = 'published'`),
    index("assignments_pending_publish_idx")
      .on(t.publishAt)
      .where(sql`${t.status} = 'published' AND ${t.notifiedAt} IS NULL`),
    check("assignments_published_has_date_chk", sql`${t.status} <> 'published' OR ${t.publishAt} IS NOT NULL`),
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

/* ──────────────────────────────────── Teslimler ─────────────────────────────────── */

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
    /** Son (güncel) teslim zamanı. İlk teslim submission_history'nin en eskisidir. */
    submittedAt: tstz("submitted_at").notNull().defaultNow(),
    isLate: boolean("is_late").notNull().default(false),

    score: numeric("score", { precision: 6, scale: 2, mode: "number" }),
    feedback: text("feedback"),
    gradedAt: tstz("graded_at"),
    gradedById: uuid("graded_by_id").references(() => users.id, { onDelete: "set null" }),
    /** Dolu ise puan + geri bildirim öğrenciye görünür. */
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

/* ──────────────────────────────────── Bildirimler ─────────────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Bildirim türü (bkz. src/lib/server/notifications.ts → NotificationType). */
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

/* ──────────────────────────────────── Denetim kaydı ─────────────────────────────────── */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    /** İşlemi yapan; sistem işlerinde (cron, seed) null. */
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    /** Örn. "instructor.create", "course.archive" (bkz. src/lib/server/audit.ts → AuditAction). */
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    /** Ek bağlam. Kişisel veri (düz mail/numara) YAZILMAZ; maskeli veya id kullanılır. */
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_created_at_idx").on(t.createdAt.desc()),
    index("audit_logs_actor_idx").on(t.actorId, t.createdAt.desc()),
    index("audit_logs_target_idx").on(t.targetType, t.targetId),
  ],
);

/* ──────────────────────────────────── İlişkiler ─────────────────────────────────── */

export const schoolsRelations = relations(schools, ({ many }) => ({
  users: many(users),
  terms: many(terms),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  school: one(schools, { fields: [users.schoolId], references: [schools.id] }),
  oauthAccounts: many(oauthAccounts),
  sessions: many(sessions),
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

/* ──────────────────────────────────── Satır tipleri ─────────────────────────────────── */

export type School = typeof schools.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type EmailToken = typeof emailTokens.$inferSelect;
export type Term = typeof terms.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseRosterEntry = typeof courseRoster.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionHistoryEntry = typeof submissionHistory.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
