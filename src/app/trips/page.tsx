import Link from "next/link";
import { CalendarDays, MapPin, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { BUDGET_LABEL, type Budget } from "@/lib/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeleteTripButton } from "@/components/delete-trip-button";
import { isoDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved trips - Wayfarer AI" };

export default async function TripsPage() {
  const userId = getUserId();
  const trips = userId
    ? await prisma.trip.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { items: true } } },
      })
    : [];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Saved trips</h1>
        <Button asChild>
          <Link href="/">
            <Plus className="h-4 w-4" aria-hidden /> New trip
          </Link>
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card className="animate-fade-up p-10 text-center">
          <MapPin className="wf-bob mx-auto mb-3 h-8 w-8 text-accent" aria-hidden />
          <p className="font-medium">No trips yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Generate your first itinerary and it will show up here.</p>
          <Button asChild className="mt-5">
            <Link href="/">Plan a trip</Link>
          </Button>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {trips.map((t, i) => (
            <li key={t.id} className="animate-fade-up" style={{ "--i": i } as React.CSSProperties}>
              <Card className="lift flex items-start justify-between gap-3 p-4 hover:border-slate-300">
                <Link href={`/itinerary/${t.id}`} className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-1.5 truncate font-semibold">
                    <MapPin className="h-4 w-4 shrink-0 text-accent" aria-hidden />
                    {t.destination}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                    {t.durationDays} days · from {isoDate(t.startDate)} · {t._count.items} stops
                  </p>
                  {t.weatherSummary && <p className="mt-2 text-xs text-muted-foreground">{t.weatherSummary}</p>}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{BUDGET_LABEL[t.budget as Budget]}</Badge>
                    {(typeof t.vibeTags === "string" ? (() => { try { return JSON.parse(t.vibeTags); } catch { return []; } })() : (t.vibeTags || [])).map((v: string) => (
                      <Badge key={v} variant="emerald">
                        {v}
                      </Badge>
                    ))}
                  </div>
                </Link>
                <DeleteTripButton id={t.id} destination={t.destination} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
