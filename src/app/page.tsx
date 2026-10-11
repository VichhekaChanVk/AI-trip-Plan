import { CalendarCheck, CloudSun, Map as MapIcon } from "lucide-react";
import { PlannerForm } from "@/components/planner-form";

const FEATURES = [
  { icon: MapIcon, title: "Map-synced timeline", text: "Hover a stop, see its pin. Routes connect your day." },
  { icon: CloudSun, title: "Live forecast", text: "Real conditions and rain/heat alerts for your destination." },
  { icon: CalendarCheck, title: "One-click calendar", text: "Export every stop to Google Calendar or iCal as .ics events." },
];

const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
      <div className="mb-8 text-center">
        <h1 className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-5xl" style={step(0)}>
          Plan the trip. Skip the tabs.
        </h1>
        <p className="animate-fade-up mx-auto mt-4 max-w-xl text-balance text-muted-foreground" style={step(1)}>
          Tell Wayfarer where you&apos;re going. Get a day-by-day itinerary on a live map, checked against the
          forecast and ready for your calendar.
        </p>
      </div>

      <div className="animate-fade-up" style={step(2)}>
        <PlannerForm />
      </div>

      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <li
            key={title}
            className="animate-fade-up lift rounded-lg border bg-card p-4"
            style={step(4 + i)}
          >
            <Icon className="h-5 w-5 text-accent" aria-hidden />
            <h2 className="mt-3 text-sm font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
