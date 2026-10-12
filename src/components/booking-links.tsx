"use client";

import { useEffect, useState } from "react";
import { BedDouble, ExternalLink, Plane, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { flightLink, hotelLinks } from "@/lib/booking";
import { segmentsFromDays } from "@/lib/plan";

const rel = "noopener noreferrer sponsored";
const row = "lift group flex items-center gap-3 rounded-md border p-2.5 hover:border-slate-300 hover:bg-muted";

/** Redirect links to Booking.com and Google Flights. No prices or booking happen inside this app. */
export function BookingLinks({ startDate, cityOfDay }: { startDate: string; cityOfDay: string[] }) {
  const segments = segmentsFromDays(cityOfDay);
  const hotels = hotelLinks(startDate, segments);
  const flight = flightLink(startDate, segments);

  // Local "today" only after mount, so server and client render the same HTML.
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => {
    const d = new Date();
    setToday(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }, []);
  const started = today !== null && startDate < today;

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold">Book your trip</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Opens Booking.com or Google Flights in a new tab, pre-filled with your cities and dates.
      </p>
      {started && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 p-2 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          This trip&apos;s start date has passed, so the sites may ask you to pick new dates.
        </p>
      )}
      <ul className="mt-3 space-y-2 text-sm">
        {flight && (
          <li>
            <a href={flight.href} target="_blank" rel={rel} className={row}>
              <Plane className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0">
                Flights to {flight.to}
                <span className="block text-xs text-muted-foreground">
                  {flight.depart} → {flight.returnDate} · round trip · Google Flights
                </span>
              </span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </li>
        )}
        {hotels.map((l) => (
          <li key={`${l.city}-${l.checkIn}`}>
            <a href={l.href} target="_blank" rel={rel} className={row}>
              <BedDouble className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0">
                Hotels in {l.city}
                <span className="block text-xs text-muted-foreground">
                  {l.checkIn} → {l.checkOut} · {l.nights} night{l.nights === 1 ? "" : "s"} · Booking.com
                </span>
              </span>
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
