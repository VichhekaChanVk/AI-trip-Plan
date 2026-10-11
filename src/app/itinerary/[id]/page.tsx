import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { toTripDTO } from "@/lib/trips";
import { googleCalendarLink } from "@/lib/calendar";
import { ItineraryView } from "@/components/itinerary-view";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const trip = await prisma.trip.findUnique({ where: { id }, include: { items: true } });
  return trip ? toTripDTO(trip) : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const trip = await load(params.id);
  return { title: trip ? `${trip.destination} itinerary - Wayfarer AI` : "Trip not found" };
}

export default async function ItineraryPage({ params }: { params: { id: string } }) {
  const trip = await load(params.id);
  if (!trip) notFound();

  const gcalLinks = Object.fromEntries(trip.items.map((i) => [i.id, googleCalendarLink(trip, i)]));
  return <ItineraryView trip={trip} gcalLinks={gcalLinks} />;
}
