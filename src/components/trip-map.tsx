"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ItemDTO } from "@/lib/schema";

type Props = {
  items: ItemDTO[]; // stops for the selected day, already ordered
  center: { lat: number; lng: number };
  activeId: string | null;
  onSelect: (id: string) => void;
};

/** Leaflet + OpenStreetMap tiles: no API key needed (fine for dev/low traffic; see OSM tile usage policy). */
export default function TripMap({ items, center, activeId, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef<Map<string, L.Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once.
  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView([center.lat, center.lng], 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    const mk = markers.current;
    return () => {
      mk.clear();
      m.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild pins + connector whenever the visible day changes.
  useEffect(() => {
    const m = map.current;
    const group = layer.current;
    if (!m || !group) return;

    group.clearLayers();
    markers.current.clear();

    const pts = items.map((i) => [i.lat, i.lng] as L.LatLngTuple);
    if (pts.length > 1) {
      L.polyline(pts, { color: "#0f172a", weight: 3, opacity: 0.6, dashArray: "6 8", className: "wf-route" }).addTo(group);
    }

    items.forEach((item, i) => {
      const icon = L.divIcon({
        className: "",
        html: `<div class="wf-marker" style="animation-delay:${i * 70}ms" role="button" aria-label="Stop ${i + 1}: ${item.title.replace(/"/g, "&quot;")}">${i + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([item.lat, item.lng], { icon, keyboard: true, title: item.title })
        .bindTooltip(`${item.timeBadge} · ${item.title}`, { direction: "top", offset: [0, -14] })
        .on("click", () => onSelectRef.current(item.id))
        .addTo(group);
      markers.current.set(item.id, marker);
    });

    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15, animate: true });
    else if (pts.length === 1) m.setView(pts[0], 14);
    else m.setView([center.lat, center.lng], 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Highlight the active pin and pan to it.
  useEffect(() => {
    markers.current.forEach((marker, id) => {
      const node = marker.getElement()?.firstElementChild;
      node?.classList.toggle("is-active", id === activeId);
      node?.classList.toggle("is-dim", activeId !== null && id !== activeId);
      marker.setZIndexOffset(id === activeId ? 1000 : 0);
    });
    const hit = activeId ? markers.current.get(activeId) : null;
    if (hit && map.current) map.current.panTo(hit.getLatLng(), { animate: true, duration: 0.4 });
  }, [activeId, items]);

  return <div ref={el} className="z-0 h-full min-h-64 w-full overflow-hidden rounded-lg border" />;
}
