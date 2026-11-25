import {
  scoreMatch,
  splitTransportCost,
  suggestPoolLots,
} from "../matching.js";
import { planPool, eligibilityReasons } from "../planner.js";
import { BANDS, quantityBand, toKg } from "../trade-policy.js";
import { exportEstimate } from "../estimate.js";
import { esc, field, num } from "./shared.js";
import { commercialSummary, allocationSummary } from "./commercial.js";
export async function mountFeature(root, ctx) {
  const w = root.ownerDocument.defaultView;
  let alive = true,
    selection = null,
    url = null,
    unit = "kg",
    band = "",
    error = "",
    busy = false,
    quote = null,
    submission = null,
    confirmed = false,
    ack = false;
  const inputs = {
    material: "",
    grade: "",
    quantityKg: "",
    comparisonPrice: "",
    buyerLatitude: "",
    buyerLongitude: "",
  };
  const pickupDrafts = new Map();
  const shared = { cost: "", provider: "", payer: "", zero: false };
  const requirements = () => ({
    buyerLatitude:
      inputs.buyerLatitude === "" ? null : Number(inputs.buyerLatitude),
    buyerLongitude:
      inputs.buyerLongitude === "" ? null : Number(inputs.buyerLongitude),
    material: inputs.material,
    grade: inputs.grade,
    quantityKg: toKg(Number(inputs.quantityKg), unit),
    comparisonPrice:
      inputs.comparisonPrice === "" ? null : Number(inputs.comparisonPrice),
    selectedRecordIds: [
      ...(selection ?? new Set(ctx.getData().records.map((r) => r.id))),
    ],
  });
  function calculation() {
    const r = requirements(),
      base = planPool(ctx.getData().records, r);
    const pickups = base.allocations.map((a) => {
      const d = pickupDrafts.get(a.recordId) || {};
      return {
        recordId: a.recordId,
        provider: d.provider || "",
        payer: d.payer || "",
        cost: d.cost === "" || d.cost == null ? null : Number(d.cost),
        zeroCostConfirmed: d.zeroCostConfirmed === true,
      };
    });
    return {
      r,
      pickups,
      p: planPool(ctx.getData().records, { ...r, pickups }),
    };
  }
  let displayed, displayedRequirements, displayedAt;
  const options = (values, current) =>
    '<option value="">Choose…</option>' +
    Object.entries(values)
      .map(
        ([v, label]) =>
          `<option value="${v}" ${current === v ? "selected" : ""}>${label}</option>`,
      )
      .join("");
  function invalidate() {
    quote = null;
    submission = null;
    confirmed = false;
    ack = false;
    error = "";
  }
  function matchDetails(record, r) {
    const match = scoreMatch(record, r);
    return `<details class="match-explanation"><summary>Why this lot? · ${match.unknownCount} unknown factor${match.unknownCount === 1 ? "" : "s"}</summary><p class="help-text">Rule-based explanation, not an ML confidence score or certification. Distance is straight-line, not a truck route.</p><ul class="match-factors">${match.factors.map((f) => `<li><strong>${esc(f.label)}</strong>: ${esc(f.sentence)}</li>`).join("")}</ul></details>`;
  }
  function suggestions(p, r) {
    const candidates = suggestPoolLots(
      ctx.getData().records,
      r,
      p,
      eligibilityReasons,
    );
    if (
      (p.complete && (p.savings === null || p.savings > 0)) ||
      !candidates.length
    )
      return "";
    return `<section class="panel panel-body pool-suggestions"><div class="card-kicker">MAKE IT WORK</div><h2>${p.shortfallKg > 0 ? num(p.shortfallKg) + " kg still needed" : "Try lower-cost material"}</h2><p class="help-text">Unselected compatible lots, ranked by known distance then price. Unknown locations are not claimed to be nearby. Adding a lot still requires its transport decision; no positive savings are guaranteed.</p>${candidates.map((c) => `<div class="candidate-row"><div><strong>${esc(c.record.title)}</strong><p>${num(c.record.quantityKg)} kg · ₹${num(c.record.pricePerKg)}/kg · ${c.match.byKey.distance.distanceKm === null ? "Distance unknown" : num(c.match.byKey.distance.distanceKm) + " km"}</p></div><button class="btn btn-secondary" data-plan-action="add-candidate" data-record="${esc(c.record.id)}">Add this lot</button></div>`).join("")}</section>`;
  }
  function render() {
    if (!alive) return;
    root.dataset.feature = "planner";
    const { r, pickups, p } = calculation();
    displayed = p;
    displayedRequirements = { ...r, pickups };
    displayedAt = new Date().toISOString();
    const records = ctx
      .getData()
      .records.filter((r) => !band || quantityBand(r.quantityKg)?.id === band);
    root.innerHTML = `<header class="feature-intro"><div><div class="eyebrow">04 / POOL PLANNER</div><h1>Plan the deal.</h1><p>Choose your material, see the commission, and decide who handles every pickup.</p><p><a class="btn btn-secondary" href="./assets/ScrapLoop_Material_Analysis_Sample.pdf" download>Download sample material analysis (PDF)</a></p></div><a class="btn btn-secondary" href="#bookings">Booking requests ↗</a></header><div class="notice">Estimates and local booking requests only. Saving a request does not reserve stock, collect payment or dispatch transport.</div><div class="review-layout"><section><section class="panel panel-body"><div class="card-kicker">DEFINE / 01</div><h2>Your requirement</h2><form id="planner-form"><div class="form-grid">${field("material", "Material", inputs.material)}${field("grade", "Required grade", inputs.grade)}${field("quantityKg", unit === "t" ? "Required quantity (metric tonnes)" : "Required quantity (kg)", inputs.quantityKg, "number")}<label class="field"><span class="field-label">Quantity unit</span><select class="select" name="quantityUnit"><option value="kg" ${unit === "kg" ? "selected" : ""}>Kilograms (kg)</option><option value="t" ${unit === "t" ? "selected" : ""}>Metric tonnes (t)</option></select></label>${field("comparisonPrice", "Comparison material price (₹ / kg)", inputs.comparisonPrice, "number")}${field("buyerLatitude", "Buyer latitude (optional)", inputs.buyerLatitude, "number")}${field("buyerLongitude", "Buyer longitude (optional)", inputs.buyerLongitude, "number")}</div><p class="help-text" id="quantity-category">${r.quantityKg ? `${num(r.quantityKg)} kg / ${num(r.quantityKg / 1000)} t · ${quantityBand(r.quantityKg)?.label || ""}` : "Enter an exact quantity; 1 metric tonne = 1,000 kg."}</p><p class="help-text">With both buyer and lot coordinates, the matching limit is 50 km straight-line. Leave unknown coordinates blank; no map locations are invented.</p><p class="help-text">Fixed commission: below ₹1 lakh 5% · ₹1–10 lakh inclusive 4% · above ₹10 lakh 3%. Buyer pays 70% of commission; sellers pay 30%.</p><button class="btn btn-primary" type="submit">Calculate a pool</button></form></section><section class="panel panel-body"><div class="card-kicker">COMBINE / 02</div><div class="feature-toolbar"><h2>Choose material lots</h2><button type="button" class="text-link" data-plan-action="all">Select eligible</button><button type="button" class="text-link" data-plan-action="none">Clear selection</button></div><div class="band-filter" role="group" aria-label="Filter lots by available quantity"><button class="btn btn-secondary" data-plan-action="band" data-band="" aria-pressed="${!band}">All sizes</button>${BANDS.map((b) => `<button class="btn btn-secondary" data-plan-action="band" data-band="${b.id}" aria-pressed="${band === b.id}">${b.label}</button>`).join("")}</div><p class="help-text">Bands filter each lot’s available quantity. Filtering does not change your requirement or selected lots. ${r.selectedRecordIds.length} selected IDs.</p>${
      records
        .map((record) => {
          const reasons = eligibilityReasons(record, r);
          return `<div class="lot-option"><label class="lot-choice"><input type="checkbox" name="lot" value="${esc(record.id)}" ${r.selectedRecordIds.includes(record.id) ? "checked" : ""} ${reasons.length ? "disabled" : ""}><span><strong>${esc(record.title)}</strong><small>${esc(record.company || "Company unknown")} · ${esc(record.material || "Unknown")} / ${esc(record.grade || "Unknown")}</small><small>${record.quantityKg == null ? "Quantity unknown" : num(record.quantityKg) + " kg"} · ${reasons.length ? "Excluded: " + esc(reasons.join("; ")) : "Eligible"}</small></span></label>${matchDetails(record, r)}</div>`;
        })
        .join("") ||
      '<p>No matching lots. <a href="#analysis">Add reviewed material records</a> or choose another band.</p>'
    }<p class="help-text">Confirmed clean condition, matching grade and known quantity/price are required. A broad ML category does not establish compatibility.</p></section><section class="panel panel-body"><div class="card-kicker">TRANSPORT / 03</div><h2>Decide each pickup</h2><p class="help-text">Choose a provider, payer and proposed cost for every contributing lot. An owned vehicle is not automatically free. Each entry covers the entire allocated lot, including any required trips.</p>${p.allocations.length ? `<details class="shared-transport"><summary>Split one shared transport estimate by quantity</summary><p class="help-text">Use only when the entered cost covers the whole pooled shipment. This replaces each pickup's proposal; you still review every decision before booking.</p><div class="form-grid"><label class="field"><span class="field-label">Shared cost (₹)</span><input class="input" data-shared="cost" type="number" min="0" step="0.01" value="${esc(shared.cost)}"></label><label class="field"><span class="field-label">Vehicle provider</span><select class="select" data-shared="provider">${options({ buyer_owned: "Buyer-owned vehicle", seller_owned: "Seller-owned vehicle", external: "External carrier" }, shared.provider)}</select></label><label class="field"><span class="field-label">Cost payer</span><select class="select" data-shared="payer">${options({ buyer: "Buyer", seller: "Contributing sellers" }, shared.payer)}</select></label><label class="confirmation-label"><input type="checkbox" data-shared="zero" ${shared.zero ? "checked" : ""}>Confirm zero cost when applicable</label></div><button class="btn btn-secondary" data-plan-action="split-shared">Apply quantity split</button></details>` : ""}${
      p.allocations
        .map((a) => {
          const d = pickupDrafts.get(a.recordId) || {};
          return `<fieldset class="pickup-card" data-pickup="${esc(a.recordId)}"><legend>${esc(a.title)} · ${num(a.quantityKg)} kg</legend><p>${esc(a.company)}</p><div class="form-grid"><label class="field"><span class="field-label">Vehicle provider</span><select class="select" data-pickup-field="provider">${options({ buyer_owned: "Buyer-owned vehicle", seller_owned: "Seller-owned vehicle", external: "External carrier" }, d.provider)}</select></label><label class="field"><span class="field-label">Transport cost payer</span><select class="select" data-pickup-field="payer">${options({ buyer: "Buyer", seller: "This pickup’s seller" }, d.payer)}</select></label><label class="field"><span class="field-label">Proposed pickup cost (₹)</span><input class="input" data-pickup-field="cost" type="number" min="0" step="0.01" value="${esc(d.cost ?? "")}"></label><label class="confirmation-label"><input type="checkbox" data-pickup-field="zeroCostConfirmed" ${d.zeroCostConfirmed ? "checked" : ""}>I explicitly confirm a zero-cost pickup when the cost is ₹0.</label></div></fieldset>`;
        })
        .join("") ||
      "<p>Contributing lots appear after you calculate a pool.</p>"
    }<button class="btn btn-secondary" data-plan-action="apply">Update transport totals</button> <button class="text-link" data-plan-action="refresh">Refresh material data</button></section>${suggestions(p, r)}</section><section class="panel panel-body planner-result" aria-live="polite"><div class="estimate-topline"><div class="eyebrow">YOUR POOL / ESTIMATE</div><span>${p.complete ? "QUANTITY MET" : "INCOMPLETE"}</span></div><h2>${num(p.quantityKg)} / ${num(p.requiredKg)} kg</h2><p>${p.quantityBand || "Quantity not set"} · ${p.allocations.length} contributing lots · ${num(p.shortfallKg)} kg shortfall</p><progress class="pool-progress" max="${p.requiredKg || 1}" value="${p.quantityKg}" aria-label="Required quantity fulfilled"></progress><div class="notice">${esc(p.reason)}</div>${allocationSummary(p)}${commercialSummary(p)}<button class="btn btn-secondary" data-plan-action="export" ${p.allocations.length ? "" : "disabled"}>Export estimate CSV</button><button class="btn btn-primary" data-plan-action="review" ${!p.complete || !p.transportComplete || busy ? "disabled" : ""}>${busy ? "Checking…" : "Create booking request"}</button><p class="error-message" role="alert">${esc(error)}</p>${quote ? `<section class="booking-review"><h3>Review before saving</h3><p>These exact material, fee and per-pickup transport terms will be saved as <strong>Pending agreement</strong>. No vehicle is dispatched.</p>${allocationSummary(quote.plan)}${commercialSummary(quote.plan)}<label class="confirmation-label"><input type="checkbox" data-plan-check="confirmed" ${confirmed ? "checked" : ""}>I reviewed the commercial and transport responsibilities. Final agreement with the parties is pending.</label>${!quote.plan.viable ? `<label class="confirmation-label"><input type="checkbox" data-plan-check="ack" ${ack ? "checked" : ""}>I acknowledge this request offers no positive buyer savings.</label>` : ""}<button class="btn btn-primary" data-plan-action="save" ${busy ? "disabled" : ""}>Save booking request</button><button class="text-link" data-plan-action="dismiss">Keep estimating</button></section>` : ""}</section></div>`;
    if (busy)
      root
        .querySelectorAll("input,select,button")
        .forEach((el) => (el.disabled = true));
    if (submission?.payload)
      root
        .querySelectorAll(".booking-review input")
        .forEach((el) => (el.disabled = true));
  }
  const controller = new w.AbortController(),
    opts = { signal: controller.signal };
  root.addEventListener(
    "input",
    (e) => {
      if (e.target.closest("#planner-form") && e.target.name in inputs) {
        inputs[e.target.name] = e.target.value;
        invalidate();
      }
      if (e.target.dataset.shared) {
        shared[e.target.dataset.shared] =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        invalidate();
      }
      const pickup = e.target.closest("[data-pickup]");
      if (pickup && e.target.dataset.pickupField) {
        const d = pickupDrafts.get(pickup.dataset.pickup) || {};
        d[e.target.dataset.pickupField] =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        pickupDrafts.set(pickup.dataset.pickup, d);
        invalidate();
      }
      if (e.target.dataset.planCheck === "confirmed")
        confirmed = e.target.checked;
      if (e.target.dataset.planCheck === "ack") ack = e.target.checked;
      // Stale previews must disappear immediately, without replacing the input being edited.
      if (!quote) {
        root.querySelector(".booking-review")?.remove();
        root
          .querySelector("[data-plan-action=review]")
          ?.setAttribute("disabled", "");
      }
    },
    opts,
  );
  root.addEventListener(
    "submit",
    (e) => {
      if (e.target.id === "planner-form") {
        e.preventDefault();
        invalidate();
        render();
      }
    },
    opts,
  );
  root.addEventListener(
    "change",
    (e) => {
      if (e.target.name === "quantityUnit") {
        const kg = toKg(Number(inputs.quantityKg), unit);
        unit = e.target.value;
        inputs.quantityKg =
          kg == null ? "" : String(unit === "t" ? kg / 1000 : kg);
        invalidate();
        render();
      }
      if (e.target.name === "lot") {
        if (!selection)
          selection = new Set(ctx.getData().records.map((r) => r.id));
        e.target.checked
          ? selection.add(e.target.value)
          : selection.delete(e.target.value);
        invalidate();
        render();
      }
    },
    opts,
  );
  root.addEventListener(
    "click",
    async (e) => {
      const button = e.target.closest("[data-plan-action]");
      if (!button || busy) return;
      const action = button.dataset.planAction;
      if (action === "add-candidate") {
        if (!selection)
          selection = new Set(ctx.getData().records.map((r) => r.id));
        const record = ctx
          .getData()
          .records.find((r) => r.id === button.dataset.record);
        if (record && !eligibilityReasons(record, requirements()).length)
          selection.add(record.id);
        invalidate();
        render();
      }
      if (action === "split-shared") {
        try {
          if (
            !shared.provider ||
            !shared.payer ||
            shared.cost === "" ||
            (Number(shared.cost) === 0 && !shared.zero)
          )
            throw new Error(
              "Choose the shared provider, payer and cost, confirming zero when applicable.",
            );
          const { p } = calculation();
          const shares = splitTransportCost(p.allocations, Number(shared.cost));
          for (const share of shares)
            pickupDrafts.set(share.recordId, {
              provider: shared.provider,
              payer: shared.payer,
              cost: String(share.cost),
              zeroCostConfirmed: share.cost === 0,
            });
          invalidate();
          render();
          ctx.toast(
            "Shared transport estimate split by allocated quantity. Review each pickup.",
          );
        } catch (e) {
          error = e.message;
          render();
        }
      }
      if (action === "all") {
        selection = new Set(
          ctx
            .getData()
            .records.filter(
              (r) => !eligibilityReasons(r, requirements()).length,
            )
            .map((r) => r.id),
        );
        invalidate();
        render();
      }
      if (action === "none") {
        selection = new Set();
        invalidate();
        render();
      }
      if (action === "band") {
        band = button.dataset.band;
        render();
      }
      if (action === "apply") {
        invalidate();
        render();
      }
      if (action === "refresh") {
        busy = true;
        render();
        try {
          await ctx.refreshData();
          invalidate();
        } catch (err) {
          error = err.message;
        } finally {
          busy = false;
          render();
        }
      }
      if (action === "dismiss") {
        invalidate();
        render();
      }
      if (action === "export" && displayed?.allocations.length) {
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
      if (action === "review") {
        busy = true;
        error = "";
        render();
        try {
          await ctx.refreshData();
          const { r, pickups } = calculation();
          const result = await ctx.api("/api/booking-quotes", {
            method: "POST",
            body: JSON.stringify({ requirements: r, pickups }),
          });
          if (alive) {
            quote = result;
            submission = {
              requirements: r,
              pickups,
              signature: result.signature,
              idempotencyKey: w.crypto.randomUUID(),
            };
            confirmed = false;
            ack = false;
          }
        } catch (err) {
          if (alive) error = err.message;
        } finally {
          busy = false;
          render();
          root
            .querySelector(".booking-review")
            ?.scrollIntoView?.({ block: "nearest" });
        }
      }
      if (action === "save" && quote && submission) {
        if (!confirmed || (!quote.plan.viable && !ack)) {
          error =
            "Confirm the responsibilities and any uneconomical-request acknowledgement.";
          render();
          return;
        }
        // Freeze the exact retry payload. After an ambiguous network failure, only retry it or review afresh.
        const payload = (submission.payload ||= {
          requirements: submission.requirements,
          pickups: submission.pickups,
          signature: submission.signature,
          idempotencyKey: submission.idempotencyKey,
          confirmed: true,
          acknowledgeUneconomical: ack,
        });
        busy = true;
        error = "";
        render();
        try {
          await ctx.api("/api/booking-requests", {
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (!alive) return;
          quote = null;
          submission = null;
          try {
            await ctx.refreshData();
          } catch {}
          ctx.toast("Booking request saved. Final agreement is pending.");
          ctx.navigate("bookings");
        } catch (err) {
          if (alive) error = err.message;
        } finally {
          busy = false;
          render();
        }
      }
    },
    opts,
  );
  render();
  return () => {
    alive = false;
    controller.abort();
    if (url) w.URL.revokeObjectURL(url);
  };
}
