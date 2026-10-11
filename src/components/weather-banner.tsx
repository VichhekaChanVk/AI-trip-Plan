"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { WeatherBundle, WeatherIcon } from "@/lib/weather";

const GLYPHS = {
  clear: Sun,
  partly: CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  thunder: CloudLightning,
} as const;

function WeatherGlyph({ icon, className }: { icon: WeatherIcon; className?: string }) {
  const Icon = GLYPHS[icon] ?? Cloud;
  return <Icon className={className} aria-hidden />;
}

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: WeatherBundle };

export function WeatherBanner({ lat, lng, selectedDate }: { lat: number; lng: number; selectedDate: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });
    fetch(`/api/weather?lat=${lat}&lng=${lng}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Weather unavailable");
        setState({ status: "ok", data: j });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setState({ status: "error", message: e.message });
      });
    return () => ctrl.abort();
  }, [lat, lng]);

  if (state.status === "loading") return <Skeleton className="h-24 w-full" />;

  if (state.status === "error") {
    return (
      <Card className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
        <CloudOff className="h-5 w-5" aria-hidden />
        Live weather isn&apos;t available right now ({state.message}).
      </Card>
    );
  }

  const { current, forecast, alerts } = state.data;
  const dayForecast = forecast.find((d) => d.date === selectedDate);

  return (
    <Card className="animate-fade-up p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted" title={current.condition}>
            <WeatherGlyph icon={current.icon} className="h-8 w-8 text-slate-700" />
          </span>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tracking-tight">{current.tempC}°C</span>
              <span className="text-sm capitalize text-muted-foreground">{current.description}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Now · feels like {current.feelsLikeC}° · H {current.highC}° / L {current.lowC}°
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            <Droplets className="h-3 w-3" aria-hidden /> {current.humidity}% humidity
          </Badge>
          <Badge variant="outline">
            <Wind className="h-3 w-3" aria-hidden /> {current.windKph} km/h
          </Badge>
          {dayForecast && (
            <Badge variant="emerald">
              <Thermometer className="h-3 w-3" aria-hidden /> This day: {dayForecast.highC}° / {dayForecast.lowC}° ·{" "}
              {dayForecast.condition} · {dayForecast.precipChance}% rain
            </Badge>
          )}
        </div>
      </div>

      {alerts.length > 0 && (
        <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
          {alerts.map((a) => (
            <li key={a} className="flex items-start gap-2 text-amber-700">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {a}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
