import { Archive, ArchiveRestore } from "lucide-react";

import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { Button } from "@/components/ui/button";
import { setCourseArchivedAction } from "@/server/courses/actions";

export function ArchiveButton({ courseId, archived }: { courseId: string; archived: boolean }) {
  return (
    <ConfirmDialog
      trigger={
        <Button type="button" variant="outline" className="h-11">
          {archived ? <ArchiveRestore aria-hidden="true" /> : <Archive aria-hidden="true" />}
          {archived ? "Arşivden çıkar" : "Arşivle"}
        </Button>
      }
      title={archived ? "Dersi arşivden çıkar" : "Dersi arşivle"}
      description={
        archived
          ? "Ders tekrar düzenlenebilir hale gelir ve aktif dersler arasında görünür."
          : "Arşivlenen ders salt okunur olur; öğrenci, duyuru ve materyal değiştirilemez. İstediğiniz zaman arşivden çıkarabilirsiniz."
      }
      confirmLabel={archived ? "Arşivden çıkar" : "Arşivle"}
      successMessage={archived ? "Ders arşivden çıkarıldı." : "Ders arşivlendi."}
      action={setCourseArchivedAction}
      hiddenFields={{ id: courseId, archived: archived ? "false" : "true" }}
    />
  );
}
