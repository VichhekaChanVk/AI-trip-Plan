import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toTripDTO } from "@/lib/trips";
import { googleCalendarLink } from "@/lib/calendar";
import { ItineraryView } from "@/components/itinerary-view";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const trip = await prisma.trip.findUnique({ where: { id }, include: { items: true } });
  return trip ? { dto: toTripDTO(trip), ownerId: trip.userId } : null;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const loaded = await load(params.id);
  return { title: loaded ? `${loaded.dto.destination} itinerary - Wayfarer AI` : "Trip not found" };
}

export default async function ItineraryPage({ params }: { params: { id: string } }) {
  const loaded = await load(params.id);
  if (!loaded) notFound();
  const trip = loaded.dto;
  const userId = getUserId();
  const isOwner = Boolean(userId) && userId === loaded.ownerId;

  const gcalLinks = Object.fromEntries(trip.items.map((i) => [i.id, googleCalendarLink(trip, i)]));
  return <ItineraryView trip={trip} gcalLinks={gcalLinks} isOwner={isOwner} />;
}
