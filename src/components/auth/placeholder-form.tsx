"use client";

/** Non-submitting form shell for F0 placeholder screens; real actions arrive in F1. */
export function PlaceholderForm({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <form
      noValidate
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
