"use client";

import { useEffect, useState } from "react";
import {
  BedDouble,
  Bus,
  Landmark,
  MapPin,
  Martini,
  Mountain,
  ShoppingBag,
  Ticket,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useInView } from "@/lib/use-motion";
import type { PlaceImage as PlaceImageData } from "@/lib/place-image";

const STYLE: Record<string, { icon: LucideIcon; bg: string }> = {
  food: { icon: UtensilsCrossed, bg: "from-orange-300 to-rose-400" },
  culture: { icon: Landmark, bg: "from-violet-300 to-indigo-400" },
  nature: { icon: Mountain, bg: "from-emerald-300 to-teal-500" },
  shopping: { icon: ShoppingBag, bg: "from-pink-300 to-fuchsia-400" },
  nightlife: { icon: Martini, bg: "from-indigo-400 to-slate-700" },
  entertainment: { icon: Ticket, bg: "from-amber-300 to-orange-400" },
  landmark: { icon: Landmark, bg: "from-sky-300 to-blue-500" },
  transit: { icon: Bus, bg: "from-slate-300 to-slate-500" },
  lodging: { icon: BedDouble, bg: "from-cyan-300 to-sky-500" },
};

// Survives day switches so each photo is looked up once per page visit.
const cache = new Map<string, PlaceImageData | null>();

export function PlaceImage({
  title,
  city,
  lat,
  lng,
  category,
  className,
}: {
  title: string;
  city: string;
  lat: number;
  lng: number;
  category: string;
  className?: string;
}) {
  const key = `${title}|${city}`;
  const { ref, seen } = useInView<HTMLDivElement>();
  const [image, setImage] = useState<PlaceImageData | null | undefined>(() => cache.get(key));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!seen || cache.has(key)) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ title, city, lat: String(lat), lng: String(lng) });
    fetch(`/api/place-image?${qs}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : { image: null }))
      .then((j: { image: PlaceImageData | null }) => {
        cache.set(key, j.image);
        setImage(j.image);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setImage(null);
      });
    return () => ctrl.abort();
  }, [seen, key, title, city, lat, lng]);

  const { icon: Icon, bg } = STYLE[category] ?? { icon: MapPin, bg: "from-slate-300 to-slate-500" };
  const showPhoto = !!image;

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-gradient-to-br", bg, className)}>
      {/* Placeholder sits underneath; the photo fades in over it once it has loaded. */}
      <Icon
        className={cn("absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 text-white/80 transition-opacity", showPhoto && loaded && "opacity-0")}
        aria-hidden
      />
      {image === undefined && <div className="absolute inset-0 bg-white/20 [animation:wf-shimmer_1.4s_linear_infinite]" />}
      {showPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- remote Wikimedia URLs, no next/image domain config needed
        <img
          src={image.url}
          alt={title}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setImage(null)}
          className={cn(
            "wf-photo absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      )}
      {showPhoto && loaded && (
        <a
          href={image.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          title={`Photo: Wikipedia, ${image.pageTitle}`}
          className="absolute bottom-1 right-1 rounded bg-black/45 px-1 text-[10px] leading-4 text-white/90 hover:bg-black/70"
        >
          Wikipedia
        </a>
      )}
    </div>
  );
}
