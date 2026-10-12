# Wayfarer AI: Security & Responsible AI Document
FESE307 · Docs / Infra · Rubric area: Security & Responsible AI (10%)

## 1. Overview

Wayfarer AI is a Next.js web app that generates a day-by-day travel itinerary from a destination, trip length, budget level and a few interest tags ("vibes"). An LLM writes the plan, and the app adds a map, weather and calendar export. This document describes how data moves through the system, what personal information is involved, and one AI-specific risk with its mitigation.

The app has no accounts and no login. Users never enter a name, email or password.

## 2. Data flow

1. **Browser to server.** The planner form sends five fields to `POST /api/generate-itinerary`: destination, number of days, budget, vibe tags and start date.
2. **Input validation.** The server validates the request with a Zod schema. The destination is capped at 120 characters and trip length at 1 to 10 days. Budget must be one of three fixed values. Custom vibes are stripped to letters, numbers and basic punctuation, capped at 30 characters each, and limited to 8 tags.
3. **Geocoding.** The destination text is sent to the Open-Meteo geocoding API, which returns coordinates and a canonical place name.
4. **LLM call.** The server sends a prompt to the LLM provider (DeepSeek by default, OpenAI as a fallback) through the Vercel AI SDK. The prompt contains the destination, centre coordinates, number of days, budget guidance and vibe tags. The model is forced to answer in a fixed JSON schema.
5. **Sanitising the output.** The server normalises times and drops any stop located more than 60 km from the destination centre.
6. **Weather.** The centre coordinates are sent to Open-Meteo for current weather and a forecast. This step is best-effort and never blocks saving a trip.
7. **Storage.** The trip and its stops are saved to a SQLite database through Prisma, tagged with an anonymous user id from a cookie.
8. **Response.** The server returns only the new trip id. The browser then loads `/itinerary/[id]`, which reads the trip from the database and renders the timeline and map. Map tiles are loaded by the browser directly from OpenStreetMap.

**Third parties that receive data**

- **LLM provider (DeepSeek or OpenAI):** destination, coordinates, trip length, budget and vibe tags.
- **Open-Meteo:** destination text (geocoding) and coordinates (weather). No key or account is used.
- **OpenStreetMap tile servers:** the user's browser requests map tiles directly, so OpenStreetMap sees the user's IP address and the map area viewed.

*Placeholder: failure handling (timeouts, bad-output validation and the API-down fallback) is being added by the Backend / Reliability owner. Update this section once that work is merged.*

## 3. Personal data (PII) and how it is handled

**Collected and stored**

- **Anonymous user id:** a random id stored in a cookie named `wf_uid` (httpOnly, SameSite=Lax, one-year lifetime) and saved with each trip. It is not linked to a name, email or any real-world identity.
- **Trip details:** destination, start date, duration, budget, vibe tags, the generated itinerary and a weather summary.

**Not collected**

- No names, emails, phone numbers, passwords, payment details or precise device location. The app does not ask for the user's own location.

**Why this is still worth protecting**

- Travel plans can reveal when someone will be away from home and where they are going. Combined with an IP address, they could identify a person.
- The free-text destination and custom vibe fields could contain personal details if a user chooses to type them. The server limits the length and characters, but it cannot recognise personal details in free text.

**Handling decisions**

- **Secrets:** API keys are read from environment variables on the server only (none use the `NEXT_PUBLIC_` prefix, so they never reach the browser). `.env` is excluded from Git, and `.env.example` documents the variable names with empty values.
- **Access control:** only the cookie owner can delete a trip. Viewing a trip requires its id, which is a long random value, but anyone who has the link can open it. This is intentional so trips can be shared.
- **Retention:** trips are kept until the owner deletes them. There is no automatic expiry.

## 4. AI risk and mitigation

**Chosen risk: the model invents places or coordinates (hallucination).**

LLMs often produce confident but wrong details: a restaurant that has closed, a place that does not exist, or latitude and longitude that point to the wrong city. In a travel app this has real consequences, because a user could plan a day around a stop that cannot be visited, and a wrong pin would mislead them on the map.

**Mitigations in the code**

- **Structured output.** The model must return JSON matching a Zod schema, with limits on stop counts, coordinate ranges, costs and fixed categories. Output that does not match is rejected and retried (up to two retries).
- **Grounding before generation.** The destination is geocoded first and the real coordinates are given to the model as the trip centre.
- **Distance filter after generation.** Any stop more than 60 km from the centre is discarded. If no usable stops remain, the request fails with a clear message rather than saving a broken plan.
- **Prompt rules.** The system prompt requires specific, currently operating, named places, and exact coordinates for each.
- **Time normalisation.** Times are parsed and standardised so malformed values cannot break the timeline or calendar export.

**Residual risk and next steps**

The 60 km filter catches wildly wrong coordinates but cannot confirm that a nearby place actually exists or is open. To close that gap, the interface should tell users that AI-generated plans need checking, and a future version could verify each stop against a places database.

**Related risk, noted briefly: prompt injection.** Custom vibe text is inserted into the prompt. It is stripped of symbols and limited to 30 characters, and the model's output is constrained to the schema, which limits what an injected instruction can achieve.

## 5. Other known limitations

- **No authentication.** Identity is a cookie. Clearing cookies or switching browser means a user can no longer delete their own trips.
- **No rate limiting on the generate endpoint.** Anyone can call it repeatedly, which could run up LLM costs. A per-IP or per-cookie limit is a recommended addition.
- **Error messages.** The generate endpoint returns the raw error message to the client on failure, which may expose internal details. This should be replaced with friendly messages as part of the failure-handling work.
- **Database file in the repository.** `prisma/dev.db` is in the project and not excluded by `.gitignore`. Database files should be ignored so no stored trips are committed.
- **Third-party data sharing.** The LLM provider's own data retention terms apply to the prompts sent to it. Users should not enter personal information into the destination or vibe fields.

## 6. Summary

Wayfarer AI keeps its personal data footprint small: an anonymous cookie and trip preferences, with no accounts. Its main AI risk, invented places and coordinates, is reduced by schema-enforced output, geocoding before generation and a distance filter afterwards. The remaining gaps (rate limiting, error messages, committed database file) are listed above and are straightforward to fix.
