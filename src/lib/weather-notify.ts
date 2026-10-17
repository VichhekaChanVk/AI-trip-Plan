// Client-only helpers: native (phone/desktop) notifications for weather alerts.
// Uses a service worker because Android Chrome does not allow `new Notification()`.

import type { Alert } from "@/lib/weather";

export type NotifyStatus = "unsupported" | "insecure" | "default" | "granted" | "denied";

export function notifyStatus(): NotifyStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!window.isSecureContext) return "insecure"; // needs https or localhost
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return "unsupported";
  return Notification.permission as NotifyStatus;
}

let regPromise: Promise<ServiceWorkerRegistration> | null = null;

function registration(): Promise<ServiceWorkerRegistration> {
  regPromise ??= navigator.serviceWorker
    .register("/sw.js")
    .then(() => navigator.serviceWorker.ready)
    .catch((e) => {
      regPromise = null; // allow a retry on the next click
      throw new Error(`Couldn't load /sw.js (${e instanceof Error ? e.message : e}). Restart the dev server.`);
    });
  return regPromise;
}

/** Must be called from a click (browsers block permission prompts otherwise). */
export async function enableNotifications(): Promise<NotifyStatus> {
  const s = notifyStatus();
  if (s === "unsupported" || s === "insecure") return s;
  await registration();
  return (await Notification.requestPermission()) as NotifyStatus;
}

// Same alert for the same place is shown at most once every 12 hours.
const SEEN_KEY = "wf-weather-alerts-seen";
const REPEAT_AFTER_MS = 12 * 60 * 60 * 1000;

function loadSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function saveSeen(seen: Record<string, number>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    /* storage blocked: alerts may repeat, which is acceptable */
  }
}

type Options = NotificationOptions & { vibrate?: number[]; renotify?: boolean };

/** Sends a notification for each new danger/warning alert. Info alerts stay in the card only. */
export async function notifyAlerts(alerts: Alert[], place: string, url: string) {
  if (notifyStatus() !== "granted") return;
  const urgent = alerts.filter((a) => a.severity !== "info");
  if (!urgent.length) return;

  const now = Date.now();
  const seen = Object.fromEntries(Object.entries(loadSeen()).filter(([, t]) => now - t < REPEAT_AFTER_MS));
  const fresh = urgent.filter((a) => !seen[`${place}|${a.text}`]);
  if (!fresh.length) return saveSeen(seen);

  const reg = await registration();
  for (const a of fresh) {
    const danger = a.severity === "danger";
    const options: Options = {
      body: a.text,
      tag: `wf-${place}-${a.text}`.slice(0, 120),
      requireInteraction: danger, // danger stays on screen until dismissed
      vibrate: danger ? [300, 120, 300, 120, 300] : [200],
      data: { url },
    };
    await reg.showNotification(danger ? `Weather danger in ${place}` : `Weather warning for ${place}`, options);
    seen[`${place}|${a.text}`] = now;
  }
  saveSeen(seen);
}

export async function sendTestAlert(place: string, url: string) {
  const reg = await registration();
  const options: Options = {
    body: "Storm alerts are working. You'll get one like this if a storm, strong wind or extreme heat is coming.",
    tag: "wf-test",
    vibrate: [200, 100, 200],
    data: { url },
  };
  await reg.showNotification(`Test alert for ${place}`, options);
}
