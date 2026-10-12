"use client";

import { Bus, Bed, Ticket, Utensils } from "lucide-react";
import { Card } from "@/components/ui/card";
import { breakdown } from "@/lib/budget";
import { useCountUp, useMounted } from "@/lib/use-motion";
import type { ItemDTO } from "@/lib/schema";

const PARTS = [
  { key: "food", label: "Food", icon: Utensils, bar: "bg-emerald-500" },
  { key: "transport", label: "Transport", icon: Bus, bar: "bg-sky-500" },
  { key: "activities", label: "Activities", icon: Ticket, bar: "bg-amber-500" },
  { key: "lodging", label: "Lodging", icon: Bed, bar: "bg-violet-500" },
] as const;

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** A number that counts up/down smoothly whenever `value` changes. */
function Num({ value }: { value: number }) {
  return <>{usd(useCountUp(value))}</>;
}

/** Per-person cost split for a set of stops (one day, or the whole trip). Bars and numbers animate between values. */
export function BudgetBreakdown({ items, title }: { items: ItemDTO[]; title: string }) {
  const b = breakdown(items);
  const mounted = useMounted();

  return (
    <Card className="p-4" aria-label={title}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{title}</span>
        <span className="font-semibold">
          ~<Num value={b.total} /> pp
        </span>
      </div>
      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label="Cost split">
        {PARTS.map((p) => (
          <span
            key={p.key}
            className={`${p.bar} h-full transition-[width] duration-700 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none`}
            style={{ width: mounted && b.total > 0 ? `${(b[p.key] / b.total) * 100}%` : "0%" }}
          />
        ))}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
        {PARTS.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${p.bar}`} aria-hidden />
            <dt className="text-muted-foreground">{p.label}</dt>
            <dd className="ml-auto font-medium tabular-nums sm:ml-1">
              <Num value={b[p.key]} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-muted-foreground">AI estimates in USD per person, not live prices.</p>
    </Card>
  );
}
