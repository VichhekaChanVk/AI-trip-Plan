import type { ItineraryItem, Trip } from "@prisma/client";
import type { Budget, ItemDTO, TripDTO } from "./schema";
import { isoDate } from "./utils";

type TripWithItems = Trip & { items: ItineraryItem[] };

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
    estimatedHours: i.estimatedHours,
    transitNote: i.transitNote,
  };
}

export function toTripDTO(t: TripWithItems): TripDTO {
  let parsedVibeTags: string[] = [];
  try {
    parsedVibeTags = typeof t.vibeTags === "string" ? JSON.parse(t.vibeTags) : (t.vibeTags || []);
  } catch {
    parsedVibeTags = [];
  }

  return {
    id: t.id,
    destination: t.destination,
    durationDays: t.durationDays,
    budget: t.budget as Budget,
    vibeTags: parsedVibeTags,
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
