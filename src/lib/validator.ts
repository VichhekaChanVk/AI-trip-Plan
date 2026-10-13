import type { GenerateRequest } from "@/lib/schema";
import type { PlannedItinerary } from "@/lib/generate";

export type ValidationIssue = { path: string; message: string };
export type ValidationResult = { ok: true } | { ok: false; issues: ValidationIssue[] };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MIN_STOPS_PER_DAY = 2;
// Per-person USD per day (stop costs + transit). The prompt asks SAVER trips for ~$60, so 200 is a generous ceiling.
const SAVER_MAX_DAILY_COST = 200;
// These categories legitimately repeat across a trip (airport transfers, the same hotel).
const REPEATABLE_CATEGORIES = new Set(["transit", "lodging"]);

const normalizeTitle = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Deterministic checks on the model's output. Zod (generateObject) already guarantees the *shape*, and
 * sanitize() in generate.ts already fixes time format/order and drops far-away stops.
 * This verifies the *meaning*: right number of days, real coordinates, no repeated places, sane cost.
 */
export function validateItinerary(plan: PlannedItinerary, req: GenerateRequest): ValidationResult {
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
      else if (prevTime && s.time < prevTime) add(`${sp}.time`, `out of order (${s.time} after ${prevTime})`);
      if (TIME_RE.test(s.time)) prevTime = s.time;

      const key = normalizeTitle(s.title);
      if (!key) add(`${sp}.title`, "empty title");
      if (s.latitude === 0 && s.longitude === 0) add(sp, "coordinates are 0,0 (likely hallucinated)");

      if (key && !REPEATABLE_CATEGORIES.has(s.categoryTag)) {
        if (seen.has(key)) add(`${sp}.title`, `duplicate place "${s.title}"`);
        seen.add(key);
      }

      if (!Number.isFinite(s.estimatedCost) || !Number.isFinite(s.transitCost)) {
        add(`${sp}.estimatedCost`, "cost is not a finite number");
      } else {
        dayCost += s.estimatedCost + s.transitCost;
      }
    });

    if (req.budget === "SAVER" && dayCost > SAVER_MAX_DAILY_COST) {
      add(p, `SAVER day costs $${Math.round(dayCost)} per person (limit $${SAVER_MAX_DAILY_COST})`);
    }
  });

  return issues.length ? { ok: false, issues } : { ok: true };
}

export function formatIssues(issues: ValidationIssue[]) {
  return issues.map((i) => `${i.path}: ${i.message}`).join("; ");
}
