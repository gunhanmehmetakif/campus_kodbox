import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

/** Standard card body for every auth screen. */
export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <Card className="w-full gap-5 py-6 shadow-sm [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(6)]">
      <CardHeader>
        <CardTitle className="text-xl sm:text-2xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
