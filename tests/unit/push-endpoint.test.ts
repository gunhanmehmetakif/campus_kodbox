import { describe, expect, it } from "vitest";

import { isAllowedPushEndpoint } from "@/lib/push-endpoint";

describe("isAllowedPushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/abc",
    "https://android.googleapis.com/gcm/send/abc",
    "https://updates.push.services.mozilla.com/wpush/v2/abc",
    "https://web.push.apple.com/abc",
    "https://eu.push.services.mozilla.com/abc",
    "https://api.push.apple.com/3/device/abc",
    "https://wns2-par02p.notify.windows.com/w/?token=abc",
    "https://FCM.googleapis.com:443/x",
  ])("allows %s", (url) => expect(isAllowedPushEndpoint(url)).toBe(true));

  it.each([
    "http://fcm.googleapis.com/x",
    "https://fcm.googleapis.com.evil.com/x",
    "https://evilpush.apple.com/x",
    "https://push.apple.com/x",
    "https://evil.com/fcm.googleapis.com",
    "https://user@fcm.googleapis.com/x",
    "https://user:pw@fcm.googleapis.com/x",
    "https://fcm.googleapis.com:8443/x",
    "https://127.0.0.1/x",
    "https://localhost/x",
    "https://notify.windows.com.evil.com/x",
    "not a url",
    "",
  ])("rejects %s", (url) => expect(isAllowedPushEndpoint(url)).toBe(false));
});
