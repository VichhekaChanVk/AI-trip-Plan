import { NextResponse } from "next/server";
import { getWeather } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Valid lat and lng are required" }, { status: 400 });
  }
  try {
    return NextResponse.json(await getWeather(lat, lng));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Weather unavailable" }, { status: 502 });
  }
}
