/**
 * Next.js dışındaki betikler (seed, drizzle-kit, vitest) için ortam değişkenlerini
 * Next.js ile AYNI kurallarla yükler (.env.local > .env.{mode} > .env).
 * Betiklerde İLK import olarak kullanılmalıdır.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
