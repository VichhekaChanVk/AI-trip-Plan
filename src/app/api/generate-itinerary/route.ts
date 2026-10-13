import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { generateRequestSchema, type GenerateRequest } from "@/lib/schema";
import { generateItinerary, type PlanContext, type PlannedItinerary } from "@/lib/generate";
import { getWeather, summarizeWeather } from "@/lib/weather";
import { buildDayPlans, loadForecasts, resolveCities } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE, userCookieOptions } from "@/lib/user";
import { addDays, formatCost } from "@/lib/utils";
import { AppError, classifyError, errorBody, statusFor, type ErrorCode } from "@/lib/errors";
import { formatIssues, validateItinerary } from "@/lib/validator";

export const maxDuration = 60; // must be a literal for Next.js; keep MAX_DURATION_MS in sync
export const dynamic = "force-dynamic";

const MAX_DURATION_MS = 60_000;
// Time kept free after the AI finishes: weather fallback + DB save + response.
const SAVE_RESERVE_MS = 8_000;
// Max time from request start until the last AI attempt must be over. Env can lower it, never exceed the cap.
const AI_BUDGET_MS = Math.min(Number(process.env.AI_TIMEOUT_MS) || 50_000, MAX_DURATION_MS - SAVE_RESERVE_MS);
const MAX_ATTEMPTS = 2; // one retry when the output is unusable or fails validation
const MIN_TIME_FOR_RETRY_MS = 10_000;

function fail(code: ErrorCode, status?: number) {
  return NextResponse.json(errorBody(code), { status: status ?? statusFor(code) });
}

/** Runs `run` with an AbortSignal. On timeout the signal fires (stops the LLM call) and AI_TIMEOUT is thrown. */
function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new AppError("AI_TIMEOUT"));
    }, ms);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

/**
 * Generate, then validate. Retries once (same shared deadline) when the output fails validation
 * or is unusable, telling the model what was wrong. Other errors (timeout, rate limit, bad key) fail fast.
 */
async function generateValidated(
  input: GenerateRequest,
  context: PlanContext,
  deadline: number,
): Promise<PlannedItinerary> {
  let feedback: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new AppError("AI_TIMEOUT");
    if (attempt > 1 && remaining < MIN_TIME_FOR_RETRY_MS) break;

    try {
      const plan = await withTimeout((signal) => generateItinerary(input, context, { signal, feedback }), remaining);
      const result = validateItinerary(plan, input);
      if (result.ok) return plan;

      feedback = formatIssues(result.issues);
      console.warn(`[generate-itinerary] attempt ${attempt} failed validation: ${feedback}`);
    } catch (err) {
      if (classifyError(err) !== "AI_INVALID_OUTPUT") throw err;
      feedback = "the previous answer was unusable (wrong structure, or places too far from the assigned city). Use real places inside each assigned city.";
      console.warn(`[generate-itinerary] attempt ${attempt} produced unusable output`, err);
    }
  }
  throw new AppError("AI_INVALID_OUTPUT");
}

export async function POST(req: Request) {
  const startedAt = Date.now();

  const body = await req.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ...errorBody("BAD_INPUT"), error: parsed.error.issues[0]?.message ?? errorBody("BAD_INPUT").error },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Fail fast (before paying for an LLM call) if the database isn't reachable.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    console.error("[generate-itinerary] db check failed", err);
    return fail("DB_UNAVAILABLE");
  }

  try {
    const startDate = input.startDate
      ? new Date(`${input.startDate}T00:00:00Z`)
      : addDays(new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"), 1);

    // 1. Ground every city in real coordinates before the LLM runs.
    const resolved = await resolveCities(input.destinations);
    if ("error" in resolved) {
      return NextResponse.json({ ...errorBody("BAD_INPUT"), error: resolved.error }, { status: 400 });
    }
    const { cities } = resolved;

    // 2. Forecast BEFORE generation so the plan can adapt to it (best-effort, never blocks).
    const bundles = await loadForecasts(cities);
    const days = buildDayPlans(cities, bundles, startDate, input.durationDays);

    // 3. Schema-enforced generation + semantic validation, with timeout and retry.
    //    The deadline counts from request start, so geocoding/forecast time is part of the budget.
    const plan = await generateValidated(input, { cities, days }, startedAt + AI_BUDGET_MS);

    // 4. Weather summary for the saved-trips list; fall back to a fetch when the city had no geocode.
    let weatherSummary: string | null = bundles[0] ? summarizeWeather(bundles[0]) : null;
    if (!weatherSummary) {
      try {
        weatherSummary = summarizeWeather(await getWeather(plan.centerLatitude, plan.centerLongitude));
      } catch {
        /* weather API down */
      }
    }

    // A single city that could not be geocoded takes the model's centre.
    const storedCities = cities.map((c) => ({
      name: c.name,
      label: c.label,
      lat: c.lat ?? plan.centerLatitude,
      lng: c.lng ?? plan.centerLongitude,
    }));

    // 5. Persist.
    const userId = cookies().get(USER_COOKIE)?.value ?? randomUUID();
    const lastDay = Math.max(...plan.days.map((d) => d.dayNumber));

    const trip = await prisma.trip.create({
      data: {
        userId,
        destination: plan.destinationLabel,
        durationDays: lastDay,
        budget: input.budget,
        vibeTags: JSON.stringify(input.vibeTags),
        needs: JSON.stringify(input.needs),
        hiddenGems: input.hiddenGems,
        inspiration: input.inspiration || null,
        destinations: JSON.stringify(storedCities),
        weatherSummary,
        startDate,
        centerLat: plan.centerLatitude,
        centerLng: plan.centerLongitude,
        summary: plan.summary,
        items: {
          create: plan.days.flatMap((day) =>
            day.stops.map((s, i) => ({
              dayNumber: day.dayNumber,
              sortOrder: i,
              title: s.title,
              description: s.description,
              timeBadge: s.time,
              lat: s.latitude,
              lng: s.longitude,
              categoryTag: s.categoryTag,
              estimatedCost: s.estimatedCost,
              transitCost: s.transitCost,
              indoor: s.indoor,
              city: storedCities[day.cityIndex]?.name ?? storedCities[0].name,
              estimatedHours: s.estimatedHours,
              costInfo: formatCost(s.estimatedCost),
              transitNote: s.transitNote,
            })),
          ),
        },
      },
      select: { id: true },
    });

    const res = NextResponse.json({ id: trip.id }, { status: 201 });
    res.cookies.set(USER_COOKIE, userId, userCookieOptions);
    return res;
  } catch (err) {
    const code = classifyError(err);
    console.error(`[generate-itinerary] ${code}`, err);
    return fail(code);
  }
}
