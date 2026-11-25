import test from "node:test";
import assert from "node:assert/strict";
import { exportEstimate, csvCell } from "../dist/estimate.js";
import { planPool } from "../dist/planner.js";
test("CSV escapes text and neutralizes spreadsheet formulas with control/whitespace prefixes", () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  for (const s of ["=SUM(A1)", " +1", "\t@calc", "\r-4"])
    assert.ok(csvCell(s).startsWith("\"'"));
});
test("CSV exports exactly the displayed allocation, assumptions, timestamp and shortage", () => {
  const requirements = {
    material: "PP",
    grade: "PP-H",
    quantityKg: 20,
    comparisonPrice: 70,
    transportCost: 100,
    pickups: [{recordId:"a",provider:"external",payer:"buyer",cost:100}],
    selectedRecordIds: ["a"],
  };
  const p = planPool(
    [
      {
        id: "a",
        title: "=bad()",
        company: 'A, "Factory"',
        material: "PP",
        grade: "PP-H",
        condition: "Clean",
        confirmed: true,
        quantityKg: 10,
        pricePerKg: 40,
      },
    ],
    requirements,
  );
  const csv = exportEstimate(p, requirements, {
    timestamp: "2026-11-25T00:00:00Z",
  });
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv, /2026-11-25T00:00:00Z/);
  assert.match(csv, /A, ""Factory""/);
  assert.match(csv, /'=bad/);
  assert.match(csv, /"Shortfall \(kg\)","10"/);
  assert.match(csv, /"Estimated delivered total INR","514"/);
  assert.match(csv, /Not compared: incomplete pool/);
});
