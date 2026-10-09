import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

type PlaceholderPageProps = {
  title: string;
  description?: string;
  emptyTitle: string;
  emptyDescription?: string;
  icon?: LucideIcon;
};

/** F0 stand-in for screens built in later phases: header plus an empty state. */
export function PlaceholderPage({ title, description, emptyTitle, emptyDescription, icon }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <EmptyState title={emptyTitle} description={emptyDescription} icon={icon} />
    </div>
  );
}
