import type { Metadata } from "next";
import { Suspense } from "react";

import { SchoolForm } from "@/components/admin/school-form";
import { PageHeader } from "@/components/common/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getSchoolSettings } from "@/server/admin/queries";

export const metadata: Metadata = { title: "Okullar" };

async function SchoolContent() {
  const school = await getSchoolSettings();
  return <SchoolForm school={school} />;
}

export default function AdminSchoolsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Okul ayarları" description="Okul adı ve öğrenci numarası kuralı." />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <SchoolContent />
      </Suspense>
    </div>
  );
}
