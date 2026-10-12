import { geocodeDestination, getWeather, forecastForDate, type WeatherBundle } from "./weather";
import { allocateDays } from "./plan";
import { addDays, isoDate } from "./utils";
import type { CityGeo, DayPlan } from "./generate";

export function shortName(label: string) {
  return label.split(",")[0].trim() || label;
}

/** Geocode each requested city. Multi-city trips need every city found; a single city may fall back to the model's own centre. */
export async function resolveCities(destinations: string[]): Promise<{ cities: CityGeo[] } | { error: string }> {
  const geos = await Promise.all(destinations.map((d) => geocodeDestination(d)));
  if (destinations.length > 1) {
    const bad = geos.findIndex((g) => !g);
    if (bad >= 0) return { error: `Couldn't find "${destinations[bad]}". Check the spelling or try a bigger nearby city.` };
  }
  return {
    cities: destinations.map((name, i) => {
      const g = geos[i];
      return g ? { name: shortName(g.label), label: g.label, lat: g.lat, lng: g.lng } : { name, label: name };
    }),
  };
}

/** Best-effort forecast per city (null when unavailable). Never throws. */
export async function loadForecasts(cities: CityGeo[]): Promise<(WeatherBundle | null)[]> {
  return Promise.all(
    cities.map((c) =>
      c.lat !== undefined && c.lng !== undefined ? getWeather(c.lat, c.lng).catch(() => null) : Promise.resolve(null),
    ),
  );
}

/** One DayPlan per trip day: which city, which date, and that day's forecast if the forecast window covers it. */
export function buildDayPlans(
  cities: CityGeo[],
  bundles: (WeatherBundle | null)[],
  startDate: Date,
  durationDays: number,
): DayPlan[] {
  return allocateDays(durationDays, cities.length).map((cityIndex, i) => {
    const date = isoDate(addDays(startDate, i));
    return { dayNumber: i + 1, date, cityIndex, forecast: forecastForDate(bundles[cityIndex], date) };
  });
}

export function seasonOf(lat: number, startDate: string) {
  const month = Number(startDate.slice(5, 7));
  const north = ["winter", "winter", "spring", "spring", "spring", "summer", "summer", "summer", "autumn", "autumn", "autumn", "winter"][month - 1] ?? "summer";
  const flip: Record<string, string> = { winter: "summer", summer: "winter", spring: "autumn", autumn: "spring" };
  return lat < 0 ? flip[north] : north;
}
