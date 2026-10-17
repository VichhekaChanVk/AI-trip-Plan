"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Info,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Alert, AlertSeverity, WeatherBundle, WeatherIcon } from "@/lib/weather";
import { enableNotifications, notifyAlerts, notifyStatus, sendTestAlert, type NotifyStatus } from "@/lib/weather-notify";

const REFRESH_MS = 15 * 60 * 1000; // re-check weather every 15 min while the page is open

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

const ALERT_STYLES: Record<AlertSeverity, { li: string; icon: React.ElementType; iconClass: string }> = {
  danger: {
    li: "border-l-2 border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    icon: AlertCircle,
    iconClass: "animate-pulse",
  },
  warning: {
    li: "border-l-2 border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    icon: TriangleAlert,
    iconClass: "",
  },
  info: {
    li: "border-l-2 border-sky-400 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
    icon: Info,
    iconClass: "",
  },
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { danger: 0, warning: 1, info: 2 };

function AlertItem({ alert }: { alert: Alert }) {
  const s = ALERT_STYLES[alert.severity] ?? ALERT_STYLES.info;
  const Icon = s.icon;
  return (
    <li className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${s.li}`}>
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.iconClass}`} aria-hidden />
      <span>{alert.text}</span>
    </li>
  );
}

function AlertsToggle({ status, onEnable, onTest }: { status: NotifyStatus; onEnable: () => void; onTest: () => void }) {
  if (status === "default") {
    return (
      <Button size="sm" variant="outline" onClick={onEnable}>
        <Bell className="h-3.5 w-3.5" aria-hidden /> Turn on storm alerts
      </Button>
    );
  }
  if (status === "granted") {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <BellRing className="h-3.5 w-3.5 text-accent" aria-hidden /> Storm alerts on
        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onTest}>
          Send test
        </Button>
      </span>
    );
  }
  const message = {
    denied: "Notifications are blocked. Allow them in your browser's site settings to get storm alerts.",
    insecure: "Storm alerts need a secure connection (https or localhost).",
    unsupported: "This browser can't show notifications. On iPhone, add the app to your Home Screen first.",
  }[status];
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <BellOff className="h-3.5 w-3.5 shrink-0" aria-hidden /> {message}
    </span>
  );
}

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: WeatherBundle };

export function WeatherBanner({
  lat,
  lng,
  selectedDate,
  place = "your destination",
}: {
  lat: number;
  lng: number;
  selectedDate: string;
  place?: string;
}) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [notify, setNotify] = useState<NotifyStatus>("unsupported");
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const placeRef = useRef(place);
  placeRef.current = place;

  // Read permission after mount (window is not available during SSR).
  useEffect(() => setNotify(notifyStatus()), []);

  useEffect(() => {
    const ctrl = new AbortController();
    setState({ status: "loading" });

    const load = () =>
      fetch(`/api/weather?lat=${lat}&lng=${lng}`, { signal: ctrl.signal, cache: "no-store" })
        .then(async (r) => {
          const j = await r.json();
          if (!r.ok) throw new Error(j.error ?? "Weather unavailable");
          setState({ status: "ok", data: j });
          notifyAlerts(j.alerts ?? [], placeRef.current, window.location.pathname).catch(() => {});
        })
        .catch((e) => {
          // keep the last good reading if a background refresh fails
          if (e.name !== "AbortError") setState((s) => (s.status === "ok" ? s : { status: "error", message: e.message }));
        });

    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [lat, lng]);

  const handleEnable = useCallback(async () => {
    setNotifyMsg(null);
    try {
      const s = await enableNotifications();
      setNotify(s);
      if (s !== "granted") return;
      const urgent = state.status === "ok" ? state.data.alerts.filter((a) => a.severity !== "info") : [];
      if (urgent.length) {
        await notifyAlerts(urgent, place, window.location.pathname);
      } else {
        setNotifyMsg(`No storms or severe weather for ${place} right now. You'll get a notification if that changes.`);
      }
    } catch (e) {
      setNotifyMsg(e instanceof Error ? e.message : "Couldn't turn on alerts.");
    }
  }, [state, place]);

  const handleTest = useCallback(async () => {
    setNotifyMsg(null);
    try {
      await sendTestAlert(place, window.location.pathname);
      setNotifyMsg("Test sent. If nothing popped up, notifications are off in your system settings.");
    } catch (e) {
      setNotify(notifyStatus());
      setNotifyMsg(e instanceof Error ? e.message : "Couldn't send the test alert.");
    }
  }, [place]);

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
  const sortedAlerts = [...alerts].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  );
  const hasDanger = alerts.some((a) => a.severity === "danger");

  return (
    <Card className={`animate-fade-up p-4 ${hasDanger ? "ring-1 ring-red-400/60 dark:ring-red-600/50" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted" title={current.condition}>
            <WeatherGlyph icon={current.icon} className="h-8 w-8 text-slate-700 dark:text-slate-300" />
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
            <Badge key={dayForecast.date} variant="emerald" className="animate-fade-in">
              <Thermometer className="h-3 w-3" aria-hidden /> This day: {dayForecast.highC}° / {dayForecast.lowC}° ·{" "}
              {dayForecast.condition} · {dayForecast.precipChance}% rain
            </Badge>
          )}
        </div>
      </div>

      {sortedAlerts.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {sortedAlerts.map((a, i) => (
            <AlertItem key={`${a.severity}-${i}`} alert={a} />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-x-3 gap-y-1 border-t pt-3">
        {notifyMsg && (
          <p className="mr-auto text-xs text-muted-foreground" role="status">
            {notifyMsg}
          </p>
        )}
        <AlertsToggle status={notify} onEnable={handleEnable} onTest={handleTest} />
      </div>
    </Card>
  );
}
