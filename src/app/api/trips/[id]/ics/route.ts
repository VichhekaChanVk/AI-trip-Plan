import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTripDTO } from "@/lib/trips";
import { buildIcs } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const dto = toTripDTO(trip);
  const ics = buildIcs(dto);
  const slug = dto.destination.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trip";

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="wayfarer-${slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
