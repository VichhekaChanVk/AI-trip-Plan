import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { generateDay, type CityGeo, type PlanContext } from "@/lib/generate";
import { allocateDays } from "@/lib/plan";
import { loadForecasts } from "@/lib/context";
import { forecastForDate } from "@/lib/weather";
import { toTripDTO } from "@/lib/trips";
import type { Need } from "@/lib/schema";
import { addDays, formatCost, isoDate } from "@/lib/utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Replace ONE day of a trip with a fresh plan. Owner only (the anonymous cookie must match the trip). */
export async function POST(_req: Request, { params }: { params: { id: string; day: string } }) {
  const userId = getUserId();
  const dayNumber = Number(params.day);
  if (!Number.isInteger(dayNumber) || dayNumber < 1) {
    return NextResponse.json({ error: "Invalid day" }, { status: 400 });
  }

  const row = await prisma.trip.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!row) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  if (!userId || row.userId !== userId) {
    return NextResponse.json({ error: "Only the person who created this trip can regenerate a day." }, { status: 403 });
  }

  const trip = toTripDTO(row);
  if (dayNumber > trip.durationDays) return NextResponse.json({ error: "That day isn't part of this trip" }, { status: 400 });

  try {
    const cities: CityGeo[] = trip.cities.map((c) => ({ name: c.name, label: c.label, lat: c.lat, lng: c.lng }));
    const startDate = new Date(`${trip.startDate}T00:00:00Z`);
    const date = isoDate(addDays(startDate, dayNumber - 1));

    // City for this day: what the day already uses, else the even split.
    const existing = trip.items.filter((i) => i.dayNumber === dayNumber);
    const byItems = cities.findIndex((c) => c.name === existing[0]?.city);
    const cityIndex = byItems >= 0 ? byItems : (allocateDays(trip.durationDays, cities.length)[dayNumber - 1] ?? 0);

    const [bundle] = await loadForecasts([cities[cityIndex]]);
    const dayPlan = { dayNumber, date, cityIndex, forecast: forecastForDate(bundle, date) };
    const ctx: PlanContext = { cities, days: [dayPlan] };

    const planned = await generateDay(
      {
        destinations: cities.map((c) => c.name),
        durationDays: trip.durationDays,
        budget: trip.budget,
        vibeTags: trip.vibeTags,
        startDate: trip.startDate,
        needs: trip.needs as Need[],
        hiddenGems: trip.hiddenGems,
        inspiration: trip.inspiration ?? "",
      },
      ctx,
      dayPlan,
      {
        otherDaysTitles: trip.items.filter((i) => i.dayNumber !== dayNumber).map((i) => i.title),
        previousTitles: existing.map((i) => i.title),
      },
    );

    // Generation succeeded: swap the day atomically.
    await prisma.$transaction([
      prisma.itineraryItem.deleteMany({ where: { tripId: trip.id, dayNumber } }),
      ...planned.stops.map((s, i) =>
        prisma.itineraryItem.create({
          data: {
            tripId: trip.id,
            dayNumber,
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
            city: cities[cityIndex]?.name ?? null,
            estimatedHours: s.estimatedHours,
            costInfo: formatCost(s.estimatedCost),
            transitNote: s.transitNote,
          },
        }),
      ),
      // A packing list built from the old plan is now stale.
      prisma.trip.update({ where: { id: trip.id }, data: { packingList: null } }),
    ]);

    return NextResponse.json({ ok: true, stops: planned.stops.length });
  } catch (err) {
    console.error("[regenerate-day]", err);
    const message = err instanceof Error ? err.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: /not set/.test(message) ? 503 : 500 });
  }
}
