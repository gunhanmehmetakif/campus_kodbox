import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
      <path
        fill="currentColor"
        d="M12.2 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.9 3.3 14.8 2.4 12.2 2.4 7 2.4 2.8 6.6 2.8 11.9s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6z"
      />
    </svg>
  );
}

/** Visual only in F0 (no handler); Google sign-in is added in F1. */
export function GoogleButton({ label = "Google ile giriş" }: { label?: string }) {
  return (
    <Button type="button" variant="outline" className="h-11 w-full text-sm">
      <GoogleMark />
      {label}
    </Button>
  );
}
