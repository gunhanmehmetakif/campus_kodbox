import "server-only";

import { connection } from "next/server";
import { cache } from "react";

/**
 * İstek anı (ms) — sunucu bileşenlerinde "şimdi" için TEK yol.
 *
 * - `connection()` ile render'ı istek zamanına bağlar (Cache Components prerender'ında
 *   Date.now() derleme hatası verir; bu yardımcı bunu önler).
 * - React `cache`: aynı istekteki tüm bileşenler AYNI anı görür (tutarlı sayaçlar).
 * - Bileşen gövdesinde doğrudan Date.now() çağırmak react-hooks/purity lint hatasıdır.
 *
 *   const now = await getRequestNow();
 *   <DeadlineRibbon … serverNow={now} />
 */
export const getRequestNow = cache(async (): Promise<number> => {
  await connection();
  return Date.now();
});
