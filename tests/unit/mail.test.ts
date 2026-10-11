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

describe("sendMail SMTP transport", () => {
  const sendMailMock = vi.fn();
  const resendSend = vi.fn();
  const input = { to: "ogrenci@ogr.mku.edu.tr", subject: "Doğrulama", html: "<p>link</p>", text: "link" };

  beforeEach(() => {
    vi.resetModules();
    sendMailMock.mockReset();
    resendSend.mockReset();
    vi.doMock("nodemailer", () => {
      const createTransport = () => ({ sendMail: sendMailMock });
      return { default: { createTransport }, createTransport };
    });
    vi.doMock("resend", () => ({
      Resend: class {
        emails = { send: resendSend };
      },
    }));
    vi.stubEnv("SMTP_HOST", "smtp.example.test");
    vi.stubEnv("SMTP_USER", "user@example.test");
    vi.stubEnv("SMTP_PASS", "secret-pass");
    vi.stubEnv("MAIL_FROM", "Kodbox <no-reply@example.test>");
    vi.spyOn(console, "error").mockImplementation(() => {});
    __resetEnvCacheForTests();
  });

  afterEach(() => {
    vi.doUnmock("nodemailer");
    vi.doUnmock("resend");
    vi.unstubAllEnvs();
    __resetEnvCacheForTests();
  });

  it("sends through the SMTP transporter", async () => {
    sendMailMock.mockResolvedValue({ messageId: "<abc@example.test>" });
    const { sendMail } = await import("@/lib/server/mail");

    const result = await sendMail(input);

    expect(result).toEqual({ ok: true, id: "<abc@example.test>" });
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "Kodbox <no-reply@example.test>",
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
  });

  it("returns ok:false when SMTP sending throws", async () => {
    sendMailMock.mockRejectedValue(Object.assign(new Error("connection refused"), { code: "ECONNECTION" }));
    const { sendMail } = await import("@/lib/server/mail");

    const result = await sendMail(input);

    expect(result).toEqual({ ok: false, error: "Mail gönderilemedi." });
  });

  it("prefers SMTP over Resend when both are configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    __resetEnvCacheForTests();
    sendMailMock.mockResolvedValue({ messageId: "<id>" });
    const { sendMail } = await import("@/lib/server/mail");

    await sendMail(input);

    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(resendSend).not.toHaveBeenCalled();
  });
});
