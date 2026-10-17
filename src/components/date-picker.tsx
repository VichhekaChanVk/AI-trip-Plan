"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseIso(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatDisplay(iso: string): string {
  const d = parseIso(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface DatePickerProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  disabled?: boolean;
}

export function DatePicker({ id, value, onChange, min, disabled }: DatePickerProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selected = parseIso(value);
  const minDate = min ? parseIso(min) : null;

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? today.getMonth());

  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      setViewYear(selected.getFullYear());
      setViewMonth(selected.getMonth());
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function isDaySelected(day: number) {
    return (
      !!selected &&
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  }
  function isDayToday(day: number) {
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  }
  function isDayDisabled(day: number) {
    if (!minDate) return false;
    return new Date(viewYear, viewMonth, day) < minDate;
  }

  function selectDay(day: number) {
    if (isDayDisabled(day)) return;
    onChange(toIso(new Date(viewYear, viewMonth, day)));
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* Trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm",
          "transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open ? "border-ring ring-2 ring-ring" : "hover:border-muted-foreground/40",
          !value && "text-muted-foreground",
        )}
      >
        <CalendarDays
          className={cn(
            "h-4 w-4 shrink-0 transition-colors",
            open ? "text-accent" : "text-muted-foreground group-hover:text-foreground",
          )}
          aria-hidden
        />
        <span className="flex-1 text-left">
          {value ? formatDisplay(value) : "Pick a date"}
        </span>
        {value && (
          <span className="text-xs text-muted-foreground">
            {new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "short" })}
          </span>
        )}
      </button>

      {/* Calendar popover */}
      {open && (
        <div
          role="dialog"
          aria-label="Date picker"
          className={cn(
            "animate-fade-in absolute left-0 top-[calc(100%+8px)] z-50 w-[280px] overflow-hidden",
            "rounded-2xl border border-border bg-card shadow-2xl",
          )}
        >
          {/* Accent bar */}
          <div className="h-0.5 w-full bg-accent" />

          {/* Month navigation */}
          <div className="flex items-center gap-1 px-4 pt-4 pb-2">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <p className="flex-1 text-center text-sm font-semibold tracking-tight">
              {MONTH_NAMES[viewMonth]}{" "}
              <span className="font-normal text-muted-foreground">{viewYear}</span>
            </p>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 px-3">
            {DAY_LABELS.map((d) => (
              <div
                key={d}
                className="flex h-7 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-y-1 px-3 pb-4">
            {cells.map((day, i) =>
              day === null ? (
                <div key={`pad-${i}`} />
              ) : (
                <div key={day} className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    disabled={isDayDisabled(day)}
                    aria-label={`${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
                    aria-pressed={isDaySelected(day)}
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all duration-100",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                      "disabled:pointer-events-none disabled:opacity-25",
                      isDaySelected(day) &&
                        "bg-accent text-accent-foreground font-semibold shadow-sm",
                      !isDaySelected(day) &&
                        "hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {day}
                    {/* Today dot */}
                    {isDayToday(day) && !isDaySelected(day) && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-accent" />
                    )}
                  </button>
                </div>
              ),
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
              }}
              className="text-xs font-medium text-accent transition-opacity hover:opacity-70 focus-visible:outline-none"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
