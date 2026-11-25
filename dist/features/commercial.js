import { esc, num, money } from "./shared.js";
export const providerLabel = {
  buyer_owned: "Buyer-owned vehicle",
  seller_owned: "Seller-owned vehicle",
  external: "External carrier",
};
export function commercialSummary(p) {
  return `<div class="cost-row"><span>Material subtotal</span><strong>${money(p.materialCost)}</strong></div><div class="cost-row"><span>Platform commission (${p.feePercent}% total)</span><strong>${money(p.fee)}</strong></div><div class="cost-row"><span>Buyer commission · 70% share</span><strong>${money(p.buyerFee)}</strong></div><div class="cost-row"><span>Seller commission · 30% share</span><strong>${money(p.sellerFee)}</strong></div><div class="cost-row"><span>Known buyer-paid transport</span><strong>${money(p.buyerTransport)}</strong></div><div class="cost-row"><span>Known seller-paid transport</span><strong>${money(p.sellerTransport)}</strong></div><div class="cost-row total"><strong>${p.transportComplete ? "Estimated buyer outlay" : "Buyer outlay · transport pending"}</strong><strong>${money(p.totalCost)}</strong></div><div class="cost-row"><span>${p.transportComplete ? "Total seller net proceeds" : "Provisional seller net · transport pending"}</span><strong>${money(p.sellerNet)}</strong></div>${p.savings !== null ? `<div class="cost-row"><span>Comparison total</span><strong>${money(p.baselineCost)}</strong></div><div class="cost-row saving"><span>${p.savings > 0 ? "Potential buyer savings" : "Difference from comparison"}</span><strong>${money(p.savings)}</strong></div>` : '<p class="help-text">Savings appear after the required quantity and every transport decision are complete.</p>'}<p class="help-text">Commission applies to material value only. Taxes and payment-processing charges are excluded. Platform earnings are projected until a deal completes.</p>`;
}
export function allocationSummary(p) {
  return p.allocations
    .map(
      (a) =>
        `<article class="allocation-row"><div><strong>${esc(a.company)}</strong><p>${esc(a.title)} · ${num(a.quantityKg)} kg × ${money(a.pricePerKg)}</p><p>Material ${money(a.payout)} · Seller commission ${money(a.sellerFee)} · Seller transport ${money(a.sellerTransport)} · <strong>Seller net ${money(a.sellerNet)}</strong></p>${a.pickup ? `<p>${providerLabel[a.pickup.provider]} · ${a.pickup.payer === "buyer" ? "Buyer" : "Seller"} pays ${money(a.pickup.cost)}</p>` : "<p>Transport decision pending</p>"}</div></article>`,
    )
    .join("");
}
