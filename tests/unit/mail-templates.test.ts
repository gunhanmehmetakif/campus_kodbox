import { describe, expect, it } from "vitest";

import { existingAccountMail, passwordResetMail, verificationMail } from "@/server/auth/mail-templates";

const URL_RAW = "http://localhost:3000/dogrula?token=abc&next=/x";
const URL_ESCAPED = "http://localhost:3000/dogrula?token=abc&amp;next=/x";

const cases = [
  ["verificationMail", verificationMail],
  ["existingAccountMail", existingAccountMail],
  ["passwordResetMail", passwordResetMail],
] as const;

describe.each(cases)("%s", (_name, build) => {
  const mail = build(URL_RAW);

  it("puts the escaped url in href attributes", () => {
    expect(mail.html).toContain(`href="${URL_ESCAPED}"`);
    expect(mail.html).not.toContain(`href="${URL_RAW}"`);
  });

  it("references the absolute logo url", () => {
    expect(mail.html).toContain('src="http://localhost:3000/icons/mail-logo.png"');
  });

  it("keeps the text version with the raw url", () => {
    expect(mail.text).toContain(URL_RAW);
    expect(mail.text).toContain("Bu isteği siz yapmadıysanız dikkate almayın.");
    expect(mail.text).not.toContain("<");
  });

  it("has the email-client friendly head", () => {
    expect(mail.html).toContain('<meta name="color-scheme" content="light">');
    expect(mail.html).toContain("<title>");
    expect(mail.html).not.toContain("<style");
  });
});
