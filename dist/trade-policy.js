export const POLICY_VERSION = "2026-11-commercial-v1";
export const BANDS = [
  { id: "small", label: "Below 10 t", min: 0, max: 10000, minInclusive: false },
  {
    id: "bulk",
    label: "10–100 t",
    min: 10000,
    max: 100000,
    minInclusive: true,
  },
  {
    id: "large",
    label: "Over 100–200 t",
    min: 100000,
    max: 200000,
    minInclusive: false,
  },
  {
    id: "industrial",
    label: "Over 200–500 t",
    min: 200000,
    max: 500000,
    minInclusive: false,
  },
  {
    id: "enterprise",
    label: "Over 500 t",
    min: 500000,
    max: Infinity,
    minInclusive: false,
  },
];
export function quantityBand(kg) {
  if (!Number.isFinite(kg) || kg <= 0) return null;
  return (
    BANDS.find(
      (b) =>
        (b.minInclusive ? kg >= b.min : kg > b.min) &&
        (b.id === "small" ? kg < b.max : kg <= b.max),
    ) || null
  );
}
export function toKg(value, unit = "kg") {
  if (!["kg", "t"].includes(unit) || !Number.isFinite(value) || value <= 0)
    return null;
  const kg = value * (unit === "t" ? 1000 : 1);
  if (kg > 1e12 || Math.abs(kg * 1e6 - Math.round(kg * 1e6)) > 0.0001)
    return null;
  return Number(kg.toFixed(6));
}
export const cents = (value) => {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(Math.round(value * 100))
  )
    throw new Error("Amount exceeds supported currency precision.");
  return BigInt(Math.round(value * 100));
};
const amount = (n) => Number(n) / 100;
const percent = (n, p) => (n * BigInt(p) + 50n) / 100n;
export function commission(materialValue) {
  const gross = cents(materialValue);
  const rate = gross < 10000000n ? 5 : gross <= 100000000n ? 4 : 3;
  const total = percent(gross, rate),
    buyer = percent(total, 70);
  return {
    policyVersion: POLICY_VERSION,
    feePercent: rate,
    fee: amount(total),
    buyerFee: amount(buyer),
    sellerFee: amount(total - buyer),
  };
}
export function settleAllocations(allocations, pickups = []) {
  const gross = allocations.reduce((s, a) => s + cents(a.payout), 0n);
  const fees = commission(amount(gross));
  const sellerFee = cents(fees.sellerFee),
    errors = [];
  if (!Array.isArray(pickups)) throw new Error("Pickups must be a list.");
  const ids = new Set(allocations.map((a) => a.recordId));
  const seen = new Set();
  for (const p of pickups) {
    if (
      !p ||
      typeof p !== "object" ||
      !ids.has(p.recordId) ||
      seen.has(p.recordId)
    )
      throw new Error("Each pickup must refer to one unique allocated lot.");
    seen.add(p.recordId);
  }
  let cumulative = 0n,
    assigned = 0n,
    buyerTransport = 0n,
    sellerTransport = 0n;
  const rows = allocations.map((a) => {
    cumulative += cents(a.payout);
    const target = gross ? (sellerFee * cumulative + gross / 2n) / gross : 0n;
    const share = target - assigned;
    assigned = target;
    const pickup = pickups.find((p) => p.recordId === a.recordId);
    const valid =
      pickup &&
      ["buyer_owned", "seller_owned", "external"].includes(pickup.provider) &&
      ["buyer", "seller"].includes(pickup.payer) &&
      typeof pickup.cost === "number" &&
      Number.isFinite(pickup.cost) &&
      pickup.cost >= 0 &&
      pickup.cost <= 1e12 &&
      Math.abs(pickup.cost * 100 - Math.round(pickup.cost * 100)) < 0.0001 &&
      (pickup.cost !== 0 || pickup.zeroCostConfirmed === true);
    if (!valid)
      errors.push(
        `${a.title}: choose a vehicle provider, payer and cost; explicitly confirm zero cost.`,
      );
    const cost = valid ? cents(pickup.cost) : 0n;
    if (valid && pickup.payer === "buyer") buyerTransport += cost;
    if (valid && pickup.payer === "seller") sellerTransport += cost;
    const net =
      cents(a.payout) -
      share -
      (valid && pickup.payer === "seller" ? cost : 0n);
    if (net < 0n) errors.push(`${a.title}: seller proceeds would be negative.`);
    return {
      ...a,
      sellerFee: amount(share),
      sellerTransport: valid && pickup.payer === "seller" ? amount(cost) : 0,
      sellerNet: amount(net),
      pickup: valid
        ? {
            recordId: a.recordId,
            provider: pickup.provider,
            payer: pickup.payer,
            cost: pickup.cost,
            zeroCostConfirmed: pickup.cost === 0,
          }
        : null,
    };
  });
  const total = gross + cents(fees.buyerFee) + buyerTransport;
  if (
    total > BigInt(Number.MAX_SAFE_INTEGER) ||
    gross > BigInt(Number.MAX_SAFE_INTEGER) ||
    buyerTransport + sellerTransport > BigInt(Number.MAX_SAFE_INTEGER)
  )
    throw new Error("Amount exceeds supported currency precision.");
  return {
    ...fees,
    allocations: rows,
    materialCost: amount(gross),
    buyerTransport: amount(buyerTransport),
    sellerTransport: amount(sellerTransport),
    transportCost: amount(buyerTransport + sellerTransport),
    totalCost: amount(total),
    sellerNet: amount(gross - sellerFee - sellerTransport),
    transportComplete: rows.length > 0 && errors.length === 0,
    transportErrors: errors,
  };
}
