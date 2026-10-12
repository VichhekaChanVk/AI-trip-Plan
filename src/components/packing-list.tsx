"use client";

import { useState } from "react";
import { Backpack, ChevronDown, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PackingList as PackingListData } from "@/lib/schema";

export function PackingList({
  tripId,
  initial,
  isOwner,
}: {
  tripId: string;
  initial: PackingListData | null;
  isOwner: boolean;
}) {
  const [list, setList] = useState<PackingListData | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(true);

  async function generate(refresh: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Couldn't generate the packing list.");
      setList(json as PackingListData);
      setChecked(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't generate the packing list.");
    } finally {
      setBusy(false);
    }
  }

  const toggle = (key: string) =>
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const total = list?.categories.reduce((n, c) => n + c.items.length, 0) ?? 0;
  const pct = total ? (checked.size / total) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="packing-body"
          className="flex cursor-pointer items-center gap-2 rounded-md text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Backpack className="h-4 w-4" aria-hidden /> Packing list
          {list && (
            <span className="text-xs font-normal text-muted-foreground">
              {checked.size}/{total} packed
            </span>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={() => generate(Boolean(list))} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : list ? <RefreshCw className="h-3.5 w-3.5" aria-hidden /> : null}
            {busy ? "Working…" : list ? "Regenerate" : "Generate packing list"}
          </Button>
        )}
      </div>

      {list && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={checked.size} aria-label="Items packed">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div id="packing-body" className={cn("wf-collapse", open && "is-open")}>
        <div>
          {!list && !busy && (
            <p className="mt-2 text-sm text-muted-foreground">
              {isOwner
                ? "Built from your destination, season, forecast, activities and needs."
                : "The trip owner hasn't generated a packing list yet."}
            </p>
          )}
          {busy && (
            <div className="mt-3 space-y-2" aria-hidden>
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {error && (
            <p role="alert" className="animate-fade-in mt-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {list && !busy && (
            <div className="mt-3 space-y-4">
              {list.categories.map((c, ci) => (
                <section key={c.name} className="animate-fade-up" style={{ "--i": ci } as React.CSSProperties}>
                  <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.name}</h3>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {c.items.map((it) => {
                      const key = `${c.name}:${it.item}`;
                      const on = checked.has(key);
                      return (
                        <li key={key}>
                          <label className="flex cursor-pointer items-start gap-2 text-sm">
                            <input type="checkbox" className="mt-1 accent-emerald-600" checked={on} onChange={() => toggle(key)} />
                            <span className={cn("transition-colors duration-300", on ? "text-muted-foreground line-through" : "")}>
                              {it.item}
                              {it.note && <span className="block text-xs text-muted-foreground">{it.note}</span>}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
              {list.tips.length > 0 && (
                <ul className="list-disc space-y-1 border-t pt-3 pl-5 text-xs text-muted-foreground">
                  {list.tips.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
