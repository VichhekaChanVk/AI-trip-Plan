"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronDown, Gem, Loader2, MapPin, Plus, Sparkles, X } from "lucide-react";
import { ErrorFallback } from "@/components/ErrorFallback";
import type { ApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/date-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BUDGETS, BUDGET_LABEL, MAX_CITIES, MAX_NOTES, MAX_VIBES, NEEDS, VIBES, cleanVibe, type Budget } from "@/lib/schema";

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
  const [cities, setCities] = useState<string[]>([""]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [hiddenGems, setHiddenGems] = useState(false);
  const [inspiration, setInspiration] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [days, setDays] = useState(3);
  const [daysInput, setDaysInput] = useState("3");
  const [budget, setBudget] = useState<Budget>("BALANCED");
  const [vibes, setVibes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => setStartDate(tomorrow()), []);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 5000);
    return () => clearInterval(t);
  }, [loading]);

  // Keep daysInput in sync when days changes externally (e.g. addCity bumps the minimum).
  useEffect(() => {
    setDaysInput(String(days));
  }, [days]);

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

  const cityCount = cities.length;
  const cleanCities = cities.map((c) => c.trim());
  const citiesValid = cleanCities.every((c) => c.length >= 2);

  function setCity(i: number, v: string) {
    setCities((cur) => cur.map((c, idx) => (idx === i ? v : c)));
  }
  function addCity() {
    if (cityCount >= MAX_CITIES) return;
    setCities((cur) => [...cur, ""]);
    setDays((d) => Math.max(d, cityCount + 1));
  }
  function removeCity(i: number) {
    setCities((cur) => (cur.length > 1 ? cur.filter((_, idx) => idx !== i) : cur));
  }
  const toggleNeed = (n: string) => setNeeds((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));

  async function generate() {
    if (loading) return;
    setError(null);
    setLoading(true);
    // Client-side cap slightly above the server's 60s limit so a hung request can't spin forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 65_000);
    try {
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinations: cleanCities, durationDays: days, budget, vibeTags: vibes, startDate, needs, hiddenGems, inspiration }),
        signal: controller.signal,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.code ? json : { error: json?.error ?? "Something went wrong. Please try again.", code: "UNKNOWN", retryable: true });
        setLoading(false);
        return;
      }
      router.push(`/itinerary/${json.id}`);
    } catch (err) {
      const aborted = err instanceof DOMException && err.name === "AbortError";
      setError(
        aborted
          ? { error: "The AI took too long to respond. Try again, or plan fewer days.", code: "AI_TIMEOUT", retryable: true }
          : { error: "Couldn't reach the server. Check your connection and try again.", code: "NETWORK", retryable: true },
      );
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    void generate();
  }

  return (
    <Card className="p-5 shadow-md sm:p-7">
      <form onSubmit={onSubmit} className="space-y-6" aria-busy={loading}>
        <fieldset>
          <legend className="mb-1.5 flex w-full items-baseline justify-between text-sm font-medium">
            {cityCount > 1 ? "Cities, in visiting order" : "Destination"}
            <span className="text-xs font-normal text-muted-foreground">up to {MAX_CITIES} cities</span>
          </legend>
          <div className="space-y-2">
            {cities.map((c, i) => (
              <div key={i} className="animate-fade-up flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden />
                  <Input
                    id={`city-${i}`}
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder={i === 0 ? "Tokyo, Lisbon, Banff…" : "Next city: Kyoto, Osaka…"}
                    aria-label={`City ${i + 1}`}
                    className="pl-9"
                    value={c}
                    onChange={(e) => setCity(i, e.target.value)}
                    disabled={loading}
                  />
                </div>
                {cityCount > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCity(i)} disabled={loading} aria-label={`Remove city ${i + 1}`}>
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            ))}
          </div>
          {cityCount < MAX_CITIES && (
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={addCity} disabled={loading}>
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add another city
            </Button>
          )}
        </fieldset>

        <hr className="border-border" />

        <div className="grid gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <label htmlFor="days" className="mb-1.5 block text-sm font-medium">
              Days
            </label>
            <Input
              id="days"
              type="number"
              min={cityCount}
              max={10}
              value={daysInput}
              onChange={(e) => {
                const raw = e.target.value;
                setDaysInput(raw);
                const n = parseInt(raw, 10);
                if (!isNaN(n)) setDays(Math.max(cityCount, Math.min(10, n)));
              }}
              onBlur={() => setDaysInput(String(days))}
              disabled={loading}
            />
            {cityCount > 1 && <p className="mt-1 text-xs text-muted-foreground">Split across your {cityCount} cities.</p>}
          </div>
          <div className="sm:col-span-4">
            <label htmlFor="start" className="mb-1.5 block text-sm font-medium">
              Start date
            </label>
            <DatePicker id="start" value={startDate} onChange={setStartDate} disabled={loading} />
          </div>
        </div>

        <hr className="border-border" />

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
                <span className={cn("hidden text-xs sm:block", budget === b ? "text-primary-foreground/70" : "text-muted-foreground")}>
                  {BUDGET_HINT[b]}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <hr className="border-border" />

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

        <hr className="border-border" />

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">
            Dietary &amp; accessibility <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {NEEDS.map((n) => {
              const on = needs.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggleNeed(n)}
                  disabled={loading}
                  aria-pressed={on}
                  className={cn(
                    "cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    on ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={() => setHiddenGems((v) => !v)}
          disabled={loading}
          aria-pressed={hiddenGems}
          className={cn(
            "flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            hiddenGems ? "border-accent bg-accent text-accent-foreground" : "bg-card hover:bg-muted",
          )}
        >
          <Gem className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            <span className="block text-sm font-semibold">Hidden gems only</span>
            <span className={cn("block text-xs", hiddenGems ? "text-accent-foreground/80" : "text-muted-foreground")}>
              Skip the tourist traps; favour local spots
            </span>
          </span>
        </button>

        <div className="rounded-lg border bg-card p-3">
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            aria-expanded={notesOpen}
            aria-controls="notes-body"
            className="flex w-full cursor-pointer items-center justify-between rounded-md text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span>
              Got ideas from social media? <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </span>
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300 motion-reduce:transition-none", notesOpen && "rotate-180")}
              aria-hidden
            />
          </button>
          <div id="notes-body" className={cn("wf-collapse", notesOpen && "is-open")}>
            <div>
              <p className="mt-2 text-xs text-muted-foreground">
                Paste a caption, a list of places or notes from a TikTok / Instagram / blog post. We can&apos;t read links, only
                the text you paste. Places that are real and in your city are worked into the plan.
              </p>
              <textarea
                value={inspiration}
                onChange={(e) => setInspiration(e.target.value.slice(0, MAX_NOTES))}
                disabled={loading}
                rows={4}
                maxLength={MAX_NOTES}
                aria-label="Pasted notes or caption"
                placeholder="e.g. 'Must try the matcha at Nakamura Tokichi, sunrise at Fushimi Inari…'"
                className="mt-2 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
              <p className="text-right text-xs text-muted-foreground">
                {inspiration.length}/{MAX_NOTES}
              </p>
            </div>
          </div>
        </div>

        {error && <ErrorFallback error={error} onRetry={generate} retrying={loading} />}

        <Button type="submit" size="lg" className="w-full" disabled={loading || !citiesValid}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span key={step} className="animate-fade-in">
                {STEPS[step]}
              </span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" aria-hidden /> Generate itinerary
            </>
          )}
        </Button>
        {loading && (
          <div className="animate-fade-in h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Generating itinerary">
            <div
              className="h-full rounded-full bg-accent transition-[width] [transition-duration:4000ms] ease-out motion-reduce:transition-none"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        )}
      </form>
    </Card>
  );
}
