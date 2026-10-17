import test from "node:test";
import assert from "node:assert/strict";
import { validateItinerary, formatIssues } from "./validator";
import type { PlannedItinerary } from "./generate";
import type { GenerateRequest } from "./schema";

const baseReq: GenerateRequest = {
  destinations: ["Tokyo"],
  durationDays: 1,
  budget: "BALANCED",
  vibeTags: [],
  needs: [],
  hiddenGems: false,
  inspiration: "",
};

test("validateItinerary: accepts valid itinerary", () => {
  const plan: PlannedItinerary = {
    destinationLabel: "Tokyo, Japan",
    centerLatitude: 35.6762,
    centerLongitude: 139.6503,
    summary: "Trip to Tokyo",
    days: [
      {
        dayNumber: 1,
        theme: "Highlights",
        cityIndex: 0,
        stops: [
          {
            time: "09:00",
            title: "Senso-ji Temple",
            description: "Ancient Buddhist temple.",
            categoryTag: "culture",
            estimatedHours: 2,
            estimatedCost: 0,
            transitCost: 2,
            indoor: false,
            latitude: 35.7148,
            longitude: 139.7967,
            transitNote: "Metro, 15 min",
          },
          {
            time: "12:30",
            title: "Asakusa Imahan",
            description: "Traditional sukiyaki lunch.",
            categoryTag: "food",
            estimatedHours: 1.5,
            estimatedCost: 30,
            transitCost: 0,
            indoor: true,
            latitude: 35.713,
            longitude: 139.792,
            transitNote: "Walk, 5 min",
          },
        ],
      },
    ],
  };

  const res = validateItinerary(plan, baseReq);
  assert.equal(res.ok, true);
});

test("validateItinerary: rejects mismatched duration days", () => {
  const plan: PlannedItinerary = {
    destinationLabel: "Tokyo, Japan",
    centerLatitude: 35.6762,
    centerLongitude: 139.6503,
    summary: "Trip to Tokyo",
    days: [],
  };

  const res = validateItinerary(plan, { ...baseReq, durationDays: 2 });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(formatIssues(res.issues), /expected 2 days/);
  }
});

test("validateItinerary: rejects out-of-order stop times", () => {
  const plan: PlannedItinerary = {
    destinationLabel: "Tokyo, Japan",
    centerLatitude: 35.6762,
    centerLongitude: 139.6503,
    summary: "Trip to Tokyo",
    days: [
      {
        dayNumber: 1,
        theme: "Highlights",
        cityIndex: 0,
        stops: [
          {
            time: "14:00",
            title: "Place A",
            description: "Desc A",
            categoryTag: "culture",
            estimatedHours: 2,
            estimatedCost: 0,
            transitCost: 0,
            indoor: false,
            latitude: 35.71,
            longitude: 139.79,
            transitNote: "Start",
          },
          {
            time: "10:00",
            title: "Place B",
            description: "Desc B",
            categoryTag: "culture",
            estimatedHours: 2,
            estimatedCost: 0,
            transitCost: 0,
            indoor: false,
            latitude: 35.72,
            longitude: 139.80,
            transitNote: "Walk",
          },
        ],
      },
    ],
  };

  const res = validateItinerary(plan, baseReq);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(formatIssues(res.issues), /out of order/);
  }
});

test("validateItinerary: rejects duplicate non-repeatable places", () => {
  const plan: PlannedItinerary = {
    destinationLabel: "Tokyo, Japan",
    centerLatitude: 35.6762,
    centerLongitude: 139.6503,
    summary: "Trip to Tokyo",
    days: [
      {
        dayNumber: 1,
        theme: "Highlights",
        cityIndex: 0,
        stops: [
          {
            time: "09:00",
            title: "Senso-ji Temple",
            description: "Desc",
            categoryTag: "culture",
            estimatedHours: 2,
            estimatedCost: 0,
            transitCost: 0,
            indoor: false,
            latitude: 35.71,
            longitude: 139.79,
            transitNote: "Metro",
          },
          {
            time: "13:00",
            title: "Senso-ji Temple",
            description: "Desc again",
            categoryTag: "culture",
            estimatedHours: 2,
            estimatedCost: 0,
            transitCost: 0,
            indoor: false,
            latitude: 35.71,
            longitude: 139.79,
            transitNote: "Walk",
          },
        ],
      },
    ],
  };

  const res = validateItinerary(plan, baseReq);
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(formatIssues(res.issues), /duplicate place/);
  }
});

test("validateItinerary: allows repeatable categories like transit or lodging", () => {
  const plan: PlannedItinerary = {
    destinationLabel: "Tokyo, Japan",
    centerLatitude: 35.6762,
    centerLongitude: 139.6503,
    summary: "Trip to Tokyo",
    days: [
      {
        dayNumber: 1,
        theme: "Highlights",
        cityIndex: 0,
        stops: [
          {
            time: "09:00",
            title: "Tokyo Station",
            description: "Transit hub",
            categoryTag: "transit",
            estimatedHours: 0.5,
            estimatedCost: 5,
            transitCost: 0,
            indoor: true,
            latitude: 35.6812,
            longitude: 139.7671,
            transitNote: "Train",
          },
          {
            time: "18:00",
            title: "Tokyo Station",
            description: "Transit return",
            categoryTag: "transit",
            estimatedHours: 0.5,
            estimatedCost: 5,
            transitCost: 0,
            indoor: true,
            latitude: 35.6812,
            longitude: 139.7671,
            transitNote: "Train",
          },
        ],
      },
    ],
  };

  const res = validateItinerary(plan, baseReq);
  assert.equal(res.ok, true);
});

test("validateItinerary: SAVER budget enforces ceiling", () => {
  const plan: PlannedItinerary = {
    destinationLabel: "Tokyo, Japan",
    centerLatitude: 35.6762,
    centerLongitude: 139.6503,
    summary: "Trip to Tokyo",
    days: [
      {
        dayNumber: 1,
        theme: "Expensive Day",
        cityIndex: 0,
        stops: [
          {
            time: "09:00",
            title: "Luxury Breakfast",
            description: "Expensive meal",
            categoryTag: "food",
            estimatedHours: 1,
            estimatedCost: 150,
            transitCost: 10,
            indoor: true,
            latitude: 35.68,
            longitude: 139.76,
            transitNote: "Taxi",
          },
          {
            time: "13:00",
            title: "Expensive Tour",
            description: "Very costly tour",
            categoryTag: "culture",
            estimatedHours: 3,
            estimatedCost: 100,
            transitCost: 10,
            indoor: true,
            latitude: 35.69,
            longitude: 139.77,
            transitNote: "Taxi",
          },
        ],
      },
    ],
  };

  const res = validateItinerary(plan, { ...baseReq, budget: "SAVER" });
  assert.equal(res.ok, false);
  if (!res.ok) {
    assert.match(formatIssues(res.issues), /SAVER day costs/);
  }
});
