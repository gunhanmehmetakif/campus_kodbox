"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const MAX_HEIGHT = 600;

/** Collapses tall content to 600px with a "show more" toggle; short content renders untouched. */
export function CollapsibleBody({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > MAX_HEIGHT);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const collapsed = overflowing && !open;

  return (
    <div>
      <div ref={ref} className="relative overflow-hidden" style={collapsed ? { maxHeight: MAX_HEIGHT } : undefined}>
        {children}
        {collapsed ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent"
          />
        ) : null}
      </div>
      {overflowing ? (
        <Button
          type="button"
          variant="ghost"
          className="mt-2 h-11 px-3 text-primary"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown className={open ? "rotate-180" : undefined} aria-hidden="true" />
          {open ? "Daha az göster" : "Devamını göster"}
        </Button>
      ) : null}
    </div>
  );
}
