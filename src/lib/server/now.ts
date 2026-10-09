import "server-only";

import { connection } from "next/server";
import { cache } from "react";

/**
 * Request time (ms): the single way to get "now" in server components.
 *
 * `connection()` ties rendering to request time (Date.now() during Cache Components prerender
 * is a build error). React `cache` makes every component in a request see the same instant.
 *
 *   const now = await getRequestNow();
 */
export const getRequestNow = cache(async (): Promise<number> => {
  await connection();
  return Date.now();
});
