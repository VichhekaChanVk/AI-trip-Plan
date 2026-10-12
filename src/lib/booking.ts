import { addDays, isoDate } from "./utils";
import type { Segment } from "./plan";

/**
 * Booking deep links. Plain redirect links, NOT an API integration: no prices, no availability,
 * no booking inside this app.
 *
 * Both providers accept a free-text place name, so no provider-specific city or airport IDs are
 * needed (Trip.com was dropped: its search ignores city names without its internal cityId).
 * URL formats are not a documented public API and may change; all format knowledge lives here.
 */

/** "Berlin, State of Berlin, Germany" -> "Berlin, Germany" (region names confuse provider search). */
function cityAndCountry(label: string) {
  const parts = label.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 2 ? `${parts[0]}, ${parts[parts.length - 1]}` : parts.join(", ");
}

const cityOnly = (label: string) => label.split(",")[0].trim();

export function hotelsUrl(opts: { city: string; checkIn: string; checkOut: string; adults?: number }) {
  const qs = new URLSearchParams({
    ss: cityAndCountry(opts.city),
    checkin: opts.checkIn, // yyyy-mm-dd
    checkout: opts.checkOut,
    group_adults: String(opts.adults ?? 2),
    group_children: "0",
    no_rooms: "1",
  });
  return `https://www.booking.com/searchresults.html?${qs}`;
}

/** Google Flights parses a natural-language query; the origin defaults to the traveller's location. */
export function flightsUrl(opts: { to: string; depart: string; returnDate: string }) {
  const q = `Flights to ${cityOnly(opts.to)} on ${opts.depart} through ${opts.returnDate}`;
  return `https://www.google.com/travel/flights?${new URLSearchParams({ q, hl: "en" })}`;
}

export type HotelLink = { city: string; checkIn: string; checkOut: string; nights: number; href: string };
export type FlightLink = { to: string; depart: string; returnDate: string; href: string };

/** One hotel link per city stay. Check-out is the morning after the last day in that city. */
export function hotelLinks(startDate: string, segments: Segment[]): HotelLink[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  return segments.map((s) => {
    const checkIn = isoDate(addDays(start, s.startDay - 1));
    const checkOut = isoDate(addDays(start, s.endDay));
    return {
      city: cityAndCountry(s.city),
      checkIn,
      checkOut,
      nights: s.endDay - s.startDay + 1,
      href: hotelsUrl({ city: s.city, checkIn, checkOut }),
    };
  });
}

/** Round trip to the first city, flying home the morning after the last day. */
export function flightLink(startDate: string, segments: Segment[]): FlightLink | null {
  if (!segments.length) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  const depart = isoDate(start);
  const returnDate = isoDate(addDays(start, segments[segments.length - 1].endDay));
  const to = cityOnly(segments[0].city);
  return { to, depart, returnDate, href: flightsUrl({ to, depart, returnDate }) };
}
