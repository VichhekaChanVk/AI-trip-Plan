import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { generateRequestSchema } from "@/lib/schema";
import { generateItinerary } from "@/lib/generate";
import { getWeather, summarizeWeather } from "@/lib/weather";
import { buildDayPlans, loadForecasts, resolveCities } from "@/lib/context";
import { prisma } from "@/lib/prisma";
import { USER_COOKIE, userCookieOptions } from "@/lib/user";
import { addDays, formatCost } from "@/lib/utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // Fail fast (before paying for an LLM call) if the database isn't reachable.
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json(
      { error: "Can't connect to the database. Check DATABASE_URL in your .env, then run `npm run db:push`." },
      { status: 503 },
    );
  }

  try {
    const startDate = input.startDate
      ? new Date(`${input.startDate}T00:00:00Z`)
      : addDays(new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"), 1);

    // 1. Ground every city in real coordinates before the LLM runs.
    const resolved = await resolveCities(input.destinations);
    if ("error" in resolved) return NextResponse.json({ error: resolved.error }, { status: 400 });
    const { cities } = resolved;

    // 2. Forecast BEFORE generation so the plan can adapt to it (best-effort, never blocks).
    const bundles = await loadForecasts(cities);
    const days = buildDayPlans(cities, bundles, startDate, input.durationDays);

    // 3. Schema-enforced generation (Zod + AI SDK structured output).
    const plan = await generateItinerary(input, { cities, days });

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
    console.error("[generate-itinerary]", err);
    const message = err instanceof Error ? err.message : "Generation failed";
    const status = /not set/.test(message) ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
