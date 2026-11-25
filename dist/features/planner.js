import { planPool, eligibilityReasons } from "../planner.js";
import { exportEstimate } from "../estimate.js";
import { esc, field, num, money } from "./shared.js";
export async function mountFeature(root, ctx) {
  const w = root.ownerDocument.defaultView;
  let alive = true,
    selection = null,
    url = null;
  const inputs = {
    material: "",
    grade: "",
    quantityKg: "",
    comparisonPrice: "",
    transportCost: "0",
    feePercent: "0",
  };
  const labels = {
    material: "Material",
    grade: "Required grade",
    quantityKg: "Required quantity (kg)",
    comparisonPrice: "Comparison material price (₹ / kg)",
    transportCost: "Pickup cost estimate (₹)",
    feePercent: "Platform or handling fee (%)",
  };
  const requirements = () => ({
    ...Object.fromEntries(
      Object.entries(inputs).map(([k, v]) => [
        k,
        ["material", "grade"].includes(k) ? v : v === "" ? null : Number(v),
      ]),
    ),
    selectedRecordIds: [
      ...(selection ?? new Set(ctx.getData().records.map((r) => r.id))),
    ],
  });
  let displayed = null,
    displayedRequirements = null,
    displayedAt = null;
  function render() {
    if (!alive) return;
    root.dataset.feature = "planner";
    const records = ctx.getData().records,
      req = requirements(),
      p = planPool(records, req);
    displayed = p;
    displayedRequirements = req;
    displayedAt = new Date().toISOString();
    root.innerHTML = `<div class="eyebrow">POOL / SHIPMENT ESTIMATE</div><h1>Small lots.<br>One considered shipment.</h1><p>Choose the material records. See exactly how the quantities and costs add up.</p><div class="notice">Planning estimate only. No stock reservation, transaction, or transport booking is created.</div><div class="review-layout"><section><section class="panel panel-body"><h2>Your requirement</h2><form id="planner-form"><div class="form-grid">${Object.keys(
      inputs,
    )
      .map((k) =>
        field(
          k,
          labels[k],
          inputs[k],
          ["material", "grade"].includes(k) ? "text" : "number",
        ),
      )
      .join(
        "",
      )}</div><div class="form-actions"><button class="btn btn-primary" type="submit">Calculate a pool</button></div></form></section><section class="panel panel-body"><div class="feature-toolbar"><h2>Choose material lots</h2><button type="button" class="text-link" data-plan-action="all">Select eligible</button><button type="button" class="text-link" data-plan-action="none">Clear selection</button></div>${
      records.length
        ? records
            .map((r) => {
              const reasons = eligibilityReasons(r, req),
                checked = (selection ?? new Set(records.map((r) => r.id))).has(
                  r.id,
                );
              return `<label class="lot-choice"><input type="checkbox" name="lot" value="${esc(r.id)}" ${checked ? "checked" : ""} ${reasons.length ? "disabled" : ""}><span><strong>${esc(r.title)}</strong><small>${esc(r.company || "Company unknown")} · ${esc(r.material || "Material unknown")} / ${esc(r.grade || "Grade unknown")}</small><small>${r.quantityKg == null ? "Quantity unknown" : `${num(r.quantityKg)} kg`}${reasons.length ? ` · Excluded: ${esc(reasons.join("; "))}` : " · Eligible"}</small></span><strong>${r.pricePerKg == null ? "Price unknown" : `${money(r.pricePerKg)}/kg`}</strong></label>`;
            })
            .join("")
        : '<p>No saved material records. <a class="text-link" href="#analysis">Add and review material evidence</a> first.</p>'
    }<p class="help-text">A broad category such as plastic does not establish PP, HDPE, or a specific industrial grade. Confirmed clean condition, compatible grade, quantity, and price are required.</p></section></section><section class="panel panel-body planner-result" aria-live="polite"><div class="eyebrow">ESTIMATED SHIPMENT</div><h2>${num(p.quantityKg)} / ${num(p.requiredKg)} kg</h2><p>${p.allocations.length} contributing lots · ${num(p.shortfallKg)} kg shortfall</p><div class="notice">${esc(p.reason)}</div>${p.allocations.map((a) => `<div class="allocation-row"><span><strong>${esc(a.company)}</strong><span>${esc(a.title)} · ${num(a.quantityKg)} kg × ${money(a.pricePerKg)}</span></span><strong>${money(a.payout)}</strong></div>`).join("")}<div class="cost-row"><span>Material subtotal</span><strong>${money(p.materialCost)}</strong></div><div class="cost-row"><span>Pickup estimate</span><strong>${money(p.transportCost)}</strong></div><div class="cost-row"><span>Fee (${num(p.feePercent)}%)</span><strong>${money(p.fee)}</strong></div><div class="cost-row total"><strong>Estimated delivered cost</strong><strong>${money(p.totalCost)}</strong></div>${p.complete ? `<div class="cost-row"><span>Comparison total</span><strong>${money(p.baselineCost)}</strong></div><div class="cost-row saving"><span>${p.savings > 0 ? "Potential savings" : "Difference from comparison"}</span><strong>${money(p.savings)}</strong></div>` : "<p>Complete the requirement before comparing savings.</p>"}<p>${p.excludedCount} records excluded or unselected.</p><button class="btn btn-primary" type="button" data-plan-action="export" ${p.allocations.length ? "" : "disabled"}>Export estimate CSV</button><p class="help-text">CSV contains this displayed estimate, selected records, assumptions, and calculation time.</p></section></div>`;
  }
  const controller = new w.AbortController(),
    options = { signal: controller.signal };
  root.addEventListener(
    "input",
    (e) => {
      if (e.target.closest("#planner-form"))
        inputs[e.target.name] = e.target.value;
    },
    options,
  );
  root.addEventListener(
    "submit",
    (e) => {
      if (e.target.id === "planner-form") {
        e.preventDefault();
        render();
      }
    },
    options,
  );
  root.addEventListener(
    "change",
    (e) => {
      if (e.target.name === "lot") {
        if (!selection)
          selection = new Set(ctx.getData().records.map((r) => r.id));
        e.target.checked
          ? selection.add(e.target.value)
          : selection.delete(e.target.value);
        render();
        root
          .querySelector(
            `input[value="${w.CSS?.escape ? w.CSS.escape(e.target.value) : e.target.value}"]`,
          )
          ?.focus();
      }
    },
    options,
  );
  root.addEventListener(
    "click",
    (e) => {
      const button = e.target.closest("[data-plan-action]");
      if (!button) return;
      if (button.dataset.planAction === "all") {
        selection = new Set(
          ctx
            .getData()
            .records.filter(
              (r) => !eligibilityReasons(r, requirements()).length,
            )
            .map((r) => r.id),
        );
        render();
      }
      if (button.dataset.planAction === "none") {
        selection = new Set();
        render();
      }
      if (
        button.dataset.planAction === "export" &&
        displayed?.allocations.length
      ) {
        if (url) w.URL.revokeObjectURL(url);
        url = w.URL.createObjectURL(
          new w.Blob(
            [
              exportEstimate(displayed, displayedRequirements, {
                timestamp: displayedAt,
              }),
            ],
            { type: "text/csv;charset=utf-8" },
          ),
        );
        const a = root.ownerDocument.createElement("a");
        a.href = url;
        a.download = "scraploop-pool-estimate.csv";
        a.click();
        ctx.toast("Planning estimate exported.");
      }
    },
    options,
  );
  render();
  return () => {
    alive = false;
    controller.abort();
    if (url) w.URL.revokeObjectURL(url);
  };
}
