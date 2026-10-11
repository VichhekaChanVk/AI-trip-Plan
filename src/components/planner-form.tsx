"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, MapPin, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BUDGETS, BUDGET_LABEL, MAX_VIBES, VIBES, cleanVibe, type Budget } from "@/lib/schema";

const BUDGET_HINT: Record<Budget, string> = {
  SAVER: "Street food & free sights",
  BALANCED: "Best of both",
  LUXURY: "Premium experiences",
};

const STEPS = [
  "Locating your destination…",
  "Drafting day-by-day stops…",
  "Pinning places on the map…",
  "Checking the forecast & saving…",
];

function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PlannerForm() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState<Budget>("BALANCED");
  const [vibes, setVibes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setStartDate(tomorrow()), []);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [loading]);

  const [customVibe, setCustomVibe] = useState("");
  const atLimit = vibes.length >= MAX_VIBES;
  const customVibes = vibes.filter((v) => !(VIBES as readonly string[]).includes(v));

  const toggleVibe = (v: string) =>
    setVibes((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : cur.length >= MAX_VIBES ? cur : [...cur, v]));

  function addCustomVibe() {
    const v = cleanVibe(customVibe);
    if (!v) return;
    const existing = [...VIBES, ...vibes].find((x) => x.toLowerCase() === v.toLowerCase());
    if (existing) {
      setVibes((cur) => (cur.includes(existing) || cur.length >= MAX_VIBES ? cur : [...cur, existing]));
    } else {
      setVibes((cur) => (cur.length >= MAX_VIBES ? cur : [...cur, v]));
    }
    setCustomVibe("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, durationDays: days, budget, vibeTags: vibes, startDate }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Something went wrong. Please try again.");
      router.push(`/itinerary/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <Card className="p-5 shadow-md sm:p-7">
      <form onSubmit={onSubmit} className="space-y-6" aria-busy={loading}>
        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="destination" className="mb-1.5 block text-sm font-medium">
              Destination
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                id="destination"
                required
                minLength={2}
                maxLength={120}
                placeholder="Tokyo, Lisbon, Banff…"
                className="pl-9"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className="sm:col-span-1">
            <label htmlFor="days" className="mb-1.5 block text-sm font-medium">
              Days
            </label>
            <Input
              id="days"
              type="number"
              min={1}
              max={10}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              disabled={loading}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="start" className="mb-1.5 block text-sm font-medium">
              Start date
            </label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={loading} />
          </div>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Budget</legend>
          <div className="grid grid-cols-3 gap-2">
            {BUDGETS.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(b)}
                disabled={loading}
                aria-pressed={budget === b}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  budget === b ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                )}
              >
                <span className="block text-sm font-semibold">{BUDGET_LABEL[b]}</span>
                <span className={cn("hidden text-xs sm:block", budget === b ? "text-slate-300" : "text-muted-foreground")}>
                  {BUDGET_HINT[b]}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1.5 flex w-full items-baseline justify-between text-sm font-medium">
            Vibe
            <span className="text-xs font-normal text-muted-foreground">
              {vibes.length}/{MAX_VIBES} selected
            </span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {[...VIBES, ...customVibes].map((v) => {
              const on = vibes.includes(v);
              const custom = !(VIBES as readonly string[]).includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggleVibe(v)}
                  disabled={loading || (!on && atLimit)}
                  aria-pressed={on}
                  className={cn(
                    "animate-fade-in inline-flex cursor-pointer items-center gap-1 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    on ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  {v}
                  {custom && <X className="h-3.5 w-3.5" aria-label="Remove" />}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={customVibe}
              onChange={(e) => setCustomVibe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomVibe();
                }
              }}
              maxLength={30}
              placeholder="Add your own: street art, vinyl shops, hiking, K-pop…"
              aria-label="Add a custom vibe"
              disabled={loading || atLimit}
            />
            <Button type="button" variant="outline" onClick={addCustomVibe} disabled={loading || atLimit || !cleanVibe(customVibe)}>
              <Plus className="h-4 w-4" aria-hidden /> Add
            </Button>
          </div>
        </fieldset>

        {error && (
          <div role="alert" className="animate-fade-up flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading || destination.trim().length < 2}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {STEPS[step]}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden /> Generate itinerary
            </>
          )}
        </Button>
      </form>
    </Card>
  );
}
