import type { ItineraryItem, Trip } from "@prisma/client";
import { packingSchema, type Budget, type CityDTO, type ItemDTO, type PackingList, type TripDTO } from "./schema";
import { isoDate } from "./utils";

type TripWithItems = Trip & { items: ItineraryItem[] };

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return (raw as T) ?? fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function parsePacking(raw: string | null): PackingList | null {
  if (!raw) return null;
  const r = packingSchema.safeParse(parseJson<unknown>(raw, null));
  return r.success ? r.data : null;
}

export function toItemDTO(i: ItineraryItem): ItemDTO {
  return {
    id: i.id,
    dayNumber: i.dayNumber,
    sortOrder: i.sortOrder,
    title: i.title,
    description: i.description,
    timeBadge: i.timeBadge,
    lat: i.lat,
    lng: i.lng,
    categoryTag: i.categoryTag,
    costInfo: i.costInfo,
    estimatedCost: i.estimatedCost,
    transitCost: i.transitCost ?? 0,
    indoor: i.indoor ?? false,
    city: i.city ?? null,
    estimatedHours: i.estimatedHours,
    transitNote: i.transitNote,
  };
}

/** Cities stored on the trip; older single-city trips fall back to the trip centre. */
export function tripCities(t: Pick<Trip, "destinations" | "destination" | "centerLat" | "centerLng">): CityDTO[] {
  const parsed = parseJson<CityDTO[]>(t.destinations, []);
  const ok = Array.isArray(parsed)
    ? parsed.filter((c) => c && typeof c.name === "string" && Number.isFinite(c.lat) && Number.isFinite(c.lng))
    : [];
  return ok.length ? ok : [{ name: t.destination, label: t.destination, lat: t.centerLat, lng: t.centerLng }];
}

export function toTripDTO(t: TripWithItems): TripDTO {
  return {
    id: t.id,
    destination: t.destination,
    durationDays: t.durationDays,
    budget: t.budget as Budget,
    vibeTags: parseJson<string[]>(t.vibeTags, []),
    needs: parseJson<string[]>(t.needs, []),
    hiddenGems: Boolean(t.hiddenGems),
    inspiration: t.inspiration ?? null,
    cities: tripCities(t),
    packingList: parsePacking(t.packingList),
    weatherSummary: t.weatherSummary,
    startDate: isoDate(t.startDate),
    centerLat: t.centerLat,
    centerLng: t.centerLng,
    summary: t.summary,
    createdAt: t.createdAt.toISOString(),
    items: [...t.items]
      .sort((a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder)
      .map(toItemDTO),
  };
}
