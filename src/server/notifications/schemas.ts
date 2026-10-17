import { z } from "zod";

import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

/**
 * Notification schemas (docs/fazlar/F5-F6-ogrenci-bildirim.md 3.3). Pure module.
 * `openNotificationAction` takes FormData (field `id`); the push actions take typed input
 * (the client sends JSON).
 */

export const PUSH_ENDPOINT_MAX = 1000;
export const PUSH_KEY_MAX = 256;
export const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 10;

export const openNotificationSchema = z.object({
  id: z.string({ error: "Geçersiz kayıt." }).trim().uuid({ error: "Geçersiz kayıt." }),
});

export const savePushSubscriptionSchema = z.object({
  endpoint: z
    .string({ error: "Geçersiz bildirim aboneliği." })
    .trim()
    .max(PUSH_ENDPOINT_MAX, "Geçersiz bildirim aboneliği.")
    .refine(isAllowedPushEndpoint, "Geçersiz bildirim aboneliği."),
  keys: z.object({
    p256dh: z.string({ error: "Geçersiz bildirim aboneliği." }).min(1).max(PUSH_KEY_MAX),
    auth: z.string({ error: "Geçersiz bildirim aboneliği." }).min(1).max(PUSH_KEY_MAX),
  }),
});

export const deletePushSubscriptionSchema = z.object({
  endpoint: z.string({ error: "Geçersiz bildirim aboneliği." }).trim().min(1).max(PUSH_ENDPOINT_MAX),
});

export type SavePushSubscriptionInput = z.infer<typeof savePushSubscriptionSchema>;
export type DeletePushSubscriptionInput = z.infer<typeof deletePushSubscriptionSchema>;
