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
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <span className="wf-blob left-[5%] top-8 h-56 w-56 bg-emerald-300" />
        <span
          className="wf-blob right-[5%] top-20 h-64 w-64 bg-sky-300"
          style={{ "--fx": "-24px", "--fy": "18px", animationDelay: "-5s" } as React.CSSProperties}
        />
        <span
          className="wf-blob left-1/3 top-40 h-48 w-48 bg-indigo-300"
          style={{ "--fx": "16px", "--fy": "20px", animationDelay: "-9s" } as React.CSSProperties}
        />
      </div>

      <div className="mb-8 text-center">
        <h1 className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-5xl" style={step(0)}>
          Plan the trip. <span className="wf-gradient-text">Skip the tabs.</span>
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
          <li key={title}>
            <Reveal delay={i * 90} className="h-full">
              <div className="lift group h-full rounded-lg border bg-card p-4">
                <Icon className="wf-icon-pop h-5 w-5 text-accent" aria-hidden />
                <h2 className="mt-3 text-sm font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </main>
  );
}
