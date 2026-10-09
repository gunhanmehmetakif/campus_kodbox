"use client";

import { CalendarClockIcon, XIcon } from "lucide-react";
import { useId, useState, type ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatDateTime,
  getZonedParts,
  parseDateTimeLocal,
  toDateTimeLocalValue,
  zonedTimeToUtc,
  type DateInput,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Tarih + saat seçici (Europe/Istanbul). Son teslim, geç kabul, ileri tarihli yayın için.
 *
 * Forma `name` ile İSTANBUL DUVAR SAATİ gönderir: "2026-10-12T23:59".
 * Sunucuda: parseDateTimeLocal(formData.get("dueAt")) → UTC Date (src/lib/dates.ts).
 *
 *   <FormField id="dueAt" label="Son teslim">
 *     <DateTimePicker name="dueAt" defaultValue={assignment?.dueAt} />
 *   </FormField>
 */
export type DateTimePickerProps = {
  name: string;
  id?: string;
  defaultValue?: DateInput | null;
  /** Kontrollü kullanım için. */
  value?: Date | null;
  onChange?: (value: Date | null) => void;
  /** Saat boşken varsayılan (son teslimler için 23:59 mantıklı). */
  defaultTime?: string;
  /** Hızlı seçenekleri göster (Bugün, Yarın, 1 hafta sonra). */
  presets?: boolean;
  /** Bu tarihten önceki günler seçilemez. */
  minDate?: Date;
  allowClear?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
} & Pick<ComponentProps<"button">, "aria-invalid" | "aria-describedby" | "aria-required">;

function combine(day: { year: number; month: number; day: number }, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  return zonedTimeToUtc({ ...day, hour: h ?? 23, minute: m ?? 59 });
}

export function DateTimePicker({
  name,
  id,
  defaultValue,
  value: controlled,
  onChange,
  defaultTime = "23:59",
  presets = true,
  minDate,
  allowClear = true,
  placeholder = "Tarih ve saat seç",
  disabled,
  className,
  ...aria
}: DateTimePickerProps) {
  const [inner, setInner] = useState<Date | null>(() => (defaultValue ? new Date(defaultValue) : null));
  const value = controlled !== undefined ? controlled : inner;
  const [open, setOpen] = useState(false);
  const timeId = useId();

  function set(next: Date | null) {
    setInner(next);
    onChange?.(next);
  }

  const time = value ? toDateTimeLocalValue(value).slice(11, 16) : defaultTime;

  function selectDay(day: Date | undefined) {
    if (!day) return;
    const p = getZonedParts(day);
    set(combine({ year: p.year, month: p.month, day: p.day }, time));
  }

  function changeTime(next: string) {
    if (!/^\d{2}:\d{2}$/.test(next)) return;
    const base = value ?? new Date();
    const p = getZonedParts(base);
    set(combine({ year: p.year, month: p.month, day: p.day }, next));
  }

  function preset(daysFromToday: number) {
    const today = getZonedParts(new Date());
    const target = parseDateTimeLocal(
      `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}T${defaultTime}`,
    );
    if (!target) return;
    set(new Date(target.getTime() + daysFromToday * 86_400_000));
  }

  return (
    <div className={cn("flex w-full items-center gap-1.5", className)}>
      <input type="hidden" name={name} value={value ? toDateTimeLocalValue(value) : ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              "h-9 flex-1 justify-start gap-2 border-input px-3 font-normal aria-invalid:border-destructive",
              !value && "text-muted-foreground",
            )}
            {...aria}
          >
            <CalendarClockIcon className="text-ink-soft" aria-hidden />
            {value ? <span className="font-mono tabular-nums">{formatDateTime(value)}</span> : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto gap-0 p-0">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={selectDay}
            defaultMonth={value ?? undefined}
            disabled={minDate ? { before: minDate } : undefined}
            autoFocus
          />
          <div className="flex items-end gap-2 border-t border-line p-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={timeId}>Saat</Label>
              <Input
                id={timeId}
                type="time"
                step={60}
                value={time}
                onChange={(e) => changeTime(e.target.value)}
                className="font-mono tabular-nums"
              />
            </div>
            <Button type="button" size="sm" className="h-9" onClick={() => setOpen(false)}>
              Tamam
            </Button>
          </div>
          {presets ? (
            <div className="flex flex-wrap gap-1.5 border-t border-line p-3">
              <Button type="button" size="xs" variant="outline" onClick={() => preset(0)}>
                Bugün {defaultTime}
              </Button>
              <Button type="button" size="xs" variant="outline" onClick={() => preset(1)}>
                Yarın {defaultTime}
              </Button>
              <Button type="button" size="xs" variant="outline" onClick={() => preset(7)}>
                1 hafta sonra
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
      {allowClear && value && !disabled ? (
        <Button type="button" variant="ghost" size="icon" onClick={() => set(null)} aria-label="Tarihi temizle">
          <XIcon />
        </Button>
      ) : null}
    </div>
  );
}
