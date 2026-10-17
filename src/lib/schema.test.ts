import test from "node:test";
import assert from "node:assert/strict";
import { generateRequestSchema, cleanVibe, cleanNotes } from "./schema";

test("cleanVibe: strips special characters and normalizes spaces", () => {
  assert.equal(cleanVibe("  Foodie & <Wine>!  "), "Foodie & Wine");
  assert.equal(cleanVibe("Art-lover's Tour"), "Art-lover's Tour");
});

test("cleanNotes: strips control chars and markup characters", () => {
  const dirty = "Look at this: <script>alert('x')</script> {inject} `code` \u0000 ok";
  const cleaned = cleanNotes(dirty);
  assert.equal(cleaned.includes("<"), false);
  assert.equal(cleaned.includes(">"), false);
  assert.equal(cleaned.includes("{"), false);
  assert.equal(cleaned.includes("}"), false);
  assert.equal(cleaned.includes("`"), false);
  assert.equal(cleaned.includes("\u0000"), false);
});

test("generateRequestSchema: accepts valid single city", () => {
  const data = {
    destinations: ["Paris"],
    durationDays: 3,
    budget: "SAVER",
  };
  const parsed = generateRequestSchema.safeParse(data);
  assert.equal(parsed.success, true);
});

test("generateRequestSchema: rejects empty destinations", () => {
  const data = {
    destinations: [],
    durationDays: 3,
    budget: "BALANCED",
  };
  const parsed = generateRequestSchema.safeParse(data);
  assert.equal(parsed.success, false);
});

test("generateRequestSchema: rejects duration shorter than number of destinations", () => {
  const data = {
    destinations: ["Paris", "Rome", "Berlin"],
    durationDays: 2,
    budget: "BALANCED",
  };
  const parsed = generateRequestSchema.safeParse(data);
  assert.equal(parsed.success, false);
});

test("generateRequestSchema: enforces max 4 cities", () => {
  const data = {
    destinations: ["A", "B", "C", "D", "E"],
    durationDays: 5,
    budget: "BALANCED",
  };
  const parsed = generateRequestSchema.safeParse(data);
  assert.equal(parsed.success, false);
});

test("generateRequestSchema: enforces duration between 1 and 10", () => {
  assert.equal(
    generateRequestSchema.safeParse({ destinations: ["Tokyo"], durationDays: 0, budget: "BALANCED" }).success,
    false,
  );
  assert.equal(
    generateRequestSchema.safeParse({ destinations: ["Tokyo"], durationDays: 11, budget: "BALANCED" }).success,
    false,
  );
  assert.equal(
    generateRequestSchema.safeParse({ destinations: ["Tokyo"], durationDays: 10, budget: "BALANCED" }).success,
    true,
  );
});
