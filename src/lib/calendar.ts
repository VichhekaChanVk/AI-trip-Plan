import { createEvents, type EventAttributes } from "ics";
import type { ItemDTO, TripDTO } from "./schema";
import { addDays } from "./utils";

function startOf(trip: Pick<TripDTO, "startDate">, item: Pick<ItemDTO, "dayNumber" | "timeBadge">) {
  const day = addDays(new Date(`${trip.startDate}T00:00:00Z`), item.dayNumber - 1);
  const [h, m] = item.timeBadge.split(":").map(Number);
  return {
    y: day.getUTCFullYear(),
    mo: day.getUTCMonth() + 1,
    d: day.getUTCDate(),
    h: h || 0,
    mi: m || 0,
  };
}

function durationOf(item: Pick<ItemDTO, "estimatedHours">) {
  const total = Math.max(15, Math.round(item.estimatedHours * 60));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

function describe(item: ItemDTO) {
  return [item.description, item.transitNote ? `Getting there: ${item.transitNote}` : null, `Est. cost: ${item.costInfo}`]
    .filter(Boolean)
    .join("\n\n");
}

/** Build a standards-compliant .ics with one event per itinerary stop (floating local times). */
export function buildIcs(trip: TripDTO): string {
  const events: EventAttributes[] = trip.items.map((item) => {
    const s = startOf(trip, item);
    return {
      uid: `${item.id}@wayfarer.ai`,
      title: item.title,
      description: describe(item),
      location: `${item.title}, ${trip.destination}`,
      geo: { lat: item.lat, lon: item.lng },
      categories: [item.categoryTag, "Wayfarer AI"],
      start: [s.y, s.mo, s.d, s.h, s.mi],
      startInputType: "local",
      startOutputType: "local",
      duration: durationOf(item),
      calName: `Wayfarer: ${trip.destination}`,
    };
  });

  const { error, value } = createEvents(events);
  if (error || !value) throw new Error(`ICS generation failed: ${error?.message ?? "unknown"}`);
  return value;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Single-event "Add to Google Calendar" deep link (no OAuth needed). */
export function googleCalendarLink(trip: Pick<TripDTO, "startDate" | "destination">, item: ItemDTO): string {
  const s = startOf(trip, item);
  const dur = durationOf(item);
  const startLocal = new Date(Date.UTC(s.y, s.mo - 1, s.d, s.h, s.mi));
  const endLocal = new Date(startLocal.getTime() + (dur.hours * 60 + dur.minutes) * 60000);
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: item.title,
    dates: `${fmt(startLocal)}/${fmt(endLocal)}`,
    details: describe(item),
    location: `${item.title}, ${trip.destination}`,
  });
  return `https://calendar.google.com/calendar/render?${qs}`;
}
