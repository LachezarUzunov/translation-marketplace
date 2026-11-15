import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePrice } from "../srv/lib/pricing.js";

const config = { rate: 0.2, minimum: 10 };

test("commission is 20% when above the minimum", () => {
  // 0.08 * 1000 = 80.00 -> 20% = 16.00
  assert.deepEqual(calculatePrice("0.080", 1000, config), {
    translatorPrice: 80,
    commission: 16,
    buyerPrice: 96,
  });
});

test("minimum commission applies to small orders", () => {
  // 0.08 * 100 = 8.00 -> 20% = 1.60 < 10
  assert.deepEqual(calculatePrice("0.080", 100, config), {
    translatorPrice: 8,
    commission: 10,
    buyerPrice: 18,
  });
});

test("no floating point drift", () => {
  // naive JS: 0.07 * 3 = 0.21000000000000002
  const { translatorPrice } = calculatePrice("0.070", 3, config);
  assert.equal(translatorPrice, 0.21);
});

test("rounds to cents", () => {
  // 0.015 * 333 = 4.995 -> 5.00
  assert.equal(calculatePrice("0.015", 333, config).translatorPrice, 5);
});
