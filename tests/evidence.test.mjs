import test from "node:test";
import assert from "node:assert/strict";
import {
  assessEmissions,
  businessProjection,
  evidenceCSV,
} from "../dist/evidence-calculator.js";
import {
  evidenceRegistry,
  PROFILES,
  CATEGORIES,
} from "../dist/evidence-data.js";
const preset = {
  category: "plastic",
  profileId: "pp",
  condition: "clean",
  baseline: "combustion",
  alternative: "recycling",
  mode: "direct-burning",
  massTonnes: 100,
  adoptionPercent: 30,
  recoveryPercent: 90,
};
test("curated evidence includes dated primary cases and traceable signed factors", () => {
  const r = evidenceRegistry();
  assert.equal(r.cases.length, 6);
  assert.deepEqual(
    r.cases.slice(0, 2).map((c) => c.id),
    ["vapi-ambuja", "hi-tech-carbon"],
  );
  assert.ok(
    r.cases
      .find((c) => c.id === "ntpc")
      .figures.includes("703,466.12 metric tonnes consumed"),
  );
  for (const c of r.cases) {
    assert.ok(c.limit && c.period && c.publisher);
    assert.equal(new URL(c.source).protocol, "https:");
  }
  assert.match(r.cases.find((c) => c.id === "kalundborg").period, /ceased/);
  const vapi = r.cases.find((c) => c.id === "vapi-ambuja");
  assert.ok(vapi.figures.some((f) => f.includes("15,341.09")));
  assert.ok(
    vapi.figures.some(
      (f) => f.includes("30,873") && f.includes("collectively"),
    ),
  );
  assert.ok(
    vapi.figures.some((f) => f.includes("154,018") && f.includes("2012–2016")),
  );
  assert.match(vapi.limit, /Payment terms.*unpublished/);
  assert.equal(vapi.references[0].url.startsWith("https://cpcb.nic.in/"), true);
  const sludge = r.cases.find((c) => c.id === "hi-tech-carbon");
  assert.ok(sludge.figures.includes("₹167 / tonne agreed selling price"));
  assert.match(sludge.period, /25 February 2014/);
  assert.match(sludge.limit, /not named/);
  assert.match(sludge.limit, /not sales revenue/);
  for (const p of PROFILES) {
    assert.ok(p.recycling < 0);
    assert.ok(p.source && p.exhibit && p.version && p.geography);
  }
});
test("direct CO2 benchmark converts US short tons and keeps adoption independent of AI", () => {
  const r = assessEmissions(preset);
  assert.equal(r.divertedTonnes, 27);
  assert.equal(r.reductionPercent, 27);
  assert.ok(Math.abs(r.avoidedTonnes - 83.03711105193415) < 1e-9);
  assert.ok(Math.abs(r.beforeTonnes - r.afterTonnes - r.avoidedTonnes) < 1e-9);
  assert.equal(r.pollutantReductionPercent, null);
  const zero = assessEmissions({ ...preset, adoptionPercent: 0 });
  assert.equal(zero.avoidedTonnes, 0);
  assert.equal(zero.reductionPercent, 0);
  const full = assessEmissions({
    ...preset,
    adoptionPercent: 100,
    recoveryPercent: 100,
  });
  assert.equal(full.afterTonnes, 0);
  assert.equal(full.reductionPercent, 100);
});
test("all assessment classes can return explicit evidence gaps without fabricated savings", () => {
  for (const category of CATEGORIES) {
    const r = assessEmissions({ ...preset, category, profileId: "unknown" });
    assert.equal(r.status, "insufficient_evidence");
    assert.equal(r.avoidedTonnes, null);
  }
  for (const condition of ["contaminated", "hazardous", "unknown"])
    assert.equal(
      assessEmissions({ ...preset, condition }).status,
      "insufficient_evidence",
    );
  assert.equal(
    assessEmissions({ ...preset, baseline: "open-burning" }).status,
    "insufficient_evidence",
  );
  assert.equal(
    assessEmissions({ ...preset, category: "metal", profileId: "steel-cans" })
      .status,
    "insufficient_evidence",
  );
});
test("signed net credits produce absolute comparisons, never fake pollution percentages", () => {
  const r = assessEmissions({
    ...preset,
    mode: "lifecycle",
    baseline: "landfill",
  });
  assert.ok(r.afterTonnes < 0);
  assert.equal(r.reductionPercent, null);
  assert.ok(r.avoidedTonnes > r.beforeTonnes);
  const steel = assessEmissions({
    ...preset,
    mode: "lifecycle",
    category: "metal",
    profileId: "steel-cans",
  });
  assert.ok(steel.beforeTonnes < 0);
  assert.equal(steel.reductionPercent, null);
  assert.ok(steel.avoidedTonnes > 0);
  const zero = assessEmissions({
    ...preset,
    mode: "lifecycle",
    adoptionPercent: 0,
  });
  assert.equal(zero.avoidedTonnes, 0);
  assert.equal(zero.reductionPercent, null);
});
test("missing and invalid inputs, mismatched profiles and factor overrides are rejected", () => {
  for (const [key, val] of [
    ["massTonnes", null],
    ["massTonnes", 0],
    ["massTonnes", Infinity],
    ["adoptionPercent", 101],
    ["recoveryPercent", -1],
    ["massTonnes", "100"],
    ["mode", "bad"],
    ["alternative", "burn"],
  ])
    assert.throws(() => assessEmissions({ ...preset, [key]: val }));
  assert.throws(() => assessEmissions({ ...preset, factor: 0 }));
  assert.throws(() => assessEmissions(null));
  assert.throws(() => assessEmissions({}));
  assert.equal(
    assessEmissions({ ...preset, category: "glass" }).status,
    "insufficient_evidence",
  );
});
test("business projections apply commission per order with real tier boundaries", () => {
  for (const [value, rate] of [
    [99999, 5],
    [100000, 4],
    [1000000, 4],
    [1000000.01, 3],
  ]) {
    const b = businessProjection({ orders: 10, materialValue: value });
    assert.equal(b.feePercent, rate);
    assert.equal(b.revenue, b.fee * 10);
    assert.equal(b.gmv, value * 10);
    assert.equal(b.operatingResult, null);
    assert.equal(b.breakEvenOrders, null);
  }
  const b = businessProjection({
    orders: 20,
    materialValue: 50000,
    fixedCosts: 10000,
    variableCosts: 500,
  });
  assert.equal(b.revenue, 50000);
  assert.equal(b.contributionPerOrder, 2000);
  assert.equal(b.operatingResult, 30000);
  assert.equal(b.breakEvenOrders, 5);
  assert.equal(
    businessProjection({
      orders: 0,
      materialValue: 50000,
      fixedCosts: 10000,
      variableCosts: 3000,
    }).breakEvenOrders,
    null,
  );
  assert.throws(() => businessProjection({ orders: 1.5, materialValue: 10 }));
  assert.throws(() => businessProjection({ orders: 1, materialValue: 10.123 }));
  assert.throws(() => businessProjection({ orders: 1e6, materialValue: 1e10 }));
});
test("pitch CSV preserves citations, unknowns, quotes and neutralises formula cells", () => {
  const csv = evidenceCSV([
    ["Source", "https://example.com", 'a"b', null],
    ["=SUM(A1)", "\t@bad", "-123", "\n+1"],
  ]);
  assert.ok(csv.includes("https://example.com"));
  assert.ok(csv.includes('a""b'));
  assert.ok(csv.includes("Unknown"));
  assert.ok(csv.includes("' =SUM"));
  assert.ok(csv.includes("' \t@bad"));
  assert.ok(csv.includes("\r\n"));
});
