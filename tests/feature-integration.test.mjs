import test from "node:test";
import assert from "node:assert/strict";
import {
  haversineKm,
  scoreMatch,
  splitTransportCost,
  suggestPoolLots,
} from "../dist/matching.js";
import { buildLoopGraph } from "../dist/loop-graph.js";
import { requestGraph } from "../dist/features/loop.js";
import { calculateImpact } from "../dist/impact.js";
import { getCo2Factor } from "../dist/co2-factors.js";
import {
  getFieldConfidence,
  renderFieldConfidence,
  needsVerification,
} from "../dist/features/confidence.js";
import { planPool, eligibilityReasons } from "../dist/planner.js";
const lot = (id, quantityKg = 100, pricePerKg = 40) => ({
  id,
  title: id,
  company: "Fixture supplier",
  material: "PP",
  grade: "PP-H",
  condition: "Clean",
  quantityKg,
  pricePerKg,
  confirmed: true,
});
const need = {
  material: "PP",
  grade: "PP-H",
  quantityKg: 100,
  comparisonPrice: 80,
  selectedRecordIds: ["a"],
};
function request(id = "q", recordId = "a") {
  const requirements = { ...need, selectedRecordIds: [recordId] };
  return {
    id,
    status: "pending_agreement",
    requirements,
    plan: planPool([lot(recordId)], {
      ...requirements,
      pickups: [
        {
          recordId,
          provider: "buyer_owned",
          payer: "buyer",
          cost: 0,
          zeroCostConfirmed: true,
        },
      ],
    }),
  };
}
test("matching explains unknowns without default locations or fuzzy grade acceptance", () => {
  assert.equal(haversineKm(null, null, 18, 73), null);
  assert.equal(haversineKm(91, 73, 18, 73), null);
  const s = scoreMatch(lot("a"), need);
  assert.equal(s.byKey.distance.distanceKm, null);
  assert.equal(s.unknownCount, 1);
  assert.equal(
    scoreMatch({ ...lot("a"), material: "PP-H" }, need).byKey.materialFit.score,
    0,
  );
  assert.equal(
    scoreMatch({ ...lot("a"), grade: "PP-H mixed" }, need).byKey.gradeFit.score,
    0,
  );
  assert.equal(
    scoreMatch({ distanceKm: 2 }, {}).byKey.distance.distanceKm,
    null,
  );
});
test("known outside-radius coordinates exclude lots; unknown geography does not become a nearby claim", () => {
  const r = { ...lot("a"), latitude: 18.5204, longitude: 73.8567 };
  assert.ok(
    eligibilityReasons(r, {
      ...need,
      buyerLatitude: 19.076,
      buyerLongitude: 72.8777,
    }).some((s) => s.includes("50 km")),
  );
  assert.equal(eligibilityReasons(r, need).length, 0);
  assert.ok(haversineKm(r.latitude, r.longitude, 18.521, 73.855) < 1);
});
test("fair shared transport reconciles every paise for fractional and uneven quantities", () => {
  const allocations = [
    { recordId: "a", quantityKg: 120 },
    { recordId: "b", quantityKg: 180 },
    { recordId: "c", quantityKg: 200 },
  ];
  assert.deepEqual(
    splitTransportCost(allocations, 100.01).map((r) => r.cost),
    [24, 36.01, 40],
  );
  assert.equal(
    splitTransportCost(
      [
        { recordId: "a", quantityKg: 0.000001 },
        { recordId: "b", quantityKg: 0.000002 },
      ],
      0.01,
    ).reduce((s, r) => s + Math.round(r.cost * 100), 0),
    1,
  );
  assert.throws(() => splitTransportCost([], 100));
  assert.throws(() => splitTransportCost(allocations, -1));
  assert.throws(() => splitTransportCost(allocations, 0.001));
});
test("gap suggestions use only unselected eligible records and leave transport unknown", () => {
  const records = [
      lot("a", 25),
      lot("b", 75),
      { ...lot("bad"), grade: "HDPE" },
    ],
    p = planPool(records, need);
  const list = suggestPoolLots(records, need, p, eligibilityReasons);
  assert.deepEqual(
    list.map((x) => x.record.id),
    ["b"],
  );
  assert.equal(list[0].match.byKey.distance.distanceKm, null);
  assert.equal(
    planPool(records, { ...need, selectedRecordIds: ["a", "b"] }).savings,
    null,
  );
});
test("loop graph has no default factories and finds only explicitly supplied cycles", () => {
  assert.equal(buildLoopGraph().nodes.length, 0);
  const nodes = [
    {
      id: "a",
      name: "a",
      outputs: [{ material: "A", quantityKg: 10, pricePerKg: 1 }],
      inputs: [{ material: "C" }],
    },
    {
      id: "b",
      name: "b",
      outputs: [{ material: "B", quantityKg: 10, pricePerKg: 1 }],
      inputs: [{ material: "A" }],
    },
    {
      id: "c",
      name: "c",
      outputs: [{ material: "C", quantityKg: 10, pricePerKg: 1 }],
      inputs: [{ material: "B" }],
    },
  ];
  const g = buildLoopGraph(nodes);
  assert.equal(g.loops.filter((x) => x.length === 3).length, 1);
  assert.ok(g.loops.every((x) => x.length <= 4));
  assert.equal(g.isDemoRules, false);
  const real = requestGraph(request());
  assert.equal(real.edges.length, 1);
  assert.equal(real.loops.length, 0);
  assert.equal(real.nodes.length, 2);
});
test("impact projects immutable request snapshots, excludes cancellations and never claims delivered results", () => {
  const a = request(),
    report = calculateImpact([
      a,
      { ...request("cancel", "b"), status: "cancelled" },
    ]);
  assert.equal(report.requestCount, 1);
  assert.equal(report.requestedKg, 100);
  assert.equal(report.actualDeliveredKg, null);
  assert.equal(report.co2CreditKg, null);
  assert.equal(report.sellerNet, a.plan.sellerNet);
  const scenario = calculateImpact([a], true);
  assert.ok(
    Math.abs(scenario.co2CreditKg - (100 * 0.79 * 1000) / 907.18474) < 0.000001,
  );
  const overlap = calculateImpact([a, request("second")], true);
  assert.equal(overlap.overlapRecordCount, 1);
  assert.equal(overlap.co2CreditKg, null);
  assert.equal(getCo2Factor("Plastic").hasFactor, false);
  assert.equal(getCo2Factor("Iron").hasFactor, false);
  assert.match(getCo2Factor("PP").source, /epa.gov/);
});
test("confidence uses only provided model scores and flags review without certifying a lab need", () => {
  assert.equal(getFieldConfidence({}, "grade"), null);
  assert.equal(
    getFieldConfidence({ confidence: { material: NaN } }, "material"),
    null,
  );
  assert.equal(
    renderFieldConfidence("grade", "Grade", { confidence: { material: 0.4 } }),
    "",
  );
  assert.equal(needsVerification(0.4), true);
  const html = renderFieldConfidence("material", "Material", {
    confidence: { material: 0.4 },
  });
  assert.match(html, /Needs verification/);
  assert.doesNotMatch(html, /Needs lab test/);
});

test("impact totals beyond supported paise precision remain unknown", () => {
  const a = request(),
    b = request("second", "b");
  for (const r of [a, b]) {
    r.plan.savings = 6e13;
    r.plan.sellerNet = 6e13;
    r.plan.fee = 6e13;
  }
  const result = calculateImpact([a, b]);
  assert.equal(result.buyerSavings, null);
  assert.equal(result.sellerNet, null);
  assert.equal(result.platformFee, null);
});
