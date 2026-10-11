import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/user";
import { toTripDTO } from "@/lib/trips";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const trip = await prisma.trip.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json(toTripDTO(trip));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const userId = getUserId();
  if (!userId) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  // Scoped by owner: deleteMany returns count 0 instead of throwing for foreign ids.
  const { count } = await prisma.trip.deleteMany({ where: { id: params.id, userId } });
  if (count === 0) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
