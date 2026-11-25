import { esc, num, money } from "./shared.js";
const cash = (v) => (v === null ? "Outside supported precision" : money(v));
export async function mountFeature(root, ctx) {
  let alive = true,
    scenario = false,
    busy = false,
    error = "",
    report = null,
    revision = 0;
  const w = root.ownerDocument.defaultView,
    controller = new w.AbortController();
  root.dataset.feature = "impact";
  function render() {
    if (!alive) return;
    root.innerHTML = `<header class="feature-intro"><div><div class="eyebrow">07 / PLANNED IMPACT</div><h1>Potential, with a paper trail.</h1><p>Projected outcomes from non-cancelled booking requests. No deliveries or environmental benefits are verified.</p></div><a class="btn btn-secondary" href="#bookings">Booking requests ↗</a></header><p class="error-message" role="alert">${esc(error)}</p>${error ? '<button class="btn btn-secondary" data-impact-retry>Retry impact data</button>' : ""}${busy ? '<p role="status">Loading request snapshots…</p>' : ""}${
      report
        ? `<div class="metric-strip">${[
            [report.requestCount, "Pending requests"],
            [
              num(report.requestedKg) + " kg",
              "Requested quantity · may overlap",
            ],
            [cash(report.buyerSavings), "Potential buyer savings / difference"],
            [cash(report.sellerNet), "Projected seller net proceeds"],
          ]
            .map(
              ([v, l]) =>
                `<div class="metric"><strong>${v}</strong><span>${l}</span></div>`,
            )
            .join(
              "",
            )}</div><div class="notice">${report.cancelledCount} cancelled requests excluded. ${report.overlapRecordCount} material records occur in multiple requests. Requests do not reserve stock; these quantities and proceeds are not delivered results or collected revenue.</div><section class="panel panel-body"><h2>Recycling benchmark scenario</h2><label class="confirmation-label"><input type="checkbox" id="impact-scenario" ${scenario ? "checked" : ""}>Assume the configured PP, HDPE or PET material follows the WARM closed-loop resin recycling scenario.</label><p>Indicative recycling credit: <strong>${report.co2CreditKg === null ? "Not enough data / not summed" : num(Math.round(report.co2CreditKg * 100) / 100) + " kg CO₂e"}</strong></p><p class="help-text">Enable the scenario to see per-request benchmarks. Unsupported materials remain unknown. Overlapping request allocations are never summed into a carbon total. This US benchmark does not establish local industrial emissions, pickup emissions, landfill avoidance or certified impact.</p><p>Projected platform commission: ${cash(report.platformFee)} · no fees collected by this app.</p></section><section class="panel panel-body"><h2>Request-level evidence</h2><div class="table-scroll"><table><thead><tr><th>Request / material</th><th>Requested kg</th><th>Buyer difference</th><th>Recycling credit</th><th>Source</th></tr></thead><tbody>${report.rows.map((r) => `<tr><td>${esc(r.id.slice(0, 8))} / ${esc(r.material)}</td><td>${num(r.quantityKg)}</td><td>${money(r.buyerSavings)}</td><td>${r.co2CreditKg === null ? "Not enough data" : num(Math.round(r.co2CreditKg * 100) / 100) + " kg CO₂e"}</td><td>${r.factor.hasFactor ? `<a href="${r.factor.source}" target="_blank" rel="noopener noreferrer">WARM v16 · Exhibit 5-11</a>` : "No factor configured"}</td></tr>`).join("") || '<tr><td colspan="5">No pending requests. Create and review a pool first.</td></tr>'}</tbody></table></div><p class="help-text">${esc(report.rows.find((r) => r.factor.hasFactor)?.factor.note || "Only source-backed factors are enabled.")}</p></section>`
        : ""
    }`;
  }
  async function load() {
    const token = ++revision;
    if (report?.scenario !== scenario) report = null;
    busy = true;
    render();
    try {
      const data = await ctx.api(
        "/api/impact" + (scenario ? "?scenario=warm-closed-loop" : ""),
      );
      if (alive && token === revision) {
        report = data;
        error = "";
      }
    } catch (e) {
      if (alive && token === revision) error = e.message;
    } finally {
      if (token === revision) {
        busy = false;
        render();
      }
    }
  }
  root.addEventListener(
    "click",
    (e) => {
      if (e.target.closest("[data-impact-retry]")) load();
    },
    { signal: controller.signal },
  );
  root.addEventListener(
    "change",
    (e) => {
      if (e.target.id === "impact-scenario") {
        scenario = e.target.checked;
        load();
      }
    },
    { signal: controller.signal },
  );
  await load();
  return () => {
    alive = false;
    controller.abort();
  };
}
