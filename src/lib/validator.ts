import type { GeneratedItinerary, GenerateRequest } from "@/lib/schema";

export type ValidationIssue = { path: string; message: string };
export type ValidationResult = { ok: true } | { ok: false; issues: ValidationIssue[] };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_STOPS_PER_DAY = 2;
// Generous ceiling per day for SAVER trips (prompt asks for ~$60); catches obvious budget violations.
const SAVER_MAX_DAILY_COST = 200;

/**
 * Deterministic checks on the model's output. Zod (generateObject) already guarantees the *shape*;
 * this verifies the *meaning*: right number of days, sane times, real coordinates, no repeats.
 */
export function validateItinerary(
  plan: GeneratedItinerary | { days: Array<{ dayNumber: number; stops: Array<{ time: string; title: string; latitude: number; longitude: number; estimatedCost: number }> }> },
  req: GenerateRequest,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  if (plan.days.length !== req.durationDays) {
    add("days", `expected ${req.durationDays} days, got ${plan.days.length}`);
  }

  const seen = new Set<string>();

  plan.days.forEach((day, d) => {
    const p = `days[${d}]`;
    if (day.dayNumber !== d + 1) add(`${p}.dayNumber`, `expected ${d + 1}, got ${day.dayNumber}`);
    if (day.stops.length < MIN_STOPS_PER_DAY) add(`${p}.stops`, `only ${day.stops.length} stop(s)`);

    let prevTime = "";
    let dayCost = 0;

    day.stops.forEach((s, i) => {
      const sp = `${p}.stops[${i}]`;
      if (!TIME_RE.test(s.time)) add(`${sp}.time`, `invalid time "${s.time}"`);
      else if (s.time < prevTime) add(`${sp}.time`, `out of order (${s.time} after ${prevTime})`);
      prevTime = s.time;

      if (!s.title.trim()) add(`${sp}.title`, "empty title");
      if (s.latitude === 0 && s.longitude === 0) add(`${sp}`, "coordinates are 0,0 (likely hallucinated)");

      const key = s.title.trim().toLowerCase();
      if (seen.has(key)) add(`${sp}.title`, `duplicate place "${s.title}"`);
      seen.add(key);

      if (!Number.isFinite(s.estimatedCost)) add(`${sp}.estimatedCost`, "not a finite number");
      else dayCost += s.estimatedCost;
    });

    if (req.budget === "SAVER" && dayCost > SAVER_MAX_DAILY_COST) {
      add(`${p}`, `SAVER day costs $${Math.round(dayCost)} (limit $${SAVER_MAX_DAILY_COST})`);
    }
  });

  return issues.length ? { ok: false, issues } : { ok: true };
}

export function formatIssues(issues: ValidationIssue[]) {
  return issues.map((i) => `${i.path}: ${i.message}`).join("; ");
}
