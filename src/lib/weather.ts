// Keyless weather + geocoding via Open-Meteo (https://open-meteo.com) - no API key required.

export type WeatherIcon = "clear" | "partly" | "cloud" | "fog" | "drizzle" | "rain" | "snow" | "thunder";

export type CurrentWeather = {
  tempC: number;
  feelsLikeC: number;
  condition: string;
  description: string;
  icon: WeatherIcon;
  humidity: number;
  windKph: number;
  highC: number;
  lowC: number;
};

export type DayForecast = {
  date: string; // yyyy-mm-dd (destination local date)
  highC: number;
  lowC: number;
  condition: string;
  icon: WeatherIcon;
  precipChance: number; // 0-100
};

export type WeatherBundle = {
  current: CurrentWeather;
  forecast: DayForecast[];
  alerts: string[];
};

/** Open-Meteo always works; kept so callers don't need to special-case it. */
export function weatherConfigured() {
  return true;
}

/** WMO weather interpretation codes -> label + icon. */
function decode(code: number): { condition: string; icon: WeatherIcon } {
  if (code === 0) return { condition: "Clear sky", icon: "clear" };
  if (code <= 2) return { condition: "Partly cloudy", icon: "partly" };
  if (code === 3) return { condition: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { condition: "Fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { condition: "Drizzle", icon: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { condition: "Rain", icon: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { condition: "Snow", icon: "snow" };
  if (code >= 95) return { condition: "Thunderstorm", icon: "thunder" };
  return { condition: "Cloudy", icon: "cloud" };
}

/** Geocode a free-text destination. Returns null if unknown. */
export async function geocodeDestination(q: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const qs = new URLSearchParams({ name: q, count: "1", language: "en", format: "json" });
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${qs}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const r = (await res.json()).results?.[0] as
      | { name: string; admin1?: string; country?: string; latitude: number; longitude: number }
      | undefined;
    if (!r) return null;
    return {
      lat: r.latitude,
      lng: r.longitude,
      label: [r.name, r.admin1 && r.admin1 !== r.name ? r.admin1 : null, r.country].filter(Boolean).join(", "),
    };
  } catch {
    return null;
  }
}

type OpenMeteo = {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: (number | null)[];
  };
};

export async function getWeather(lat: number, lng: number): Promise<WeatherBundle> {
  const qs = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "16",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`, { next: { revalidate: 900 } });
  if (!res.ok) throw new Error(`Weather service error (${res.status})`);
  const j = (await res.json()) as OpenMeteo;

  const forecast: DayForecast[] = j.daily.time.map((date, i) => {
    const d = decode(j.daily.weather_code[i]);
    return {
      date,
      highC: Math.round(j.daily.temperature_2m_max[i]),
      lowC: Math.round(j.daily.temperature_2m_min[i]),
      condition: d.condition,
      icon: d.icon,
      precipChance: j.daily.precipitation_probability_max[i] ?? 0,
    };
  });

  const alerts: string[] = [];
  const rainy = forecast.filter((d) => d.precipChance >= 60).slice(0, 5);
  if (rainy.length) alerts.push(`Rain likely on ${rainy.map((d) => d.date.slice(5)).join(", ")} - pack an umbrella.`);
  if (forecast.some((d) => d.highC >= 33)) alerts.push("High heat expected - plan outdoor stops early and stay hydrated.");
  if (forecast.some((d) => d.lowC <= 0)) alerts.push("Freezing temperatures expected - dress in layers.");

  const c = decode(j.current.weather_code);
  return {
    current: {
      tempC: Math.round(j.current.temperature_2m),
      feelsLikeC: Math.round(j.current.apparent_temperature),
      condition: c.condition,
      description: c.condition.toLowerCase(),
      icon: c.icon,
      humidity: Math.round(j.current.relative_humidity_2m),
      windKph: Math.round(j.current.wind_speed_10m),
      highC: forecast[0]?.highC ?? Math.round(j.current.temperature_2m),
      lowC: forecast[0]?.lowC ?? Math.round(j.current.temperature_2m),
    },
    forecast,
    alerts,
  };
}

export function summarizeWeather(b: WeatherBundle) {
  const c = b.current;
  return `${c.tempC}°C, ${c.description} (H ${c.highC}° / L ${c.lowC}°, humidity ${c.humidity}%)`;
}

export function forecastForDate(bundle: WeatherBundle | null | undefined, date: string): DayForecast | undefined {
  return bundle?.forecast.find((d) => d.date === date);
}

export type WeatherKind = "wet" | "hot" | "cold" | "fine";

export function weatherKind(f: DayForecast): WeatherKind {
  if (f.precipChance >= 60 || ["rain", "drizzle", "thunder", "snow"].includes(f.icon)) return "wet";
  if (f.highC >= 33) return "hot";
  if (f.highC <= 8) return "cold";
  return "fine";
}

/** One line for the prompt, e.g. "Rain, 18-24°C, 90% chance of rain". */
export function describeForecast(f?: DayForecast): string {
  if (!f) return "no forecast available (use typical seasonal weather, do not claim a forecast)";
  return `${f.condition}, ${f.lowC}-${f.highC}°C, ${f.precipChance}% chance of rain`;
}
