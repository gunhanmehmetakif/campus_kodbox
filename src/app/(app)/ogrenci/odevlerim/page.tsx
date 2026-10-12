import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Suspense } from "react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PageSkeleton } from "@/components/common/page-skeleton";
import { AssignmentGroups } from "@/components/student/assignment-groups";
import { listMyAssignments } from "@/server/student/queries";

export const metadata: Metadata = { title: "Ödevlerim" };

export default function MyAssignmentsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="list" />}>
      <MyAssignments />
    </Suspense>
  );
}

async function MyAssignments() {
  const items = await listMyAssignments();
  return (
    <div className="space-y-5">
      <PageHeader title="Ödevlerim" />
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Ödeviniz yok"
          description="Derslerinizde ödev yayınlandığında burada listelenir."
        />
      ) : (
        <AssignmentGroups items={items} showCourse />
      )}
    </div>
  );
}
