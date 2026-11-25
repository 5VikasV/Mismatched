import test from "node:test";
import assert from "node:assert/strict";
import {
  commission,
  quantityBand,
  toKg,
  settleAllocations,
} from "../dist/trade-policy.js";
test("fixed commission tiers apply to entire material value at exact paise boundaries", () => {
  for (const [gross, rate, fee, buyer, seller] of [
    [99999.99, 5, 5000, 3500, 1500],
    [100000, 4, 4000, 2800, 1200],
    [1000000, 4, 40000, 28000, 12000],
    [1000000.01, 3, 30000, 21000, 9000],
    [200000, 4, 8000, 5600, 2400],
  ]) {
    const r = commission(gross);
    assert.deepEqual(
      [r.feePercent, r.fee, r.buyerFee, r.sellerFee],
      [rate, fee, buyer, seller],
    );
  }
});
test("quantity categories and exact kg/tonne conversion have no decimal gaps", () => {
  for (const [kg, id] of [
    [0.000001, "small"],
    [9999.999999, "small"],
    [10000, "bulk"],
    [100000, "bulk"],
    [100000.000001, "large"],
    [200000, "large"],
    [200000.000001, "industrial"],
    [500000, "industrial"],
    [500000.000001, "enterprise"],
  ])
    assert.equal(quantityBand(kg).id, id);
  assert.equal(quantityBand(0), null);
  assert.equal(toKg(10.5, "t"), 10500);
  assert.equal(toKg(0.000000001, "t"), 0.000001);
  assert.equal(toKg(0.0000001, "kg"), null);
  assert.equal(toKg(3, "pounds"), null);
});
test("every provider and payer combination allocates only its actual cost and reconciles proceeds", () => {
  for (const provider of ["buyer_owned", "seller_owned", "external"])
    for (const payer of ["buyer", "seller"]) {
      const p = settleAllocations(
        [{ recordId: "a", payout: 200000, title: "A" }],
        [{ recordId: "a", provider, payer, cost: 1000 }],
      );
      assert.equal(p.transportComplete, true);
      assert.equal(p.fee, 8000);
      assert.equal(p.buyerFee + p.sellerFee, p.fee);
      assert.equal(p.totalCost, payer === "buyer" ? 206600 : 205600);
      assert.equal(p.sellerNet, payer === "seller" ? 196600 : 197600);
    }
});
test("pooled seller fees reconcile in paise including tiny values and transport errors", () => {
  const rows = [
    { recordId: "a", title: "a", payout: 0.1 },
    { recordId: "b", title: "b", payout: 0.1 },
    { recordId: "c", title: "c", payout: 0.1 },
  ];
  const zero = rows.map((r) => ({
    recordId: r.recordId,
    provider: "buyer_owned",
    payer: "buyer",
    cost: 0,
    zeroCostConfirmed: true,
  }));
  const p = settleAllocations(rows, zero);
  assert.equal(p.fee, 0.02);
  assert.equal(p.buyerFee, 0.01);
  assert.equal(p.sellerFee, 0.01);
  assert.equal(
    p.allocations.reduce((s, a) => s + Math.round(a.sellerFee * 100), 0),
    1,
  );
  assert.equal(
    settleAllocations(
      rows,
      zero.map((r) => ({ ...r, zeroCostConfirmed: false })),
    ).transportComplete,
    false,
  );
  assert.equal(settleAllocations(rows, []).transportComplete, false);
  assert.throws(() => settleAllocations(rows, [zero[0], zero[0]]), /unique/);
  assert.throws(
    () => settleAllocations(rows, [{ ...zero[0], recordId: "rogue" }]),
    /unique/,
  );
  assert.equal(
    settleAllocations(
      [{ recordId: "a", title: "a", payout: 10 }],
      [{ recordId: "a", provider: "seller_owned", payer: "seller", cost: 20 }],
    ).transportComplete,
    false,
  );
});
