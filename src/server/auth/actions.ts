"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { after } from "next/server";

import { fail, failFromZod, failUnexpected, ok, type ActionResult } from "@/lib/action";
import { getAuthUser, requireUser } from "@/lib/auth";
import { homePathForRole, routes, safeRedirectPath } from "@/lib/routes";
import { audit } from "@/lib/server/audit";
import { formatRetryAfter } from "@/lib/server/rate-limit";
import { getClientIp } from "@/lib/server/request";
import { createSession, invalidateSession } from "@/lib/server/session";
import { TURNSTILE_FIELD, verifyTurnstile } from "@/lib/server/turnstile";

import {
  changePasswordSchema,
  completeRegistrationSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./schemas";
import {
  authenticate,
  changePassword,
  checkLoginIpBudget,
  completeRegistration,
  recordLoginIpFailure,
  requestPasswordReset,
  requestRegistration,
  resetPassword,
  signOutOtherSessions,
  unlinkGoogleAccount,
  type MailRequestOutcome,
} from "./service";

type Prev<T> = ActionResult<T> | null;
type Sent = { sent: true };

const CAPTCHA_ERROR = "Robot doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.";
const LOGIN_ERROR = "Mail adresi veya şifre hatalı.";

function formToObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

function tooManyRequests(retryAfter: number) {
  return fail(`Çok fazla istek. Lütfen ${formatRetryAfter(retryAfter)} sonra tekrar deneyin.`);
}

function lockedError(retryAfter: number) {
  return fail(`Çok fazla hatalı deneme. ${formatRetryAfter(retryAfter)} sonra tekrar deneyin.`);
}

const COMMON_PASSWORD_MESSAGE = "Bu şifre çok yaygın, başka bir şifre seçin.";

function tokenError(reason: "invalid" | "expired" | "used" | "common_password") {
  switch (reason) {
    case "common_password":
      return fail(COMMON_PASSWORD_MESSAGE, { password: [COMMON_PASSWORD_MESSAGE] });
    case "expired":
      return fail("Bu bağlantının süresi dolmuş. Yeni bir bağlantı isteyin.");
    case "used":
      return fail("Bu bağlantı daha önce kullanılmış. Yeni bir bağlantı isteyin.");
    default:
      return fail("Bu bağlantı geçersiz. Yeni bir bağlantı isteyin.");
  }
}

function mailOutcomeToResult(outcome: MailRequestOutcome): ActionResult<Sent> {
  switch (outcome.status) {
    case "sent":
      return ok({ sent: true });
    case "ip_limited":
      return tooManyRequests(outcome.retryAfter);
    case "cooldown":
      return fail(`Yeni mail için ${Math.ceil(outcome.retryAfter)} sn bekleyin.`);
    case "invalid_input":
      // Form-level on purpose: the captcha token is already spent here, so the widget must reset.
      return fail("Geçerli bir öğrenci numarası girin.");
  }
}

/* ───────────────────────────── login / logout ───────────────────────────── */

export async function loginAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  let target: string;
  try {
    const parsed = loginSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);

    // Only failures count against the IP budget (campus NAT shares one IP); successes are free.
    const ip = await getClientIp();
    const ipBudget = await checkLoginIpBudget(ip);
    if (ipBudget.limited) return tooManyRequests(ipBudget.retryAfter);
    if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip)).ok) {
      await recordLoginIpFailure(ip);
      return fail(CAPTCHA_ERROR);
    }

    const result = await authenticate({
      kind: parsed.data.kind,
      local: parsed.data.local,
      password: parsed.data.password,
    });
    if (!result.ok) {
      if (result.reason === "locked") return lockedError(result.retryAfter);
      await recordLoginIpFailure(ip);
      return fail(result.attemptsLeft ? `${LOGIN_ERROR} ${result.attemptsLeft} deneme hakkınız kaldı.` : LOGIN_ERROR);
    }

    await createSession(result.userId, { remember: parsed.data.remember === "on" });
    target = result.mustChangePassword
      ? routes.changePassword
      : safeRedirectPath(parsed.data.next, homePathForRole(result.role));
  } catch (error) {
    return failUnexpected(error);
  }
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  const user = await getAuthUser();
  if (user) await audit(user.id, "auth.logout", { type: "user", id: user.id });
  await invalidateSession();
  redirect(routes.login);
}

/* ───────────────────────────── register ───────────────────────────── */

async function registrationRequest(formData: FormData, cooldown: boolean): Promise<ActionResult<Sent>> {
  try {
    const parsed = registerSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);

    const ip = await getClientIp();
    if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip)).ok) return fail(CAPTCHA_ERROR);

    const outcome = await requestRegistration(
      { local: parsed.data.local, ip, cooldown },
      { defer: (task) => after(task) },
    );
    return mailOutcomeToResult(outcome);
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function registerAction(_prev: Prev<Sent>, formData: FormData): Promise<ActionResult<Sent>> {
  return registrationRequest(formData, false);
}

export async function resendVerificationAction(_prev: Prev<Sent>, formData: FormData): Promise<ActionResult<Sent>> {
  return registrationRequest(formData, true);
}

export async function completeRegistrationAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  try {
    const parsed = completeRegistrationSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);

    const result = await completeRegistration({ token: parsed.data.token, password: parsed.data.password });
    if (!result.ok) return tokenError(result.reason);

    await createSession(result.userId, { remember: true });
  } catch (error) {
    return failUnexpected(error);
  }
  redirect(`${routes.account}?hosgeldin=1`);
}

/* ───────────────────────────── password ───────────────────────────── */

export async function forgotPasswordAction(_prev: Prev<Sent>, formData: FormData): Promise<ActionResult<Sent>> {
  try {
    const parsed = forgotPasswordSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);

    const ip = await getClientIp();
    if (!(await verifyTurnstile(formData.get(TURNSTILE_FIELD), ip)).ok) return fail(CAPTCHA_ERROR);

    const outcome = await requestPasswordReset(
      { kind: parsed.data.kind, local: parsed.data.local, ip },
      { defer: (task) => after(task) },
    );
    return outcome.status === "ip_limited" ? tooManyRequests(outcome.retryAfter) : ok({ sent: true });
  } catch (error) {
    return failUnexpected(error);
  }
}

export async function resetPasswordAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  let target: string;
  try {
    const parsed = resetPasswordSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);

    const result = await resetPassword({ token: parsed.data.token, password: parsed.data.password });
    if (!result.ok) return tokenError(result.reason);

    await createSession(result.userId, { remember: true });
    target = homePathForRole(result.role);
  } catch (error) {
    return failUnexpected(error);
  }
  redirect(target);
}

export async function changePasswordAction(_prev: Prev<void>, formData: FormData): Promise<ActionResult<void>> {
  let target: string;
  try {
    // A user who must change the password is allowed in here (and only here).
    const user = await requireUser({ allowPendingPasswordChange: true });
    const parsed = changePasswordSchema.safeParse(formToObject(formData));
    if (!parsed.success) return failFromZod(parsed.error);

    const result = await changePassword({
      userId: user.id,
      sessionId: user.sessionId,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.password,
    });
    if (!result.ok) {
      switch (result.reason) {
        case "wrong_current":
          return fail("Mevcut şifre hatalı.", { currentPassword: ["Mevcut şifre hatalı."] });
        case "same_password":
          return fail("Yeni şifre eskisiyle aynı olamaz.", { password: ["Yeni şifre eskisiyle aynı olamaz."] });
        case "common_password":
          return fail(COMMON_PASSWORD_MESSAGE, { password: [COMMON_PASSWORD_MESSAGE] });
        case "locked":
          return lockedError(result.retryAfter);
        default:
          return fail("Şifre değiştirilemedi. Lütfen tekrar giriş yapın.");
      }
    }
    target = homePathForRole(result.role);
  } catch (error) {
    unstable_rethrow(error);
    return failUnexpected(error);
  }
  redirect(target);
}

/* ───────────────────────────── account ───────────────────────────── */

export async function unlinkGoogleAction(): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();
    await unlinkGoogleAccount(user.id);
    revalidatePath(routes.account);
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    return failUnexpected(error);
  }
}

export async function signOutOtherSessionsAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireUser();
    const count = await signOutOtherSessions(user.id, user.sessionId);
    revalidatePath(routes.account);
    return ok({ count });
  } catch (error) {
    unstable_rethrow(error);
    return failUnexpected(error);
  }
}
