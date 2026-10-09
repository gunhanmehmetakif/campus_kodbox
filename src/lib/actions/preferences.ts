"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { fail, ok, type ActionResult } from "@/lib/action-state";
import { getCurrentUser } from "@/lib/server/auth";
import { THEME_CHOICES, type ThemeChoice } from "@/lib/theme";

const themeSchema = z.enum(THEME_CHOICES);

/**
 * Kullanıcının tema tercihini hesabına kaydeder (diğer cihazlarda da uygulanır).
 * Oturum yoksa sessizce başarısız olur; tarayıcıdaki tercih yine de geçerlidir.
 */
export async function updateThemePreference(choice: ThemeChoice): Promise<ActionResult> {
  const parsed = themeSchema.safeParse(choice);
  if (!parsed.success) return fail("Geçersiz tema seçimi.");
  const user = await getCurrentUser();
  if (!user) return fail("Oturum bulunamadı.");
  if (user.theme !== parsed.data) {
    await db.update(users).set({ theme: parsed.data }).where(eq(users.id, user.id));
  }
  return ok();
}
