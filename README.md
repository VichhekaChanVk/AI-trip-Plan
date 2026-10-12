# Wayfarer AI

AI travel planner: schema-enforced itineraries, weather-aware planning, a map-synced timeline, `.ics` calendar export and SQLite persistence.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in the AI key (`DEEPSEEK_API_KEY` or `OPENAI_API_KEY`).
3. `npm run db:push` to create/update the tables (run it again after pulling schema changes)
4. `npm run dev` and open http://localhost:3000

Weather, geocoding (Open-Meteo) and the map (Leaflet + OpenStreetMap) need no keys.

## Features

| Feature | How it works | Where |
| --- | --- | --- |
| Day-by-day itinerary | Zod schema enforced via Vercel AI SDK `generateObject`; stops >60 km from the city centre are dropped (hallucinated coordinates) | `src/lib/schema.ts`, `src/lib/generate.ts` |
| Weather-aware planning | The 16-day forecast is fetched **before** generation and put in the prompt per day (wet / hot / cold rules); each stop carries an `indoor` flag so behaviour can be tested | `src/lib/context.ts`, `src/lib/weather.ts`, `generate.ts` |
| Multi-city (up to 4) | Days are split evenly across cities; each city is geocoded; the prompt asks for inter-city transit on the first day in a new city | `src/lib/plan.ts`, `context.ts` |
| Dietary / accessibility | Form chips become HARD CONSTRAINTS in the prompt | `schema.ts` (`NEEDS`), `generate.ts` |
| Hidden gems mode | Toggle adds a "avoid tourist traps" hard constraint | `generate.ts` |
| Budget breakdown | Per day and per trip: food / transport / activities / lodging, computed from per-stop `estimatedCost` + `transitCost` | `src/lib/budget.ts`, `day-budget.tsx` |
| Regenerate one day | Re-plans a single day with the same constraints, avoiding places on other days; swapped in one DB transaction | `api/trips/[id]/days/[day]/regenerate` |
| Packing list | AI list from destination, season, forecast, activities and needs; saved on the trip | `api/trips/[id]/packing`, `packing-list.tsx` |
| PDF export | Print stylesheet + `window.print()` (browser "Save as PDF"); prints every day, hides map and buttons | `print-view.tsx` |
| Flights / hotels | **Redirect links to Trip.com only** (no prices, no booking in-app). URL format is isolated in one file | `src/lib/booking.ts` |
| Social media "import" (lite) | The user pastes caption/notes text; it is sanitised and used as ideas. Links are NOT fetched | `schema.ts` (`cleanNotes`), `generate.ts` |
| Calendar sync | `.ics` download + per-stop Google Calendar links | `src/lib/calendar.ts` |

## Notes

- **Identity:** no auth. Each browser gets an anonymous `wf_uid` cookie stored as `trips.user_id`. Only the owner can delete a trip, regenerate a day or generate the packing list; anyone with the link can view it.
- **Limits:** places, prices and times are AI estimates and can be wrong. Forecasts only cover the next 16 days; later dates plan without a forecast. Trip.com links are not an integration and their URL format may change.
- **Calendar times** are exported as floating local times (the stop's time at the destination).
