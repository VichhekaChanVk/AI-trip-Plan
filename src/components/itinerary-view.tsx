"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Accessibility, ArrowLeft, CalendarDays, Download, FileDown, Gem, MapPin, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityCard } from "@/components/activity-card";
import { BookingLinks } from "@/components/booking-links";
import { BudgetBreakdown } from "@/components/day-budget";
import { PackingList } from "@/components/packing-list";
import { PrintView } from "@/components/print-view";
import { Reveal } from "@/components/reveal";
import { RegenerateDayButton } from "@/components/regenerate-day-button";
import { WeatherBanner } from "@/components/weather-banner";
import { breakdown } from "@/lib/budget";
import { BUDGET_LABEL, type TripDTO } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { addDays, formatCost, isoDate } from "@/lib/utils";

// Leaflet touches `window`; keep it out of the server bundle.
const TripMap = dynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-64 w-full" />,
});

export function ItineraryView({
  trip,
  gcalLinks,
  isOwner,
}: {
  trip: TripDTO;
  gcalLinks: Record<string, string>;
  isOwner: boolean;
}) {
  const days = useMemo(() => Array.from({ length: trip.durationDays }, (_, i) => i + 1), [trip.durationDays]);
  const [day, setDay] = useState(days[0]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1); // which way the day list slides in
  const [regen, setRegen] = useState(false); // a day is being regenerated

  // New data arrived (e.g. after regenerating a day): stop dimming.
  useEffect(() => setRegen(false), [trip.items]);

  const items = useMemo(() => trip.items.filter((i) => i.dayNumber === day), [trip.items, day]);
  const activeId = hoverId ?? pinnedId;
  const dayDate = isoDate(addDays(new Date(`${trip.startDate}T00:00:00Z`), day - 1));
  const tripTotal = breakdown(trip.items).total;

  // City for each day (from the stops; falls back to the first city).
  const cityOfDay = useMemo(() => {
    const fallback = trip.cities[0]?.name ?? trip.destination;
    return days.map((d) => trip.items.find((i) => i.dayNumber === d)?.city ?? fallback);
  }, [days, trip.items, trip.cities, trip.destination]);
  const dayCity = cityOfDay[day - 1];
  const cityMeta = trip.cities.find((c) => c.name === dayCity) ?? trip.cities[0];
  const multiCity = trip.cities.length > 1;

  const changeDay = useCallback(
    (d: string) => {
      setDir(Number(d) >= day ? 1 : -1);
      setDay(Number(d));
      setHoverId(null);
      setPinnedId(null);
    },
    [day],
  );

  // Marker click -> pin + scroll the matching card into view.
  const selectFromMap = useCallback((id: string) => {
    setPinnedId(id);
    document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 print:hidden">
        <Link
          href="/trips"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Saved trips
        </Link>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left: 60% timeline */}
          <section className="order-2 space-y-4 lg:order-1 lg:col-span-3">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{trip.destination}</h1>
                {trip.summary && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{trip.summary}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <CalendarDays className="h-3 w-3" aria-hidden /> {trip.durationDays} days from {trip.startDate}
                  </Badge>
                  <Badge variant="outline">
                    <Wallet className="h-3 w-3" aria-hidden /> {BUDGET_LABEL[trip.budget]} · ~{formatCost(tripTotal)} pp
                  </Badge>
                  {trip.hiddenGems && (
                    <Badge variant="emerald">
                      <Gem className="h-3 w-3" aria-hidden /> Hidden gems
                    </Badge>
                  )}
                  {trip.needs.map((n) => (
                    <Badge key={n} variant="emerald">
                      {n === "Wheelchair accessible" && <Accessibility className="h-3 w-3" aria-hidden />} {n}
                    </Badge>
                  ))}
                  {trip.vibeTags.map((v) => (
                    <Badge key={v} variant="emerald">
                      {v}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => window.print()} title="Opens your browser's print dialog: choose “Save as PDF”">
                  <FileDown className="h-4 w-4" aria-hidden /> Export PDF
                </Button>
                <Button asChild variant="accent">
                  <a href={`/api/trips/${trip.id}/ics`} download>
                    <Download className="h-4 w-4" aria-hidden /> Sync to Google Calendar
                  </a>
                </Button>
              </div>
            </header>

            <WeatherBanner
              lat={cityMeta?.lat ?? trip.centerLat}
              lng={cityMeta?.lng ?? trip.centerLng}
              selectedDate={dayDate}
              place={dayCity ?? trip.destination}
            />

            <Tabs value={String(day)} onValueChange={changeDay}>
              <TabsList aria-label="Select day">
                {days.map((d) => (
                  <TabsTrigger key={d} value={String(d)}>
                    Day {d}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                {dayDate}
                {multiCity && dayCity && (
                  <>
                    · <MapPin className="h-3.5 w-3.5" aria-hidden /> {dayCity}
                  </>
                )}{" "}
                · {items.length} stops
              </span>
              {isOwner && <RegenerateDayButton tripId={trip.id} day={day} busy={regen} onBusyChange={setRegen} />}
            </div>

            <BudgetBreakdown items={items} title={`Day ${day} budget`} />

            <div key={day} className={cn(dir > 0 ? "wf-slide-next" : "wf-slide-prev")}>
              {regen && <div className="wf-indeterminate mb-3" role="progressbar" aria-label="Regenerating this day" />}
              <div
                className={cn(
                  "transition-[opacity,filter] duration-300 motion-reduce:transition-none",
                  regen && "pointer-events-none opacity-40 saturate-50",
                )}
                aria-busy={regen}
              >
                {items.length === 0 ? (
                  <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
                    No stops planned for this day.
                  </p>
                ) : (
                  // keyed by the ids too: after a regenerate the new cards re-run their staggered entrance
                  <ol key={items.map((i) => i.id).join("")} className="space-y-3">
                    {items.map((item, i) => (
                      <ActivityCard
                        key={item.id}
                        item={item}
                        index={i}
                        city={item.city ?? trip.destination}
                        active={activeId === item.id}
                        gcalHref={gcalLinks[item.id]}
                        onHover={setHoverId}
                        onSelect={setPinnedId}
                      />
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <Reveal>
              <BudgetBreakdown items={trip.items} title="Whole trip budget" />
            </Reveal>
            <Reveal delay={80}>
              <PackingList tripId={trip.id} initial={trip.packingList} isOwner={isOwner} />
            </Reveal>
            <Reveal delay={160}>
              <BookingLinks startDate={trip.startDate} cityOfDay={cityOfDay} />
            </Reveal>
          </section>

          {/* Right: 40% map */}
          <aside className="order-1 h-72 lg:order-2 lg:sticky lg:top-20 lg:col-span-2 lg:h-[calc(100vh-6.5rem)]">
            <TripMap
              items={items}
              center={{ lat: cityMeta?.lat ?? trip.centerLat, lng: cityMeta?.lng ?? trip.centerLng }}
              activeId={activeId}
              onSelect={selectFromMap}
            />
          </aside>
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6">
        <PrintView trip={trip} />
      </div>
    </>
  );
}
