import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

import * as schema from "./schema";

/**
 * Uygulama genelinde tek veritabanı bağlantı havuzu.
 *
 * Geliştirmede (HMR) modül her yeniden yüklendiğinde yeni havuz açılmasın diye
 * istemci `globalThis` üzerinde saklanır.
 */
type Db = PostgresJsDatabase<typeof schema> & { $client: postgres.Sql };

const globalForDb = globalThis as unknown as { __kodboxDb?: Db };

function createDb(): Db {
  const client = postgres(env.DATABASE_URL, {
    max: env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
    // Tüm zaman damgaları UTC olarak okunur/yazılır.
    connection: { TimeZone: "UTC", application_name: "kodbox" },
    onnotice: () => {},
  });
  return drizzle(client, { schema });
}

function getDb(): Db {
  if (globalForDb.__kodboxDb) return globalForDb.__kodboxDb;
  const instance = createDb();
  globalForDb.__kodboxDb = instance;
  return instance;
}

/**
 * Drizzle istemcisi. İlk erişimde bağlanır (build sırasında DB gerekmez).
 * @example const rows = await db.select().from(users)
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver === db ? real : receiver);
    // $client (postgres.Sql) özellikleri olan bir fonksiyondur; bind edilirse .end() vb. kaybolur.
    if (prop === "$client") return value;
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type Database = Db;
/** `db.transaction(async (tx) => …)` içindeki `tx` tipi. */
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];
/** Hem `db` hem `tx` kabul eden yardımcılar için. */
export type DbOrTx = Db | Transaction;

export { schema };
