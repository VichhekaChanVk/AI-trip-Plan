import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import {
  BUDGET_LABEL,
  itinerarySchema,
  type GenerateRequest,
  type GeneratedItinerary,
} from "./schema";
import { haversineKm } from "./utils";

const openai = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1",
});

const BUDGET_GUIDE = {
  SAVER: "Budget traveller: street food, free sights, public transit, hostels-level spend. Aim for under ~$60/day total.",
  BALANCED: "Mid-range: mix of local restaurants and a few paid highlights. Roughly $120-200/day total.",
  LUXURY: "High-end: fine dining, private/premium experiences, taxis. $350+/day total.",
} as const;

export async function generateItinerary(req: GenerateRequest, hint?: { lat: number; lng: number; label: string } | null) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI API Key (DEEPSEEK_API_KEY or OPENAI_API_KEY) is not set");

  const modelName = process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-chat";

  const { object } = await generateObject({
    model: openai(modelName),
    schema: itinerarySchema,
    schemaName: "Itinerary",
    temperature: 0.6,
    maxRetries: 2,
    system: [
      "You are an expert local travel planner. You output ONLY data matching the provided JSON schema.",
      "Rules:",
      "- Use real, currently-operating, specific named places (no generic 'a local cafe').",
      "- latitude/longitude must be the real coordinates of that exact place, in decimal degrees (5 decimals).",
      "- Order each day's stops chronologically and geographically so travel between consecutive stops is short.",
      "- Include a lunch and dinner food stop each day (unless the vibe makes it redundant), 4-6 stops/day.",
      "- Start times between 07:30 and 22:00, with realistic gaps for travel. estimatedHours includes visiting time only.",
      "- estimatedCost is USD per person for that stop (0 if free) and must respect the budget level.",
      "- transitNote must state mode and duration from the previous stop, e.g. 'Metro, 12 min' or 'Walk, 8 min'.",
      "- Vary days: do not repeat places; give each day a distinct theme.",
    ].join("\n"),
    prompt: [
      `Plan a ${req.durationDays}-day trip to ${req.destination}${hint ? ` (centre ≈ ${hint.lat.toFixed(4)}, ${hint.lng.toFixed(4)})` : ""}.`,
      `Budget: ${BUDGET_LABEL[req.budget]} - ${BUDGET_GUIDE[req.budget]}`,
      `Interests/vibe: ${req.vibeTags.length ? req.vibeTags.join(", ") : "balanced mix of highlights"}.`,
      req.vibeTags.includes("Walkable") ? "Keep each day geographically compact; prefer walking between stops." : "",
      `Return exactly ${req.durationDays} days numbered 1..${req.durationDays}.`,
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return sanitize(object, req, hint);
}

function normalizeTime(t: string) {
  const m = t.match(/(\d{1,2})\s*[:.h]\s*(\d{2})\s*(am|pm)?/i) ?? t.match(/(\d{1,2})\s*(am|pm)/i);
  if (!m) return "09:00";
  let h = Number(m[1]);
  const min = m[2] && /^\d+$/.test(m[2]) ? Number(m[2]) : 0;
  const mer = (m[3] ?? (m[2] && /am|pm/i.test(m[2]) ? m[2] : "")).toLowerCase();
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return `${String(Math.min(h, 23)).padStart(2, "0")}:${String(Math.min(min, 59)).padStart(2, "0")}`;
}

/**
 * LLMs hallucinate coordinates. Anchor on a geocoded centre when we have one and
 * drop any stop that lands implausibly far from it (>60 km), then re-validate shape.
 */
function sanitize(
  raw: GeneratedItinerary,
  req: GenerateRequest,
  hint?: { lat: number; lng: number; label: string } | null,
): GeneratedItinerary {
  const center = hint ? { lat: hint.lat, lng: hint.lng } : { lat: raw.centerLatitude, lng: raw.centerLongitude };
  const MAX_KM = 60;

  const days = raw.days
    .slice(0, req.durationDays)
    .map((d, idx) => ({
      ...d,
      dayNumber: idx + 1,
      stops: d.stops
        .map((s) => ({ ...s, time: normalizeTime(s.time) }))
        .filter((s) => haversineKm(center, { lat: s.latitude, lng: s.longitude }) <= MAX_KM)
        .sort((a, b) => a.time.localeCompare(b.time)),
    }))
    .filter((d) => d.stops.length > 0);

  if (days.length === 0) throw new Error("The model returned no usable stops. Try again or rephrase the destination.");

  return {
    ...raw,
    destinationLabel: hint?.label ?? raw.destinationLabel,
    centerLatitude: center.lat,
    centerLongitude: center.lng,
    days,
  };
}
