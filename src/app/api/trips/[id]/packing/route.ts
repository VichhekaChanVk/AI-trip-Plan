import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { generatePackingList, type CityGeo } from "@/lib/generate";
import { loadForecasts, seasonOf } from "@/lib/context";
import { toTripDTO } from "@/lib/trips";
import { addDays, isoDate } from "@/lib/utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/** Generate (or return the saved) packing list. Generating is owner only so strangers with the link can't spend AI credit. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const body = (await req.json().catch(() => ({}))) as { refresh?: boolean };
  const row = await prisma.trip.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!row) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const trip = toTripDTO(row);
  if (trip.packingList && !body.refresh) return NextResponse.json(trip.packingList);

  const userId = getUserId();
  if (!userId || row.userId !== userId) {
    return NextResponse.json({ error: "Only the person who created this trip can generate its packing list." }, { status: 403 });
  }

  try {
    const cities: CityGeo[] = trip.cities.map((c) => ({ name: c.name, label: c.label, lat: c.lat, lng: c.lng }));
    const bundles = await loadForecasts(cities);

    const start = new Date(`${trip.startDate}T00:00:00Z`);
    const dates = Array.from({ length: trip.durationDays }, (_, i) => isoDate(addDays(start, i)));
    const forecasts = bundles.flatMap((b) => (b ? b.forecast.filter((f) => dates.includes(f.date)) : []));

    const forecastSummary = forecasts.length
      ? `forecast covers ${forecasts.length} day(s): lows down to ${Math.min(...forecasts.map((f) => f.lowC))}°C, highs up to ${Math.max(...forecasts.map((f) => f.highC))}°C, ${forecasts.filter((f) => f.precipChance >= 60).length} likely rainy day(s).`
      : "no forecast available for these dates; assume typical seasonal weather.";

    const list = await generatePackingList({
      destinations: trip.cities.map((c) => c.name),
      startDate: trip.startDate,
      durationDays: trip.durationDays,
      season: seasonOf(trip.centerLat, trip.startDate),
      forecastSummary,
      vibes: trip.vibeTags,
      needs: trip.needs,
      activities: [...new Set(trip.items.map((i) => i.title))].slice(0, 14),
    });

    await prisma.trip.update({ where: { id: trip.id }, data: { packingList: JSON.stringify(list) } });
    return NextResponse.json(list);
  } catch (err) {
    console.error("[packing]", err);
    const message = err instanceof Error ? err.message : "Packing list failed";
    return NextResponse.json({ error: message }, { status: /not set/.test(message) ? 503 : 500 });
  }
}
