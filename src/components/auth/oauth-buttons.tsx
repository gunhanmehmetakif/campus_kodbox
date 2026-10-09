import { Button } from "@/components/ui/button";

/**
 * "Google ile giriş" / "Apple ile giriş" butonları (PLAN.md §2.1).
 * Bağlantılar F1'in Route Handler'larına gider: /giris/google, /giris/apple.
 * Marka logoları marka yönergeleri gereği orijinal renklerindedir (DESIGN.md token kuralının tek istisnası).
 */
export function OAuthButtons({ google, apple }: { google: boolean; apple: boolean }) {
  if (!google && !apple) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {google ? (
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href="/giris/google">
            <GoogleMark />
            Google ile giriş yap
          </a>
        </Button>
      ) : null}
      {apple ? (
        <Button asChild variant="outline" size="lg" className="w-full">
          <a href="/giris/apple">
            <AppleMark />
            Apple ile giriş yap
          </a>
        </Button>
      ) : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill="currentColor">
      <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76a4.25 4.25 0 0 0-3.59 2.18c-1.54 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.32-3.5Zm-2.17-6.46c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.07 1.96-.49 2.56-1.22Z" />
    </svg>
  );
}
