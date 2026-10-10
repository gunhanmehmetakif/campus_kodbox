import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { __resetEnvCacheForTests } from "@/lib/env";

describe("sendMail production guard", () => {
  let workDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    workDir = await mkdtemp(path.join(os.tmpdir(), "kodbox-mail-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(workDir);
    vi.resetModules();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    __resetEnvCacheForTests();
    cwdSpy.mockRestore();
    await rm(workDir, { recursive: true, force: true });
  });

  const input = { to: "ogrenci@ogr.mku.edu.tr", subject: "Doğrulama", html: "<p>link</p>", text: "link" };

  it("does not write a dev mail file and fails when RESEND_API_KEY is missing in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RESEND_API_KEY", "");
    __resetEnvCacheForTests();
    const { sendMail } = await import("@/lib/server/mail");

    const result = await sendMail(input);

    expect(result.ok).toBe(false);
    expect(await readdir(workDir)).toEqual([]);
  });

  it("writes the mail to .dev-mail outside production", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    __resetEnvCacheForTests();
    const { sendMail } = await import("@/lib/server/mail");

    const result = await sendMail(input);

    expect(result).toEqual({ ok: true, id: null });
    expect(await readdir(path.join(workDir, ".dev-mail"))).toHaveLength(1);
  });
});
