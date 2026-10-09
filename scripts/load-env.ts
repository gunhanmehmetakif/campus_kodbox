/**
 * Loads environment variables for scripts outside Next.js (seed, drizzle-kit) with the same
 * rules as Next.js (.env.local > .env.{mode} > .env). Must be the FIRST import in scripts.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
