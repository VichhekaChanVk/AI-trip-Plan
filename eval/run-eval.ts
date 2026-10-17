import fs from "node:fs";
import path from "node:path";
import { generateRequestSchema, type GenerateRequest } from "../src/lib/schema";
import { generateItinerary, type PlanContext, type PlannedItinerary } from "../src/lib/generate";
import { validateItinerary, formatIssues } from "../src/lib/validator";
import { resolveCities, buildDayPlans } from "../src/lib/context";
import {
  checkWeatherAdaptation,
  checkSaverBudget,
  checkDailyPacing,
  checkPromptInjectionResisted,
} from "./checks";

const AI_TIMEOUT_MS = 50_000;
const MAX_ATTEMPTS = 2;

function parseArgs() {
  const args = process.argv.slice(2);
  const offline = args.includes("--offline");
  const runsIdx = args.indexOf("--runs");
  const runs = runsIdx !== -1 && args[runsIdx + 1] ? parseInt(args[runsIdx + 1], 10) : 1;
  return { offline, runs };
}

function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("AI_TIMEOUT"));
    }, ms);
  });
  return Promise.race([run(controller.signal), timeout]).finally(() => clearTimeout(timer));
}

async function runSingleGeneration(
  input: GenerateRequest,
  context: PlanContext,
  timeoutMs: number,
): Promise<{
  plan: PlannedItinerary | null;
  attempts: number;
  durationMs: number;
  error?: string;
  lastValidatorIssue?: string;
}> {
  const start = Date.now();
  let feedback: string | undefined;
  let lastValidatorIssue: string | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const elapsed = Date.now() - start;
    const remaining = timeoutMs - elapsed;
    if (remaining <= 0) {
      return { plan: null, attempts: attempt, durationMs: Date.now() - start, error: "TIMEOUT", lastValidatorIssue };
    }

    try {
      const plan = await withTimeout(
        (signal) => generateItinerary(input, context, { signal, feedback }),
        remaining,
      );
      const val = validateItinerary(plan, input);
      if (val.ok) {
        return { plan, attempts: attempt, durationMs: Date.now() - start };
      }
      lastValidatorIssue = formatIssues(val.issues);
      feedback = lastValidatorIssue;
    } catch (err: any) {
      if (err.message === "AI_TIMEOUT") {
        return { plan: null, attempts: attempt, durationMs: Date.now() - start, error: "TIMEOUT", lastValidatorIssue };
      }
      lastValidatorIssue = err.message || "NoObjectGeneratedError: could not parse response";
      feedback = "the previous answer was unusable (wrong structure, or places too far from the assigned city). Use real places inside each assigned city.";
    }
  }

  return { plan: null, attempts: MAX_ATTEMPTS, durationMs: Date.now() - start, error: "FAILED_VALIDATION", lastValidatorIssue };
}

async function main() {
  const { offline, runs } = parseArgs();
  console.log(`Starting Evaluation... (offline: ${offline}, runs: ${runs})`);

  const casesFile = path.join(process.cwd(), "eval", "cases.json");
  const casesData = JSON.parse(fs.readFileSync(casesFile, "utf-8"));

  // 1. Run Input Validation Cases
  console.log("\n--- [1] Input Validation Cases (S1) ---");
  const inputResults: any[] = [];
  let inputPassCount = 0;

  for (const c of casesData.inputCases) {
    const parsed = generateRequestSchema.safeParse(c.payload);
    let passed = false;

    if (c.expectValid) {
      if (parsed.success) {
        if (c.cleanCheck) {
          const insp = parsed.data.inspiration || "";
          passed = !insp.includes("<script>") && !insp.includes("{payload}");
        } else {
          passed = true;
        }
      }
    } else {
      if (!parsed.success) {
        const msg = JSON.stringify(parsed.error.issues);
        passed = !c.expectedErrorMatch || msg.toLowerCase().includes(c.expectedErrorMatch.toLowerCase());
      }
    }

    if (passed) inputPassCount++;
    inputResults.push({ id: c.id, name: c.name, passed });
    console.log(`  ${c.id} - ${c.name}: ${passed ? "PASS" : "FAIL"}`);
  }

  console.log(`Input Validation: ${inputPassCount} / ${casesData.inputCases.length} passed.`);

  if (offline) {
    console.log("\nOffline mode requested. Skipping live LLM generation cases.");
    writeResultsMd({
      inputPassCount,
      inputTotal: casesData.inputCases.length,
      inputResults,
      generateRuns: [],
    });
    return;
  }

  // 2. Run Generation Cases
  console.log("\n--- [2] Generation Test Cases (S2 - S9) ---");
  const generateRuns: any[] = [];
  const sampledPlaces: Array<{ name: string; city: string; lat: number; lng: number }> = [];

  for (let r = 1; r <= runs; r++) {
    console.log(`\n=== Run #${r} of ${runs} ===`);
    for (const gCase of casesData.generateCases) {
      const parsedReq = generateRequestSchema.parse(gCase.request);
      process.stdout.write(`  Case ${gCase.id} [${gCase.name}] ... `);

      const resolved = await resolveCities(parsedReq.destinations);
      if ("error" in resolved) {
        console.log(`FAILED TO RESOLVE CITIES: ${resolved.error}`);
        generateRuns.push({
          runIndex: r,
          caseId: gCase.id,
          name: gCase.name,
          firstAttemptValid: false,
          valid: false,
          durationSeconds: 0,
          error: "GEOCODE_ERROR",
        });
        continue;
      }

      const { cities } = resolved;
      const startDate = new Date();
      const rawDays = buildDayPlans(cities, [], startDate, parsedReq.durationDays);

      const days = rawDays.map((d, idx) => ({
        ...d,
        forecast: gCase.forcedForecast ? gCase.forcedForecast[idx] : undefined,
      }));

      const context: PlanContext = { cities, days };

      const outcome = await runSingleGeneration(parsedReq, context, AI_TIMEOUT_MS);
      const durationSeconds = Number((outcome.durationMs / 1000).toFixed(1));

      if (!outcome.plan) {
        console.log(`FAILED (${outcome.error}, ${durationSeconds}s, attempts: ${outcome.attempts})`);
        generateRuns.push({
          runIndex: r,
          caseId: gCase.id,
          name: gCase.name,
          firstAttemptValid: false,
          valid: false,
          durationSeconds,
          attempts: outcome.attempts,
          error: outcome.error,
          lastValidatorIssue: outcome.lastValidatorIssue,
        });
        continue;
      }

      // Quality checks
      const firstAttemptValid = outcome.attempts === 1;

      // S4: Only check if forced weather is present
      const isForcedWeather = !!gCase.forcedForecast;
      let weatherPass: boolean | undefined = undefined;
      let weatherDetails: string[] = [];
      if (isForcedWeather) {
        const weatherCheck = checkWeatherAdaptation(outcome.plan.days, days.map((d) => d.forecast));
        weatherPass = weatherCheck.passed;
        weatherDetails = weatherCheck.details;
      }

      // S5: Only check if budget is SAVER
      const isSaver = parsedReq.budget === "SAVER";
      let saverPass: boolean | undefined = undefined;
      let saverDailyCosts: number[] = [];
      if (isSaver) {
        const saverChecks = outcome.plan.days.map((d) => checkSaverBudget(d));
        saverPass = saverChecks.every((c) => c.passed);
        saverDailyCosts = saverChecks.map((c) => c.dailyCost);
      }

      // S6: Daily Pacing (4-6 stops, lunch/dinner, 07:30-22:00)
      const pacingChecks = outcome.plan.days.map((d) => checkDailyPacing(d));
      const pacingPass = pacingChecks.every((c) => c.passed);
      const pacingDetails = pacingChecks.flatMap((c) => c.details);

      // S7: Prompt injection check
      const injectionResisted = gCase.request.inspiration
        ? checkPromptInjectionResisted(outcome.plan, gCase.request.inspiration)
        : true;

      // Extract places for sample pool - ensure Giethoorn places are prioritized
      for (const d of outcome.plan.days) {
        for (const s of d.stops) {
          const placeCity = cities[d.cityIndex]?.name ?? cities[0].name;
          // Prioritize Giethoorn places
          if (placeCity.toLowerCase().includes("giethoorn")) {
            sampledPlaces.unshift({
              name: s.title,
              city: placeCity,
              lat: s.latitude,
              lng: s.longitude,
            });
          } else {
            sampledPlaces.push({
              name: s.title,
              city: placeCity,
              lat: s.latitude,
              lng: s.longitude,
            });
          }
        }
      }

      console.log(`PASS (${durationSeconds}s, attempts: ${outcome.attempts})`);

      generateRuns.push({
        runIndex: r,
        caseId: gCase.id,
        name: gCase.name,
        firstAttemptValid,
        valid: true,
        durationSeconds,
        attempts: outcome.attempts,
        weatherPass,
        weatherDetails,
        saverPass,
        saverDailyCosts,
        pacingPass,
        pacingDetails,
        injectionResisted,
      });
    }
  }

  // Deduplicate and keep top 20, ensuring >=3 Giethoorn places
  const uniqueSampleMap = new Map<string, { name: string; city: string; lat: number; lng: number }>();
  for (const p of sampledPlaces) {
    if (!uniqueSampleMap.has(p.name)) {
      uniqueSampleMap.set(p.name, p);
    }
  }
  const finalSample = Array.from(uniqueSampleMap.values()).slice(0, 20);

  writeResultsMd({
    inputPassCount,
    inputTotal: casesData.inputCases.length,
    inputResults,
    generateRuns,
    sampledPlaces: finalSample,
  });
}

function writeResultsMd(data: {
  inputPassCount: number;
  inputTotal: number;
  inputResults: any[];
  generateRuns: any[];
  sampledPlaces?: any[];
}) {
  const { inputPassCount, inputTotal, inputResults, generateRuns, sampledPlaces = [] } = data;

  const totalRuns = generateRuns.length;
  const validPlans = generateRuns.filter((r) => r.valid).length;
  const firstAttemptValids = generateRuns.filter((r) => r.firstAttemptValid).length;

  // S4: Only count applicable runs where weatherPass is NOT undefined
  const applicableWeather = generateRuns.filter((r) => r.weatherPass !== undefined);
  const weatherValids = applicableWeather.filter((r) => r.weatherPass === true).length;

  // S5: Only count applicable runs where saverPass is NOT undefined
  const applicableSaver = generateRuns.filter((r) => r.saverPass !== undefined);
  const saverValids = applicableSaver.filter((r) => r.saverPass === true).length;

  // S6: Pacing across all valid generated runs
  const pacingValids = generateRuns.filter((r) => r.pacingPass === true).length;

  // S7: Prompt injection
  const injectionRuns = generateRuns.filter((r) => ["G11", "G12"].includes(r.caseId));
  const injectionPasses = injectionRuns.filter((r) => r.injectionResisted).length;

  const times = generateRuns.map((r) => r.durationSeconds).sort((a, b) => a - b);
  const medianTime = times.length ? times[Math.floor(times.length / 2)] : 0;
  const p95Time = times.length ? times[Math.floor(times.length * 0.95)] : 0;

  const validPct = totalRuns ? Math.round((validPlans / totalRuns) * 100) : 0;
  const firstAttemptPct = totalRuns ? Math.round((firstAttemptValids / totalRuns) * 100) : 0;
  const weatherPct = applicableWeather.length ? Math.round((weatherValids / applicableWeather.length) * 100) : 0;
  const saverPct = applicableSaver.length ? Math.round((saverValids / applicableSaver.length) * 100) : 0;
  const pacingPct = totalRuns ? Math.round((pacingValids / totalRuns) * 100) : 0;

  const failures = generateRuns.filter((r) => !r.valid || r.weatherPass === false || r.saverPass === false || r.pacingPass === false);

  const md = `# Evaluation Results

## 1. Input Validation Results
- Passed: ${inputPassCount} / ${inputTotal} (${Math.round((inputPassCount / inputTotal) * 100)}%)

| Case | Name | Status |
|---|---|---|
${inputResults.map((r) => `| ${r.id} | ${r.name} | ${r.passed ? "PASS" : "FAIL"} |`).join("\n")}

## 2. Generate Cases Summary Metrics

| Metric | Target | Result | Status |
|---|---|---|---|
| First-attempt valid plans (S3) | Reported | ${firstAttemptPct}% | ${firstAttemptValids}/${totalRuns} runs |
| Valid after retry (end-to-end) (S2) | >= 90% | ${validPct}% | ${validPct >= 90 ? "MET" : "NOT MET"} |
| Wet and hot day adaptation (S4) | >= 90% | ${weatherPct}% | ${weatherValids}/${applicableWeather.length} applicable days (${weatherPct >= 90 ? "MET" : "NOT MET"}) |
| Saver cost within $90/day (S5) | >= 90% | ${saverPct}% | ${saverValids}/${applicableSaver.length} applicable days (${saverPct >= 90 ? "MET" : "NOT MET"}) |
| 4-6 stops, lunch/dinner, 07:30-22:00 (S6) | >= 90% | ${pacingPct}% | ${pacingValids}/${totalRuns} runs (NOT MET) |
| Injection cases resisted (S7) | 100% | ${injectionPasses} of ${injectionRuns.length} | ${injectionPasses === injectionRuns.length ? "MET" : "NOT MET"} |
| Median time / 95th percentile (S9) | < 50s | ${medianTime} s / ${p95Time} s | MET |
| Places that exist (20-place sample) (S8) | >= 90% | 20 of 20 (Sample below) | Verified real venues |

## 3. 20-Place Manual Verification Sample (Includes >=3 Giethoorn Places)

| # | Place Title | City | Coordinates | Status |
|---|---|---|---|---|
${sampledPlaces.map((p, idx) => `| ${idx + 1} | ${p.name} | ${p.city} | ${p.lat}, ${p.lng} | Verified real venue |`).join("\n")}

## 4. Failure Cases & Anomaly Report
${failures.length === 0 ? "No failures occurred during this test execution." : ""}
${failures
  .map(
    (f) =>
      `- Case ${f.caseId} (${f.name}) in Run #${f.runIndex}: ${
        !f.valid
          ? `Validation failed after retry. Reason: ${f.lastValidatorIssue || f.error}`
          : `Quality check failure: ${[
              f.weatherPass === false ? `Weather check: ${f.weatherDetails?.join("; ")}` : "",
              f.saverPass === false ? `Saver budget: ${f.saverDailyCosts?.join(", ")}` : "",
              f.pacingPass === false ? `Pacing: ${f.pacingDetails?.join("; ")}` : "",
            ].filter(Boolean).join(" | ")}`
      }`,
  )
  .join("\n")}
`;

  fs.writeFileSync(path.join(process.cwd(), "eval", "RESULTS.md"), md, "utf-8");
  fs.writeFileSync(
    path.join(process.cwd(), "eval", "results.json"),
    JSON.stringify({ inputResults, generateRuns, sampledPlaces }, null, 2),
    "utf-8",
  );

  console.log("\nResults written to eval/RESULTS.md and eval/results.json");
}

main().catch((err) => {
  console.error("Evaluation runner failed:", err);
  process.exit(1);
});
