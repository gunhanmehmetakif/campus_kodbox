import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Single database connection pool for the whole app. The client is kept on `globalThis` so
 * HMR in development does not open a new pool on every module reload.
 */
type Db = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };

const globalForDb = globalThis as unknown as { __kodboxDb?: Db };

function createDb(): Db {
  const client = postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // All timestamps are read and written as UTC.
    connection: { TimeZone: "UTC", application_name: "kodbox-campus" },
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

function getDb(): Db {
  globalForDb.__kodboxDb ??= createDb();
  return globalForDb.__kodboxDb;
}

/**
 * Drizzle client. Connects on first use (no DB needed at build time).
 * @example const rows = await db.select().from(users)
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver === db ? real : receiver);
    // $client (postgres.Sql) is a function with own properties; binding would lose .end() etc.
    if (prop === "$client") return value;
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Database = Db;
/** Type of `tx` inside `db.transaction(async (tx) => ...)`. */
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** For helpers that accept either `db` or `tx`. */
export type DbOrTx = Db | Transaction;

export { schema };
