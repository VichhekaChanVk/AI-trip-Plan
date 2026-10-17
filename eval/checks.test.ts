import test from "node:test";
import assert from "node:assert/strict";
import { checkWeatherAdaptation, checkSaverBudget, checkDailyPacing, checkPromptInjectionResisted } from "./checks";
import type { PlannedDay, PlannedItinerary } from "@/lib/generate";

test("checkWeatherAdaptation: passes wet day with >=60% indoor", () => {
  const day: PlannedDay = {
    dayNumber: 1,
    theme: "Rainy Day",
    cityIndex: 0,
    stops: [
      { time: "09:00", title: "Museum", description: "", categoryTag: "culture", estimatedHours: 2, estimatedCost: 15, transitCost: 0, indoor: true, latitude: 35.7, longitude: 139.7, transitNote: "" },
      { time: "12:00", title: "Cafe", description: "", categoryTag: "food", estimatedHours: 1, estimatedCost: 15, transitCost: 0, indoor: true, latitude: 35.7, longitude: 139.7, transitNote: "" },
      { time: "14:00", title: "Park", description: "", categoryTag: "nature", estimatedHours: 1, estimatedCost: 0, transitCost: 0, indoor: false, latitude: 35.7, longitude: 139.7, transitNote: "" },
      { time: "18:00", title: "Dinner", description: "", categoryTag: "food", estimatedHours: 1.5, estimatedCost: 20, transitCost: 0, indoor: true, latitude: 35.7, longitude: 139.7, transitNote: "" },
    ],
  };
  const res = checkWeatherAdaptation([day], [{ condition: "Heavy Rain", precipChance: 90 }]);
  assert.equal(res.passed, true);
});

test("checkWeatherAdaptation: fails wet day with <60% indoor", () => {
  const day: PlannedDay = {
    dayNumber: 1,
    theme: "Rainy Day",
    cityIndex: 0,
    stops: [
      { time: "09:00", title: "Park", description: "", categoryTag: "nature", estimatedHours: 2, estimatedCost: 0, transitCost: 0, indoor: false, latitude: 35.7, longitude: 139.7, transitNote: "" },
      { time: "12:00", title: "Cafe", description: "", categoryTag: "food", estimatedHours: 1, estimatedCost: 15, transitCost: 0, indoor: true, latitude: 35.7, longitude: 139.7, transitNote: "" },
      { time: "14:00", title: "Street", description: "", categoryTag: "culture", estimatedHours: 1, estimatedCost: 0, transitCost: 0, indoor: false, latitude: 35.7, longitude: 139.7, transitNote: "" },
      { time: "18:00", title: "Night Walk", description: "", categoryTag: "nature", estimatedHours: 1.5, estimatedCost: 0, transitCost: 0, indoor: false, latitude: 35.7, longitude: 139.7, transitNote: "" },
    ],
  };
  const res = checkWeatherAdaptation([day], [{ condition: "Rainy", precipChance: 80 }]);
  assert.equal(res.passed, false);
});

test("checkWeatherAdaptation: fails hot day with midday outdoor stops", () => {
  const day: PlannedDay = {
    dayNumber: 1,
    theme: "Hot Day",
    cityIndex: 0,
    stops: [
      { time: "13:00", title: "Botanical Garden", description: "", categoryTag: "nature", estimatedHours: 2, estimatedCost: 0, transitCost: 0, indoor: false, latitude: 35.7, longitude: 139.7, transitNote: "" },
    ],
  };
  const res = checkWeatherAdaptation([day], [{ condition: "Sunny", highC: 36 }]);
  assert.equal(res.passed, false);
});

test("checkSaverBudget: verifies <= $90/day limit", () => {
  const dayUnder: PlannedDay = {
    dayNumber: 1,
    theme: "Budget",
    cityIndex: 0,
    stops: [
      { time: "09:00", title: "A", description: "", categoryTag: "culture", estimatedHours: 1, estimatedCost: 20, transitCost: 5, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
      { time: "12:00", title: "B", description: "", categoryTag: "food", estimatedHours: 1, estimatedCost: 30, transitCost: 5, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
    ],
  };
  assert.equal(checkSaverBudget(dayUnder).passed, true);

  const dayOver: PlannedDay = {
    dayNumber: 1,
    theme: "Over Budget",
    cityIndex: 0,
    stops: [
      { time: "09:00", title: "A", description: "", categoryTag: "culture", estimatedHours: 1, estimatedCost: 50, transitCost: 10, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
      { time: "12:00", title: "B", description: "", categoryTag: "food", estimatedHours: 1, estimatedCost: 40, transitCost: 10, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
    ],
  };
  assert.equal(checkSaverBudget(dayOver).passed, false);
});

test("checkDailyPacing: checks stop count, lunch, dinner, time boundaries", () => {
  const goodDay: PlannedDay = {
    dayNumber: 1,
    theme: "Good Day",
    cityIndex: 0,
    stops: [
      { time: "08:30", title: "Coffee", description: "", categoryTag: "food", estimatedHours: 1, estimatedCost: 5, transitCost: 0, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
      { time: "12:00", title: "Lunch Cafe", description: "", categoryTag: "food", estimatedHours: 1, estimatedCost: 15, transitCost: 0, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
      { time: "15:00", title: "Museum", description: "", categoryTag: "culture", estimatedHours: 2, estimatedCost: 15, transitCost: 0, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
      { time: "19:00", title: "Dinner Bistro", description: "", categoryTag: "food", estimatedHours: 1.5, estimatedCost: 25, transitCost: 0, indoor: true, latitude: 0, longitude: 0, transitNote: "" },
    ],
  };
  assert.equal(checkDailyPacing(goodDay).passed, true);
});
