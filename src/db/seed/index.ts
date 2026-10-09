/**
 * npm run db:seed — temel veriler: MKÜ okulu, aktif dönem, ilk admin (ADMIN_EMAIL/ADMIN_PASSWORD).
 * İdempotent. Admin ilk girişte şifresini değiştirmeye zorlanır (must_change_password).
 */
import "../../../scripts/load-env";

import { db } from "@/db";

import { seedBase } from "./base";

async function main() {
  const { school, term, admin } = await seedBase();
  console.info(
    [
      "",
      "✓ Seed tamamlandı",
      `  Okul : ${school.name} (öğrenci @${school.studentEmailDomain} · personel @${school.staffEmailDomain})`,
      `  Dönem: ${term.name} (aktif)`,
      `  Admin: ${admin.email} ${admin.created ? "(oluşturuldu — ilk girişte şifre değiştirilecek)" : "(zaten vardı, değiştirilmedi)"}`,
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error("✗ Seed başarısız:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$client.end({ timeout: 5 }));
