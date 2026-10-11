"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Download, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityCard } from "@/components/activity-card";
import { WeatherBanner } from "@/components/weather-banner";
import { BUDGET_LABEL, type TripDTO } from "@/lib/schema";
import { addDays, formatCost, isoDate } from "@/lib/utils";

// mapbox-gl touches `window`; keep it out of the server bundle.
const TripMap = dynamic(() => import("@/components/trip-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-64 w-full" />,
});

export function ItineraryView({ trip, gcalLinks }: { trip: TripDTO; gcalLinks: Record<string, string> }) {
  const days = useMemo(() => Array.from({ length: trip.durationDays }, (_, i) => i + 1), [trip.durationDays]);
  const [day, setDay] = useState(days[0]);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const items = useMemo(() => trip.items.filter((i) => i.dayNumber === day), [trip.items, day]);
  const activeId = hoverId ?? pinnedId;
  const dayDate = isoDate(addDays(new Date(`${trip.startDate}T00:00:00Z`), day - 1));
  const dayCost = items.reduce((s, i) => s + i.estimatedCost, 0);
  const tripCost = trip.items.reduce((s, i) => s + i.estimatedCost, 0);

  const changeDay = useCallback((d: string) => {
    setDay(Number(d));
    setHoverId(null);
    setPinnedId(null);
  }, []);

  // Marker click -> pin + scroll the matching card into view.
  const selectFromMap = useCallback((id: string) => {
    setPinnedId(id);
    document.getElementById(`stop-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
                  <Wallet className="h-3 w-3" aria-hidden /> {BUDGET_LABEL[trip.budget]} · ~{formatCost(tripCost)} pp
                </Badge>
                {trip.vibeTags.map((v) => (
                  <Badge key={v} variant="emerald">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
            <Button asChild variant="accent">
              <a href={`/api/trips/${trip.id}/ics`} download>
                <Download className="h-4 w-4" aria-hidden /> Sync to Google Calendar
              </a>
            </Button>
          </header>

          <WeatherBanner lat={trip.centerLat} lng={trip.centerLng} selectedDate={dayDate} />

          <Tabs value={String(day)} onValueChange={changeDay}>
            <TabsList aria-label="Select day">
              {days.map((d) => (
                <TabsTrigger key={d} value={String(d)}>
                  Day {d}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex items-baseline justify-between text-sm text-muted-foreground">
            <span>
              {dayDate} · {items.length} stops
            </span>
            <span>~{formatCost(dayCost)} per person</span>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
              No stops planned for this day.
            </p>
          ) : (
            // key={day}: remount on tab change so the cards re-run their staggered entrance
            <ol key={day} className="space-y-3">
              {items.map((item, i) => (
                <ActivityCard
                  key={item.id}
                  item={item}
                  index={i}
                  active={activeId === item.id}
                  gcalHref={gcalLinks[item.id]}
                  onHover={setHoverId}
                  onSelect={setPinnedId}
                />
              ))}
            </ol>
          )}
        </section>

        {/* Right: 40% map */}
        <aside className="order-1 h-72 lg:order-2 lg:sticky lg:top-20 lg:col-span-2 lg:h-[calc(100vh-6.5rem)]">
          <TripMap
            items={items}
            center={{ lat: trip.centerLat, lng: trip.centerLng }}
            activeId={activeId}
            onSelect={selectFromMap}
          />
        </aside>
      </div>
    </div>
  );
}
