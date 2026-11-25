import { getCo2Factor } from "./co2-factors.js";
export function calculateImpact(requests = [], scenario = false) {
  const active = requests.filter(
      (r) =>
        r.status === "pending_agreement" &&
        r.plan?.complete &&
        r.plan?.transportComplete,
    ),
    seen = new Set(),
    overlap = new Set();
  const rows = active.map((r) => {
    for (const a of r.plan.allocations) {
      if (seen.has(a.recordId)) overlap.add(a.recordId);
      seen.add(a.recordId);
    }
    const factor = getCo2Factor(r.requirements.material);
    return {
      id: r.id,
      material: r.requirements.material,
      quantityKg: r.plan.quantityKg,
      buyerSavings: r.plan.savings,
      sellerNet: r.plan.sellerNet,
      platformFee: r.plan.fee,
      factor,
      co2CreditKg:
        scenario && factor.hasFactor
          ? r.plan.quantityKg * factor.kgCo2PerKg
          : null,
    };
  });
  const sum = (key) =>
    rows.reduce((s, r) => s + (Number.isFinite(r[key]) ? r[key] : 0), 0);
  const sumMoney = (key) => {
    const value = rows.reduce(
      (total, row) => total + BigInt(Math.round(row[key] * 100)),
      0n,
    );
    return value > BigInt(Number.MAX_SAFE_INTEGER) ||
      value < -BigInt(Number.MAX_SAFE_INTEGER)
      ? null
      : Number(value) / 100;
  };
  return {
    requestCount: rows.length,
    cancelledCount: requests.filter((r) => r.status === "cancelled").length,
    requestedKg: sum("quantityKg"),
    buyerSavings: sumMoney("buyerSavings"),
    sellerNet: sumMoney("sellerNet"),
    platformFee: sumMoney("platformFee"),
    overlapRecordCount: overlap.size,
    co2CreditKg:
      scenario &&
      rows.length &&
      !overlap.size &&
      rows.every((r) => r.co2CreditKg !== null)
        ? sum("co2CreditKg")
        : null,
    rows,
    scenario,
    actualDeliveredKg: null,
  };
}
