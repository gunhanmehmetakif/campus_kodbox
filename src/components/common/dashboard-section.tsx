type DashboardSectionProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardSection({ title, children }: DashboardSectionProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
