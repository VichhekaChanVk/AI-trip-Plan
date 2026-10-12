# Wayfarer AI

An AI travel planner. Enter one to four cities, the trip length, a budget and your interests. Wayfarer AI generates a day-by-day itinerary that adapts to the real weather forecast. It shows the plan on a map-synced timeline with a photo for every stop.

Built for FESE307.

## Features

| Feature | How it works | Where |
| --- | --- | --- |
| Schema-enforced itinerary | The LLM must return JSON matching a Zod schema (Vercel AI SDK `generateObject`) | `src/lib/schema.ts`, `src/lib/generate.ts` |
| Hallucination guard | Cities are geocoded first; any stop more than 60 km from its day's city centre is dropped | `src/lib/generate.ts`, `src/lib/context.ts` |
| Weather-aware planning | The 16-day forecast is fetched **before** generation and given to the model per day (rules for wet / hot / cold days); each stop has an `indoor` flag | `src/lib/weather.ts`, `src/lib/context.ts` |
| Multi-city trips | Up to 4 cities; days are split across them, each city is geocoded, and transit is planned on travel days | `src/lib/plan.ts`, `src/lib/context.ts` |
| Dietary & accessibility | Chips such as Vegetarian, Halal or Wheelchair accessible become hard constraints in the prompt | `src/lib/schema.ts` (`NEEDS`), `src/lib/generate.ts` |
| Hidden gems mode | Adds an "avoid tourist traps" hard constraint | `src/lib/generate.ts` |
| Notes import (lite) | Paste a caption or notes; the text is sanitised and used as ideas. Links are not fetched | `src/lib/schema.ts` (`cleanNotes`) |
| Map and timeline | Numbered pins on a Leaflet / OpenStreetMap map, synced with the stop cards | `src/components/trip-map.tsx`, `src/components/itinerary-view.tsx` |
| Place photos | Each stop shows a Wikipedia photo (article search, then nearest article); falls back to a category placeholder | `src/lib/place-image.ts`, `src/components/place-image.tsx` |
| Live weather | Current conditions, the selected day's forecast, and rain / heat / freezing alerts | `src/components/weather-banner.tsx` |
| Budget breakdown | Per day and per trip: food, transport, activities and lodging | `src/lib/budget.ts`, `src/components/day-budget.tsx` |
| Regenerate one day | Re-plans one day with the same constraints, avoiding places used on other days | `src/app/api/trips/[id]/days/[day]/regenerate` |
| Packing list | AI list based on destination, season, forecast, activities and needs; saved with the trip | `src/app/api/trips/[id]/packing`, `src/components/packing-list.tsx` |
| Booking links | Pre-filled redirect links to Booking.com (hotels per city) and Google Flights. No prices or booking inside the app | `src/lib/booking.ts`, `src/components/booking-links.tsx` |
| Calendar export | `.ics` download plus per-stop Google Calendar links | `src/lib/calendar.ts` |
| PDF export | Print stylesheet plus the browser's "Save as PDF"; prints every day and hides the map and buttons | `src/components/print-view.tsx` |
| Saved trips | Every trip is stored and can be reopened; only the browser that created it can change or delete it | `src/app/trips` |
| Motion | Staggered entrances, scroll reveals and hover effects; all reduced or turned off for users who prefer reduced motion | `src/app/globals.css`, `src/lib/use-motion.ts` |

## Tech stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS, Radix UI, lucide-react |
| AI | Vercel AI SDK with any OpenAI-compatible API (DeepSeek by default, OpenAI supported) |
| Validation | Zod |
| Database | SQLite through Prisma |
| Maps | Leaflet with OpenStreetMap tiles (no key) |
| Weather and geocoding | Open-Meteo (no key) |
| Place photos | Wikipedia / Wikimedia API (no key) |
| Calendar | `ics` package |

## How a trip is generated

1. The planner form sends the cities, days, start date, budget, vibes, needs, hidden-gems flag and notes to `POST /api/generate-itinerary`.
2. The server validates the input with Zod and checks that the database is reachable.
3. Each city is geocoded with Open-Meteo, and its 16-day forecast is fetched (best effort).
4. The LLM receives the cities, coordinates, dates, each day's forecast and the traveller's preferences. It must return an itinerary matching the schema.
5. Stops more than 60 km from their day's city centre are dropped, and times are normalised.
6. The trip is saved with Prisma, tagged with the anonymous `wf_uid` cookie.
7. The API returns the trip id, and the browser opens `/itinerary/[id]`.

## Getting started

### Prerequisites

- Node.js 18.17 or newer
- An API key for DeepSeek or OpenAI

### Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the example environment file, then add your API key to `.env`:

   ```bash
   cp .env.example .env
   ```

3. Create the database tables. Run this again whenever you pull schema changes:

   ```bash
   npm run db:push
   ```

4. Start the development server, then open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Environment variables

Copy `.env.example` to `.env`. Never commit `.env` or share real API keys. All variables are read on the server only.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | SQLite file path. Default: `file:./dev.db` |
| `DEEPSEEK_API_KEY` | Yes (or `OPENAI_API_KEY`) | API key for DeepSeek, the default provider |
| `DEEPSEEK_BASE_URL` | No | Default: `https://api.deepseek.com/v1` |
| `DEEPSEEK_MODEL` | No | Default: `deepseek-chat` |
| `OPENAI_API_KEY` | Alternative | Use OpenAI instead of DeepSeek |
| `OPENAI_BASE_URL` | With OpenAI | Set to `https://api.openai.com/v1` |
| `OPENAI_MODEL` | With OpenAI | For example `gpt-4o-mini` |

**Using OpenAI:** remove or comment out all three `DEEPSEEK_*` lines. When they are set, they take priority over the `OPENAI_*` values.

Weather, geocoding, maps, place photos and booking links need no keys.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm run db:push` | Create or update the database tables |
| `npm run db:studio` | Open Prisma Studio to browse the data |

## Project structure

```
prisma/schema.prisma              Database models (Trip, ItineraryItem)
docs/SECURITY.md                  Data flow, personal data, AI risks
src/app/                          Pages and API routes (App Router)
  api/generate-itinerary/         Generate and save an itinerary
  api/trips/[id]/                 Get or delete a trip
  api/trips/[id]/ics/             .ics calendar export
  api/trips/[id]/days/[day]/      Regenerate one day (owner only)
  api/trips/[id]/packing/         Generate the packing list (owner only)
  api/weather/                    Weather proxy (Open-Meteo)
  api/place-image/                Place photo lookup (Wikipedia)
  itinerary/[id]/                 Itinerary page
  trips/                          Saved trips list
src/components/                   UI components (planner form, map, timeline, weather, booking, photos)
src/lib/                          Core logic
  generate.ts                     LLM calls and output sanitising
  context.ts, plan.ts             Geocoding, forecasts and the day-by-city plan
  schema.ts                       Zod schemas and shared types
  weather.ts                      Open-Meteo geocoding and forecast
  place-image.ts                  Wikipedia photo search
  booking.ts                      Booking.com and Google Flights links
  calendar.ts                     .ics and Google Calendar links
  budget.ts                       Cost breakdown
  user.ts                         Anonymous cookie identity
```

## Security and privacy

- There are no accounts. Each browser gets an anonymous `wf_uid` cookie (httpOnly, SameSite=Lax), stored with every trip.
- Only the browser that created a trip can delete it, regenerate a day or generate its packing list. Anyone with the trip link can view it, including its dietary/accessibility needs and notes.
- API keys are read on the server only and are never sent to the browser. `.env` and `prisma/dev.db` are ignored by Git.
- User text that reaches the prompt (custom vibes, notes) is sanitised and length-limited, and the notes are marked as untrusted in the prompt.

See [docs/SECURITY.md](docs/SECURITY.md) for the full data flow, third parties, personal data handling, and the main AI risk with its mitigations.

## Known limitations

- **No real authentication yet.** Swap `src/lib/user.ts` for an auth provider to add accounts.
- **No rate limiting** on the AI endpoints, so repeated calls can run up LLM costs.
- **AI output can be wrong.** Places, prices and opening times are AI estimates and are not checked against a places database. Check them before you travel.
- **Forecasts cover only 16 days.** Later dates are planned for typical seasonal weather.
- **Photos are the nearest Wikipedia match.** For small venues they often show the surrounding area.
- **Booking links are redirects, not an integration.** The Booking.com and Google Flights URL formats are not public APIs and may change.
- **Calendar times** are exported as floating local times (the stop's time at the destination).
- **OpenStreetMap's public tile servers** are meant for development and low traffic.
