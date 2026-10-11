import { z } from "zod";

export const BUDGETS = ["SAVER", "BALANCED", "LUXURY"] as const;
export type Budget = (typeof BUDGETS)[number];

export const BUDGET_LABEL: Record<Budget, string> = {
  SAVER: "Saver",
  BALANCED: "Balanced",
  LUXURY: "Luxury",
};

export const VIBES = [
  "Foodie",
  "Anime",
  "Nature",
  "Culture",
  "Walkable",
  "History",
  "Art & Museums",
  "Nightlife",
  "Shopping",
  "Beaches",
  "Adventure",
  "Relaxing",
  "Romantic",
  "Family-friendly",
  "Photography",
  "Hidden gems",
  "Architecture",
  "Wellness & Spa",
  "Live music",
  "Coffee & Cafes",
] as const;

export const MAX_VIBES = 8;

/** Custom vibes are user text that ends up in an LLM prompt: keep letters, numbers and basic punctuation only. */
export function cleanVibe(v: string) {
  return v
    .replace(/[^\p{L}\p{N}\s&'\-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30);
}

export const CATEGORIES = [
  "food",
  "culture",
  "nature",
  "shopping",
  "nightlife",
  "entertainment",
  "landmark",
  "transit",
  "lodging",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Request body for POST /api/generate-itinerary */
export const generateRequestSchema = z.object({
  destination: z.string().trim().min(2, "Enter a destination").max(120),
  durationDays: z.coerce.number().int().min(1).max(10),
  budget: z.enum(BUDGETS),
  vibeTags: z
    .array(z.string().transform(cleanVibe))
    .transform((a) => [...new Set(a.filter(Boolean))].slice(0, MAX_VIBES))
    .default([]),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** Schema the LLM is forced to satisfy (structured output). */
export const stopSchema = z.object({
  time: z.string().describe("Local start time, 24-hour HH:MM, e.g. 09:30"),
  title: z.string().describe("Name of the specific real place or activity"),
  description: z.string().describe("1-2 sentences: what to do and why it fits the traveller"),
  categoryTag: z.enum(CATEGORIES),
  estimatedHours: z.number().min(0.25).max(10).describe("Time spent at this stop, in hours"),
  estimatedCost: z.number().min(0).describe("Per-person cost in USD; 0 if free"),
  latitude: z.number().min(-90).max(90).describe("Latitude of the real place, decimal degrees"),
  longitude: z.number().min(-180).max(180).describe("Longitude of the real place, decimal degrees"),
  transitNote: z.string().describe("How to get here from the previous stop (mode + minutes). For the first stop: from the city centre/hotel."),
});

export const daySchema = z.object({
  dayNumber: z.number().int().min(1),
  theme: z.string().describe("Short theme for the day"),
  stops: z.array(stopSchema).min(3).max(8),
});

export const itinerarySchema = z.object({
  destinationLabel: z.string().describe("Canonical 'City, Country' name"),
  centerLatitude: z.number().min(-90).max(90),
  centerLongitude: z.number().min(-180).max(180),
  summary: z.string().describe("One-sentence pitch of the trip"),
  days: z.array(daySchema).min(1).max(10),
});
export type GeneratedItinerary = z.infer<typeof itinerarySchema>;

/** Shapes shared with the client. */
export type ItemDTO = {
  id: string;
  dayNumber: number;
  sortOrder: number;
  title: string;
  description: string;
  timeBadge: string;
  lat: number;
  lng: number;
  categoryTag: string;
  costInfo: string;
  estimatedCost: number;
  estimatedHours: number;
  transitNote: string | null;
};

export type TripDTO = {
  id: string;
  destination: string;
  durationDays: number;
  budget: Budget;
  vibeTags: string[];
  weatherSummary: string | null;
  startDate: string; // yyyy-mm-dd
  centerLat: number;
  centerLng: number;
  summary: string | null;
  createdAt: string;
  items: ItemDTO[];
};
