"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Returns the current value and a setter that updates one query parameter, resets `?sayfa=` and navigates softly. */
function useQueryParam(name: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = searchParams.get(name) ?? "";

  function set(value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    params.delete("sayfa");
    const query = params.toString();
    startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }));
  }

  return { current, set, pending };
}

type SearchBoxProps = {
  param: string;
  label: string;
  placeholder?: string;
  inputMode?: "text" | "numeric";
  className?: string;
};

export function SearchBox({ param, label, placeholder, inputMode, className }: SearchBoxProps) {
  const { current, set, pending } = useQueryParam(param);
  const id = useId();

  return (
    <form
      key={current}
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get(param);
        set(typeof value === "string" ? value.trim() : null);
      }}
    >
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id={id}
          name={param}
          type="search"
          defaultValue={current}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete="off"
          className="h-11 flex-1 md:h-9"
        />
        <Button type="submit" variant="outline" className="h-11 md:h-9" disabled={pending}>
          <Search aria-hidden="true" />
          Ara
        </Button>
      </div>
    </form>
  );
}

type FilterSelectProps = {
  param: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  /** Label of the "no filter" option (selecting it removes the parameter). */
  allLabel?: string;
  /** Value shown when the parameter is absent and there is no "all" option. */
  fallbackValue?: string;
  className?: string;
};

const ALL = "__all__";

export function FilterSelect({ param, label, options, allLabel, fallbackValue, className }: FilterSelectProps) {
  const { current, set, pending } = useQueryParam(param);
  const value = current || (allLabel ? ALL : (fallbackValue ?? options[0]?.value ?? ""));

  return (
    <Select value={value} onValueChange={(next) => set(next === ALL ? null : next)} disabled={pending}>
      <SelectTrigger aria-label={label} className={className ?? "h-11 w-full sm:w-52 md:h-9"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allLabel ? <SelectItem value={ALL}>{allLabel}</SelectItem> : null}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterCheckbox({ param, label }: { param: string; label: string }) {
  const { current, set, pending } = useQueryParam(param);
  const id = useId();

  return (
    <div className="flex min-h-11 items-center gap-2 md:min-h-9">
      <Checkbox id={id} checked={current === "1"} disabled={pending} onCheckedChange={(c) => set(c === true ? "1" : null)} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
    </div>
  );
}
