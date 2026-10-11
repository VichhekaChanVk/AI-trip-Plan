# Wayfarer AI

AI travel planner: schema-enforced itineraries, a map-synced timeline, live weather, `.ics` calendar export and Postgres persistence.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` - Supabase (or any Postgres) connection strings
   - `OPENAI_API_KEY` (optional `OPENAI_MODEL`)
   - `OPENWEATHER_API_KEY` - used for geocoding, current weather and the 5-day forecast
   - `NEXT_PUBLIC_MAPBOX_TOKEN` - public `pk.` token
3. `npm run db:push` to create the `trips` and `itinerary_items` tables
4. `npm run dev` and open http://localhost:3000

## How it works

| Piece | Where |
| --- | --- |
| Structured LLM output (Zod schema via Vercel AI SDK `generateObject`) | `src/lib/schema.ts`, `src/lib/generate.ts` |
| Destination geocoding, plus dropping stops with hallucinated coordinates | `src/lib/weather.ts`, `src/lib/generate.ts` |
| Generate + persist endpoint | `src/app/api/generate-itinerary/route.ts` |
| Weather (current + forecast + alerts) | `src/lib/weather.ts`, `src/app/api/weather/route.ts` |
| 60/40 timeline + Mapbox map, numbered pins, walking route | `src/components/itinerary-view.tsx`, `trip-map.tsx` |
| `.ics` export and per-stop Google Calendar links | `src/lib/calendar.ts`, `src/app/api/trips/[id]/ics/route.ts` |
| Saved trips list, delete | `src/app/trips/page.tsx`, `src/app/api/trips/[id]/route.ts` |

## Notes

- **Identity:** there is no auth yet. Each browser gets an anonymous `wf_uid` cookie, stored as `trips.user_id`. Only the owner can delete a trip; anyone with the link can view it. Swap `src/lib/user.ts` for Supabase Auth to get real accounts.
- **Calendar times** are exported as floating local times (the stop's time at the destination), which is what you want for travel.
- The weather and map degrade gracefully (with a message) when their keys are missing.
