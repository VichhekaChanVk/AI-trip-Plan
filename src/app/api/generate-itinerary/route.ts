import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { generateRequestSchema } from "@/lib/schema";
import { generateItinerary } from "@/lib/generate";
import { geocodeDestination, getWeather, summarizeWeather } from "@/lib/weather";
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
    // 1. Ground the destination in real coordinates before the LLM runs.
    const geo = await geocodeDestination(input.destination);

    // 2. Schema-enforced generation (Zod + AI SDK structured output).
    const plan = await generateItinerary(input, geo);

    // 3. Weather is best-effort: never block saving a trip on it.
    let weatherSummary: string | null = null;
    try {
      weatherSummary = summarizeWeather(await getWeather(plan.centerLatitude, plan.centerLongitude));
    } catch {
      /* weather key missing or API down */
    }

    // 4. Persist.
    const userId = cookies().get(USER_COOKIE)?.value ?? randomUUID();
    const startDate = input.startDate
      ? new Date(`${input.startDate}T00:00:00Z`)
      : addDays(new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"), 1);

    const trip = await prisma.trip.create({
      data: {
        userId,
        destination: plan.destinationLabel,
        durationDays: plan.days.length,
        budget: input.budget,
        vibeTags: JSON.stringify(input.vibeTags),
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
