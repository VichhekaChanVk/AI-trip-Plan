"use client";

import { CalendarPlus, Clock, Footprints, Umbrella, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PlaceImage } from "@/components/place-image";
import { cn } from "@/lib/utils";
import type { ItemDTO } from "@/lib/schema";

export function ActivityCard({
  item,
  index,
  city,
  active,
  gcalHref,
  onHover,
  onSelect,
}: {
  item: ItemDTO;
  index: number;
  city: string;
  active: boolean;
  gcalHref: string;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <li
      id={`stop-${item.id}`}
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      className="animate-fade-up relative"
      style={{ "--i": index } as React.CSSProperties}
    >
      {item.transitNote && index > 0 && (
        <p className="mb-2 ml-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Footprints className="h-3.5 w-3.5" aria-hidden /> {item.transitNote}
        </p>
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(item.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect(item.id);
          }
        }}
        onFocus={() => onHover(item.id)}
        onBlur={() => onHover(null)}
        className={cn(
          "lift group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row",
          active ? "border-accent ring-1 ring-accent" : "hover:border-slate-300",
        )}
      >
        <div className="relative h-44 shrink-0 sm:h-auto sm:min-h-40 sm:w-44">
          <PlaceImage
            title={item.title}
            city={city}
            lat={item.lat}
            lng={item.lng}
            category={item.categoryTag}
            className="absolute inset-0"
          />
          <span
            className={cn(
              "absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white shadow-md ring-2 ring-white transition-colors",
              active ? "bg-accent" : "bg-primary",
            )}
            aria-hidden
          >
            {index + 1}
          </span>
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold leading-tight">{item.title}</h3>
            <Badge variant="emerald" className="capitalize">
              {item.categoryTag}
            </Badge>
            {item.indoor && (
              <Badge variant="outline" title="Mostly indoors / sheltered">
                <Umbrella className="h-3 w-3" aria-hidden /> Indoor
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">{item.description}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 font-medium text-foreground">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {item.timeBadge}
              <span className="font-normal text-muted-foreground">· ~{item.estimatedHours}h</span>
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="h-3.5 w-3.5" aria-hidden /> {item.costInfo}
            </span>
            <a
              href={gcalHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted"
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden /> Add to Google Calendar
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}
