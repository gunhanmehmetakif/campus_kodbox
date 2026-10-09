"use client";

import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatRelative, toDate, toIso, type DateInput } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Göreli zaman: "5 dakika önce", "yarın", "3 gün sonra". Dakikada bir kendini günceller.
 * Üzerine gelince tam tarih görünür.
 *
 *   <RelativeTime value={post.publishAt} serverNow={now} />
 *
 * `serverNow`: sunucu bileşeninde hesaplanan Date.now(); verilirse ilk HTML'de de metin
 * doğru görünür. Verilmezse sunucuda mutlak tarih gösterilir, istemcide göreliye döner.
 */
export function RelativeTime({
  value,
  serverNow,
  className,
}: {
  value: DateInput;
  serverNow?: number;
  className?: string;
}) {
  const now = useNow("minute", serverNow);
  const date = toDate(value);
  return (
    <time dateTime={toIso(date)} title={formatDateTime(date)} className={cn(className)}>
      {now === null ? formatDateTime(date) : formatRelative(date, now)}
    </time>
  );
}
