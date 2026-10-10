import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Pagination } from "@/components/common/pagination";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationList } from "@/components/notifications/notification-list";
import { PushToggleCard } from "@/components/notifications/push-toggle-card";
import { getCurrentUser } from "@/lib/auth";
import { getMyUnreadCount, getPushConfig, listMyNotifications } from "@/server/notifications/queries";

export const metadata: Metadata = { title: "Bildirimler" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function NotificationsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = parsePage(params.sayfa);
  const [user, list, unread, push] = await Promise.all([
    getCurrentUser(),
    listMyNotifications({ page }),
    getMyUnreadCount(),
    getPushConfig(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="Bildirimler"
        description="Duyuru, ödev ve puan bildirimleriniz."
        actions={unread > 0 ? <MarkAllReadButton /> : null}
      />
      {user?.role === "student" ? <PushToggleCard publicKey={push.publicKey} compact /> : null}
      {list.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Henüz bildiriminiz yok"
          description="Yeni bir gelişme olduğunda burada göreceksiniz."
        />
      ) : (
        <>
          <NotificationList items={list.items} />
          <Pagination page={list.page} pageSize={list.pageSize} total={list.total} />
        </>
      )}
    </div>
  );
}
