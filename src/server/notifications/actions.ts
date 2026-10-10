"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";

import { failFromZod, failUnexpected, ok, type ActionResult } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { routes } from "@/lib/routes";
import { getUserAgent } from "@/lib/server/request";

import { deletePushSubscriptionSchema, openNotificationSchema, savePushSubscriptionSchema } from "./schemas";
import { deletePushSubscription, markAllRead, openNotification, savePushSubscription } from "./service";

/**
 * Marks a notification read and redirects to its target. Not the user's own id (or invalid):
 * back to the list. Used as a form `action`.
 */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = openNotificationSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) redirect(routes.notifications);

  let href: string | null = null;
  try {
    href = await openNotification(user.id, parsed.data.id);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[action] unexpected error", error);
  }
  revalidatePath(routes.notifications);
  redirect(href ?? routes.notifications);
}

export async function markAllNotificationsReadAction(): Promise<ActionResult<{ count: number }>> {
  try {
    const user = await requireUser();
    const count = await markAllRead(user.id);
    revalidatePath(routes.notifications);
    return ok({ count });
  } catch (error) {
    unstable_rethrow(error);
    return failUnexpected(error);
  }
}

export async function savePushSubscriptionAction(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();
    const parsed = savePushSubscriptionSchema.safeParse(input);
    if (!parsed.success) return failFromZod(parsed.error, "Bildirim aboneliği kaydedilemedi.");
    await savePushSubscription(user.id, parsed.data, await getUserAgent());
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    return failUnexpected(error);
  }
}

export async function deletePushSubscriptionAction(input: { endpoint: string }): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();
    const parsed = deletePushSubscriptionSchema.safeParse(input);
    if (!parsed.success) return failFromZod(parsed.error, "Bildirim aboneliği silinemedi.");
    await deletePushSubscription(user.id, parsed.data.endpoint);
    return ok();
  } catch (error) {
    unstable_rethrow(error);
    return failUnexpected(error);
  }
}
