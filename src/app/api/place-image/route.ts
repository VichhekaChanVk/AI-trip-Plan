import { NextResponse } from "next/server";
import { findPlaceImage } from "@/lib/place-image";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get("title") ?? "").trim().slice(0, 200);
  const city = (searchParams.get("city") ?? "").trim().slice(0, 120);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (title.length < 2) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const coordsOk = searchParams.has("lat") && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const image = await findPlaceImage(title, city, coordsOk ? lat : undefined, coordsOk ? lng : undefined);

  return NextResponse.json(
    { image },
    { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } },
  );
}
