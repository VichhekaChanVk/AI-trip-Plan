import { CalendarCheck, CloudSun, Map as MapIcon } from "lucide-react";
import { PlannerForm } from "@/components/planner-form";
import { Reveal } from "@/components/reveal";

const FEATURES = [
  { icon: MapIcon, title: "Map-synced timeline", text: "Hover a stop, see its pin. Routes connect your day." },
  { icon: CloudSun, title: "Live forecast", text: "Real conditions and rain/heat alerts for your destination." },
  { icon: CalendarCheck, title: "One-click calendar", text: "Export every stop to Google Calendar or iCal as .ics events." },
];

const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

export default function HomePage() {
  return (
    <main className="relative isolate mx-auto max-w-3xl px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
      {/* Single intentional radial gradient — one moment of colour, fades to nothing */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,hsl(160_84%_88%/0.55),transparent)] dark:bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,hsl(160_84%_18%/0.4),transparent)]" />
      </div>

      <div className="mb-8 text-center">
        <h1
          className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-5xl"
          style={step(0)}
        >
          Plan the trip. Skip the tabs.
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-xl text-balance text-muted-foreground"
          style={step(1)}
        >
          Tell Wayfarer where you&apos;re going. Get a day-by-day itinerary on a live map, checked
          against the forecast and ready for your calendar.
        </p>
      </div>

      <div className="animate-fade-up" style={step(2)}>
        <PlannerForm />
      </div>

      <ul className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, i) => (
          <li key={title}>
            <Reveal delay={i * 80}>
              <Icon className="h-5 w-5 text-accent" aria-hidden />
              <h2 className="mt-3 text-sm font-semibold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </Reveal>
          </li>
        ))}
      </ul>
    </main>
  );
}
