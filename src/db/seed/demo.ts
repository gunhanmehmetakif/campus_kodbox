/**
 * npm run db:seed:demo — UI geliştirme ve demo için örnek veri.
 *
 * Temel seed'i de çalıştırır. Her çalıştırmada ÖNCEKİ DEMO VERİSİNİ SİLİP yeniden oluşturur
 * (tarihler "şimdi"ye göre göreli olduğu için her zaman taze durumlar üretir).
 * Sadece demo hesaplarına ve onların derslerine dokunur.
 *
 * Hesaplar (şifre hepsinde: Demo1234):
 *   Eğitmen : demo.egitmen@mku.edu.tr
 *   Öğrenci : 260000101@ogr.mku.edu.tr · 260000102@… · 260000103@…
 */
import "../../../scripts/load-env";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  assignments,
  courseRoster,
  courses,
  notifications,
  posts,
  submissionHistory,
  submissions,
  users,
  type School,
} from "@/db/schema";
import { getZonedParts, zonedTimeToUtc } from "@/lib/dates";
import { staffEmail, studentEmail } from "@/lib/identity";
import { blindIndex, encrypt } from "@/lib/server/crypto";
import { hashPassword } from "@/lib/server/password";

import { seedBase } from "./base";

export const DEMO_PASSWORD = "Demo1234";
export const DEMO_INSTRUCTOR = { local: "demo.egitmen", displayName: "Dr. Öğr. Üyesi Deniz Aksoy" };
export const DEMO_STUDENTS = ["260000101", "260000102", "260000103"] as const;
/** Derse eklenmiş ama henüz kayıt olmamış numara ("Henüz kayıt olmadı" durumu için). */
const UNREGISTERED_STUDENT = "260000199";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Bugünden `days` gün sonra, İstanbul saatiyle hh:mm. */
function dayAt(days: number, hour: number, minute = 0): Date {
  const today = getZonedParts(new Date());
  const base = zonedTimeToUtc({ year: today.year, month: today.month, day: today.day, hour, minute });
  return new Date(base.getTime() + days * DAY);
}

async function removePreviousDemo(school: School) {
  const instructorHash = blindIndex(staffEmail(DEMO_INSTRUCTOR.local, school));
  const studentHashes = DEMO_STUDENTS.map((no) => blindIndex(studentEmail(no, school)));

  const [instructor] = await db.select({ id: users.id }).from(users).where(eq(users.emailHash, instructorHash));
  if (instructor) {
    await db.delete(courses).where(eq(courses.instructorId, instructor.id)); // posts/ödev/teslim/roster cascade
    await db.delete(users).where(eq(users.id, instructor.id));
  }
  await db.delete(users).where(inArray(users.emailHash, studentHashes));
}

async function main() {
  const { school, term } = await seedBase();
  await removePreviousDemo(school);

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const now = new Date();

  /* ─────────────── Kullanıcılar ─────────────── */
  const instructorEmail = staffEmail(DEMO_INSTRUCTOR.local, school);
  const [instructor] = await db
    .insert(users)
    .values({
      role: "instructor",
      schoolId: school.id,
      emailEnc: encrypt(instructorEmail),
      emailHash: blindIndex(instructorEmail),
      displayName: DEMO_INSTRUCTOR.displayName,
      passwordHash,
      status: "active",
      emailVerifiedAt: now,
      passwordChangedAt: now,
    })
    .returning();

  const students = await db
    .insert(users)
    .values(
      DEMO_STUDENTS.map((no) => {
        const email = studentEmail(no, school);
        return {
          role: "student" as const,
          schoolId: school.id,
          emailEnc: encrypt(email),
          emailHash: blindIndex(email),
          studentNoEnc: encrypt(no),
          studentNoHash: blindIndex(no),
          passwordHash,
          status: "active" as const,
          kvkkAcceptedAt: now,
          emailVerifiedAt: now,
          passwordChangedAt: now,
        };
      }),
    )
    .returning();
  const [s1, s2, s3] = students as [typeof students[number], typeof students[number], typeof students[number]];

  /* ─────────────── Dersler + öğrenci listeleri ─────────────── */
  const [bil, mat] = await db
    .insert(courses)
    .values([
      {
        instructorId: instructor!.id,
        termId: term.id,
        code: "BİL101",
        name: "Programlamaya Giriş",
        description: "Python ile temel programlama: değişkenler, koşullar, döngüler, fonksiyonlar.",
      },
      {
        instructorId: instructor!.id,
        termId: term.id,
        code: "MAT201",
        name: "Lineer Cebir",
        description: "Matrisler, determinantlar, vektör uzayları ve doğrusal dönüşümler.",
      },
    ])
    .returning();

  const rosterRow = (courseId: string, no: string, userId: string | null) => ({
    courseId,
    studentNoHash: blindIndex(no),
    studentNoEnc: encrypt(no),
    userId,
    addedById: instructor!.id,
  });
  await db
    .insert(courseRoster)
    .values([
      rosterRow(bil!.id, DEMO_STUDENTS[0], s1.id),
      rosterRow(bil!.id, DEMO_STUDENTS[1], s2.id),
      rosterRow(bil!.id, DEMO_STUDENTS[2], s3.id),
      rosterRow(bil!.id, UNREGISTERED_STUDENT, null),
      rosterRow(mat!.id, DEMO_STUDENTS[0], s1.id),
      rosterRow(mat!.id, DEMO_STUDENTS[1], s2.id),
    ]);

  /* ─────────────── Duyurular ve materyaller ─────────────── */
  await db.insert(posts).values([
    {
      courseId: bil!.id,
      authorId: instructor!.id,
      type: "announcement",
      title: "Derse hoş geldiniz",
      bodyMd:
        "Merhaba arkadaşlar,\n\nDers materyalleri ve ödevler bu platformda paylaşılacak. **Ödev teslimleri Google Drive linki** ile yapılır; paylaşım ayarını *Bağlantıya sahip olan herkes* yapmayı unutmayın.\n\nİyi çalışmalar.",
      status: "published",
      publishAt: new Date(now.getTime() - 12 * DAY),
      notifiedAt: new Date(now.getTime() - 12 * DAY),
    },
    {
      courseId: bil!.id,
      authorId: instructor!.id,
      type: "material",
      title: "Hafta 1 · Python'a giriş",
      bodyMd: "Kurulum adımları ve ilk programlar. Slaytlarda geçen örnek kodlar klasörde.",
      links: [
        { title: "Hafta 1 slaytları", url: "https://docs.google.com/presentation/d/kodbox-demo-hafta1/edit" },
        { title: "Örnek kodlar", url: "https://drive.google.com/drive/folders/kodbox-demo-ornekler" },
        { title: "Python kurulumu (video)", url: "https://www.youtube.com/watch?v=YYXdXT2l-Gg" },
      ],
      status: "published",
      publishAt: new Date(now.getTime() - 11 * DAY),
      notifiedAt: new Date(now.getTime() - 11 * DAY),
    },
    {
      courseId: bil!.id,
      authorId: instructor!.id,
      type: "material",
      title: "Hafta 3 · Fonksiyonlar",
      bodyMd: "Fonksiyon tanımlama, parametreler, dönüş değerleri.",
      links: [{ title: "Hafta 3 ders notu", url: "https://docs.google.com/document/d/kodbox-demo-hafta3/edit" }],
      status: "published",
      publishAt: dayAt(2, 9), // zamanlanmış
    },
    {
      courseId: bil!.id,
      authorId: instructor!.id,
      type: "announcement",
      title: "Ara sınav tarihi (taslak)",
      bodyMd: "Ara sınav 6. haftada yapılacak. Kesin tarih bölüm başkanlığından onay sonrası duyurulacak.",
      status: "draft",
    },
    {
      courseId: mat!.id,
      authorId: instructor!.id,
      type: "announcement",
      title: "Problem saatleri",
      bodyMd: "Her çarşamba 14:00–15:00 arası ofisteyim. Sorularınızı getirin.",
      status: "published",
      publishAt: new Date(now.getTime() - 3 * DAY),
      notifiedAt: new Date(now.getTime() - 3 * DAY),
    },
  ]);

  /* ─────────────── Ödevler ─────────────── */
  const [odev1, odev2, odev3, , problem1] = await db
    .insert(assignments)
    .values([
      {
        // GEÇMİŞ: süresi doldu, geç teslim kapalı, puanlar yayınlandı
        courseId: bil!.id,
        authorId: instructor!.id,
        title: "Ödev 1 · Değişkenler ve tipler",
        bodyMd: "Kullanıcıdan iki sayı alıp toplamını, farkını ve çarpımını yazdıran bir program yaz.",
        submissionType: "link",
        dueAt: dayAt(-3, 23, 59),
        maxScore: 100,
        status: "published",
        publishAt: dayAt(-10, 9),
        notifiedAt: dayAt(-10, 9),
      },
      {
        // 24 SAAT İÇİNDE: geç teslim açık (%10 ceza, son kabul +3 gün)
        courseId: bil!.id,
        authorId: instructor!.id,
        title: "Ödev 2 · Döngüler",
        bodyMd:
          "1. 1'den 100'e kadar asal sayıları yazdır.\n2. Kullanıcıdan alınan sayının basamakları toplamını bul.\n\n> Teslimden sonra dosyayı değiştirme.",
        links: [{ title: "Ödev şablonu", url: "https://docs.google.com/document/d/kodbox-demo-odev2/edit" }],
        submissionType: "link",
        dueAt: new Date(now.getTime() + 20 * HOUR),
        lateAllowed: true,
        lateUntil: new Date(now.getTime() + 20 * HOUR + 3 * DAY),
        latePenaltyType: "percent",
        latePenaltyValue: 10,
        maxScore: 100,
        status: "published",
        publishAt: dayAt(-5, 10),
        notifiedAt: dayAt(-5, 10),
      },
      {
        // 5 GÜN SONRA
        courseId: bil!.id,
        authorId: instructor!.id,
        title: "Ödev 3 · Fonksiyonlar",
        bodyMd: "Bir sayının asal olup olmadığını döndüren `asal_mi(n)` fonksiyonunu yaz ve test et.",
        submissionType: "link",
        dueAt: dayAt(5, 23, 59),
        maxScore: 100,
        status: "published",
        publishAt: dayAt(-1, 9),
        notifiedAt: dayAt(-1, 9),
      },
      {
        // SÜRESİZ, teslim gerektirmeyen
        courseId: bil!.id,
        authorId: instructor!.id,
        title: "Okuma · Temiz Kod, 1. bölüm",
        bodyMd: "Dönem boyunca okunacak. Teslim gerektirmez.",
        submissionType: "none",
        status: "published",
        publishAt: dayAt(-8, 9),
        notifiedAt: dayAt(-8, 9),
      },
      {
        // GEÇ TESLİM PENCERESİNDE: süre dün doldu, son kabul +2 gün, 5 puan ceza
        courseId: mat!.id,
        authorId: instructor!.id,
        title: "Problem seti 1 · Matris işlemleri",
        bodyMd: "Kitaptaki 1.3 bölümünün sonundaki 1–12 arası problemleri çöz, taratıp tek PDF olarak yükle.",
        submissionType: "link",
        dueAt: dayAt(-1, 23, 59),
        lateAllowed: true,
        lateUntil: dayAt(2, 23, 59),
        latePenaltyType: "points",
        latePenaltyValue: 5,
        maxScore: 50,
        status: "published",
        publishAt: dayAt(-7, 9),
        notifiedAt: dayAt(-7, 9),
      },
      {
        // ZAMANLANMIŞ: yarın yayına girer
        courseId: mat!.id,
        authorId: instructor!.id,
        title: "Problem seti 2 · Determinantlar",
        bodyMd: "Yayın tarihinde açılacak.",
        submissionType: "link",
        dueAt: dayAt(8, 23, 59),
        maxScore: 50,
        status: "published",
        publishAt: dayAt(1, 9),
      },
      {
        courseId: mat!.id,
        authorId: instructor!.id,
        title: "Proje önerisi (taslak)",
        bodyMd: "Taslak.",
        submissionType: "link",
        allowAnyLink: true,
        status: "draft",
      },
    ])
    .returning();

  /* ─────────────── Teslimler (+ geçmiş) ─────────────── */
  const drive = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=sharing`;
  const subs = await db
    .insert(submissions)
    .values([
      {
        assignmentId: odev1!.id,
        studentId: s1.id,
        url: drive("kodbox-demo-odev1-s1"),
        submittedAt: dayAt(-4, 18, 22),
        score: 90,
        feedback: "Temiz ve okunaklı. Değişken adlarına dikkat etmen güzel.",
        gradedAt: dayAt(-2, 10),
        gradedById: instructor!.id,
        scorePublishedAt: dayAt(-2, 10),
      },
      {
        assignmentId: odev1!.id,
        studentId: s3.id,
        url: drive("kodbox-demo-odev1-s3"),
        submittedAt: dayAt(-3, 23, 40),
        score: 70,
        feedback: "Çarpım hatalı hesaplanıyor; tip dönüşümünü kontrol et.",
        gradedAt: dayAt(-2, 10),
        gradedById: instructor!.id,
        // puan girildi ama henüz yayınlanmadı
      },
      {
        assignmentId: odev2!.id,
        studentId: s1.id,
        url: drive("kodbox-demo-odev2-s1"),
        submittedAt: new Date(now.getTime() - 2 * HOUR),
      },
      {
        assignmentId: problem1!.id,
        studentId: s2.id,
        url: drive("kodbox-demo-problem1-s2-v2"),
        submittedAt: new Date(now.getTime() - 3 * HOUR),
        isLate: true,
      },
    ])
    .returning();

  const lateSub = subs.find((s) => s.assignmentId === problem1!.id)!;
  await db.insert(submissionHistory).values([
    ...subs
      .filter((s) => s.id !== lateSub.id)
      .map((s) => ({ submissionId: s.id, url: s.url, submittedAt: s.submittedAt, isLate: s.isLate })),
    // Geç teslim edilen problem setinin iki sürümü
    { submissionId: lateSub.id, url: drive("kodbox-demo-problem1-s2-v1"), submittedAt: new Date(now.getTime() - 9 * HOUR), isLate: true },
    { submissionId: lateSub.id, url: lateSub.url, submittedAt: lateSub.submittedAt, isLate: true },
  ]);

  /* ─────────────── Bildirimler (öğrenci 1) ─────────────── */
  await db.insert(notifications).values([
    {
      userId: s1.id,
      type: "course.enrolled",
      payload: { courseId: bil!.id, courseCode: bil!.code, courseName: bil!.name },
      readAt: new Date(now.getTime() - 10 * DAY),
      createdAt: new Date(now.getTime() - 12 * DAY),
    },
    {
      userId: s1.id,
      type: "submission.score_published",
      payload: { courseId: bil!.id, courseCode: bil!.code, assignmentId: odev1!.id, title: odev1!.title },
      createdAt: dayAt(-2, 10),
    },
    {
      userId: s1.id,
      type: "assignment.published",
      payload: {
        courseId: bil!.id,
        courseCode: bil!.code,
        assignmentId: odev3!.id,
        title: odev3!.title,
        dueAt: odev3!.dueAt?.toISOString() ?? null,
      },
      createdAt: dayAt(-1, 9),
    },
  ]);

  console.info(
    [
      "",
      "✓ Demo verisi oluşturuldu (şifre hepsinde: " + DEMO_PASSWORD + ")",
      `  Eğitmen : ${instructorEmail}  (${DEMO_INSTRUCTOR.displayName})`,
      ...DEMO_STUDENTS.map((no) => `  Öğrenci : ${studentEmail(no, school)}`),
      `  Dersler : BİL101 Programlamaya Giriş · MAT201 Lineer Cebir (${term.name})`,
      `  Kayıt olmamış numara: ${UNREGISTERED_STUDENT} (BİL101 listesinde)`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error("✗ Demo seed başarısız:", error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end({ timeout: 5 }));
