import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { generateRequestSchema, type GenerateRequest, type GeneratedItinerary } from "@/lib/schema";
import { generateItinerary, type PlanContext, type PlannedItinerary } from "@/lib/generate";
import { getWeather, summarizeWeather } from "@/lib/weather";
import { buildDayPlans, loadForecasts, resolveCities } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE, userCookieOptions } from "@/lib/user";
import { addDays, formatCost } from "@/lib/utils";
import { AppError, classifyError, errorBody, statusFor, type ErrorCode } from "@/lib/errors";
import { formatIssues, validateItinerary } from "@/lib/validator";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// Total time allowed for all AI attempts. Must stay below maxDuration to leave room for DB work.
const AI_BUDGET_MS = Number(process.env.AI_TIMEOUT_MS) || 50_000;
const MAX_ATTEMPTS = 2; // one retry when the output fails validation
const MIN_TIME_FOR_RETRY_MS = 10_000;

function fail(code: ErrorCode, status?: number) {
  return NextResponse.json(errorBody(code), { status: status ?? statusFor(code) });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AppError("AI_TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Generate, then validate. Retries once on invalid output, inside one shared time budget. */
async function generateValidated(
  input: GenerateRequest,
  context: PlanContext,
): Promise<PlannedItinerary> {
  const deadline = Date.now() + AI_BUDGET_MS;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt > 1 && remaining < MIN_TIME_FOR_RETRY_MS) break;

    const plan = await withTimeout(generateItinerary(input, context), remaining);
    const result = validateItinerary(plan, input);
    if (result.ok) return plan;

    console.warn(`[generate-itinerary] attempt ${attempt} failed validation: ${formatIssues(result.issues)}`);
  }
  throw new AppError("AI_INVALID_OUTPUT");
}

export async function POST(req: Request) {
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
    const plan = await generateValidated(input, { cities, days });

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
