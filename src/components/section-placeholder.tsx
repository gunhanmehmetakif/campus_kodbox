import { ConstructionIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";

/**
 * F0 iskelet sayfalarının ortak gövdesi. İlgili faz sayfayı gerçek içerikle değiştirir
 * (dosyadaki `phase` alanı hangi fazın dolduracağını belgeler).
 */
export function SectionPlaceholder({
  title,
  description,
  phase,
  icon = ConstructionIcon,
  emptyTitle = "Bu bölüm hazırlanıyor",
  emptyDescription,
  children,
}: {
  title: string;
  description?: ReactNode;
  /** Bu ekranı dolduracak geliştirme fazı (PLAN.md §11), örn. "F3". */
  phase: string;
  icon?: LucideIcon;
  emptyTitle?: string;
  emptyDescription?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          <Badge variant="neutral" title={`Geliştirme fazı ${phase}`}>
            Yapım aşamasında · {phase}
          </Badge>
        }
      />
      {children ?? <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />}
    </>
  );
}
