import { esc } from "./shared.js";
import { PROFILES } from "../evidence-data.js";
import { assessEmissions } from "../evidence-calculator.js";
import { SETUP_COSTS, MONTHLY_COSTS, IMPLEMENTATION_BUDGET as budget, FUNDING_TARGETS } from "../implementation-data.js";
const n = (value) => Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const rupees = (value) => new Intl.NumberFormat("en-IN", {style: "currency", currency: "INR", maximumFractionDigits: 0}).format(value);
const range = (value) => `${rupees(value.low)}–${rupees(value.high)}`;
const lakh = (value) => `₹${n(value.low / 100000)}–${n(value.high / 100000)} lakh`;
const link = (url, label) => `<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const headlinePreset = { category: "plastic", profileId: "pp", condition: "clean", baseline: "combustion", alternative: "recycling", mode: "direct-burning", massTonnes: 100, adoptionPercent: 30, recoveryPercent: 90 };
function costTable(rows, totals, caption) {
  return `<div class="table-scroll"><table class="implementation-cost-table"><caption>${caption}</caption><thead><tr><th>Cost item</th><th>Low estimate</th><th>High estimate</th></tr></thead><tbody>${rows.map(row => `<tr><th scope="row">${esc(row.label)}</th><td>${rupees(row.low)}</td><td>${rupees(row.high)}</td></tr>`).join("")}</tbody><tfoot><tr><th scope="row">Total</th><td>${rupees(totals.low)}</td><td>${rupees(totals.high)}</td></tr></tfoot></table></div>`;
}
function implementation() {
  return `<section class="evidence-section implementation-section" aria-labelledby="implementation-title" id="implementation">
    <header class="section-heading"><div><div class="eyebrow">03 / IMPLEMENTATION</div><h2 id="implementation-title">Implementation</h2></div><span class="desk-tag">PLANNING ESTIMATES · INR</span></header>
    <p>Start in one Indian industrial cluster, validate material quality with suppliers and buyers, and use existing transport partners. These estimates describe the proposed next step; they are not expenditure already incurred or supplier quotations.</p>
    <div class="metric-strip implementation-summary">
      <div class="metric"><strong>${lakh(budget.initial)}</strong><span>First three months · setup + operations + transaction allowance</span></div>
      <div class="metric"><strong>${range(budget.technical)}</strong><span>Technical maintenance per month · included in operating costs</span></div>
      <div class="metric"><strong>${range(budget.monthly)}</strong><span>Full pilot operations per month · excluding per-order costs</span></div>
    </div>
    <div class="implementation-costs">
      <article class="panel panel-body"><div class="card-kicker">BEFORE LAUNCH</div><h3>Initial setup &amp; deployment</h3><p class="help-text">Production preparation builds on the existing application: business accounts and permissions, secure deployment, backups, operational controls and testing.</p>${costTable(SETUP_COSTS, budget.setup, "One-time setup budget")}</article>
      <article class="panel panel-body"><div class="card-kicker">EACH MONTH</div><h3>Maintenance &amp; pilot operations</h3><p class="help-text">One paid field coordinator and part-time technical maintenance; founders handle management and sales without salaries in this estimate.</p>${costTable(MONTHLY_COSTS, budget.monthly, "Monthly operating budget")}</article>
    </div>
    <article class="panel panel-body implementation-total"><div class="card-kicker">THE FIRST 90 DAYS</div><h3>How the three-month budget adds up</h3><dl class="implementation-breakdown"><div><dt>One-time setup</dt><dd>${range(budget.setup)}</dd></div><div><dt>Three months of operations</dt><dd>${range({low: budget.months * budget.monthly.low, high: budget.months * budget.monthly.high})}</dd></div><div><dt>Transaction-cost allowance</dt><dd>${rupees(budget.transactionAllowance)}</dd></div><div class="implementation-grand-total"><dt>Estimated first-three-month requirement</dt><dd>${range(budget.initial)}</dd></div></dl>
    <p class="help-text">The transaction allowance assumes ${budget.orderAllowance} completed orders across the entire pilot at ${rupees(budget.directCostPerOrder)} of additional external verification, commission collection and issue-handling costs per order. This is a budget allowance, not an order forecast. Technical maintenance is already included in operations and must not be added twice.</p>
    <p class="help-text">Assumptions: existing laptops; no office, warehouse, owned vehicles or scrap inventory; no founder salaries or financing of buyers’ purchases. Taxes, material purchases and actual freight are additional. Freight is quoted separately and paid by the buyer or seller agreed for each pickup. These figures require local quotations and do not guarantee profitability.</p>
    <p class="help-text">Hosting reference: DigitalOcean lists a basic 4 GiB / 2-vCPU server at US$24 per month, before extras and taxes. The hosting allowance above also budgets for storage, backups and monitoring. Local photo ML has no per-photo provider fee; document AI is usage-based. ${link("https://www.digitalocean.com/pricing/droplets", "Provider pricing reference")}</p></article>
    <section class="implementation-funding" aria-labelledby="funding-title"><div class="section-heading"><div><div class="eyebrow">FUNDING APPROACH</div><h3 id="funding-title">Who we would approach</h3></div><span class="desk-tag">PILOT FUNDING TARGET: ${lakh(budget.fundingTarget)}</span></div>
    <p>Prioritise incubation, grants and paid industrial pilots. Approach equity investors with evidence of completed transactions, repeat buyers and collected commission. No named organisation has committed funding; programme intake and eligibility must be confirmed.</p>
    <div class="implementation-funders">${FUNDING_TARGETS.map(target => `<article class="panel panel-body"><div class="card-kicker">${esc(target.stage)}</div><h3>${esc(target.name)}</h3><p>${esc(target.description)}</p>${target.url ? link(target.url, target.source) : ""}</article>`).join("")}</div>
    <div class="notice"><strong>Illustrative funding mix:</strong> ₹4 lakh in grant support + ₹3 lakh in paid pilot contracts = a ₹7 lakh target. This is a fundraising proposal, not money raised. Customer pilot fees are revenue; equity investment involves ownership.</div></section>
  </section>`;
}
export async function mountFeature(root, context) {
  const window = root.ownerDocument.defaultView;
  let registry, report;
  try {
    [registry, { report }] = await Promise.all([context.api("/api/evidence"), context.api("/api/model-report")]);
  } catch (error) {
    root.innerHTML = `<p role="alert">${esc(error.message)}</p><button class="btn" data-action="refresh" data-shell-action>Retry</button>`;
    return;
  }
  const profile = PROFILES.find(profile => profile.id === "pp");
  root.innerHTML = `<header class="carbon-headline"><div class="eyebrow">09 / EVIDENCE &amp; NUMBERS · ILLUSTRATIVE ESTIMATE</div><output id="carbon-headline-percent">${n(assessEmissions(headlinePreset).reductionPercent)}%</output><h1 id="carbon-headline-label">Estimated reduction in burning-point CO₂</h1><p id="carbon-headline-assumptions" class="help-text">Clean PP example: 30% adoption × 90% successful recovery. Direct CO₂ at the original burning point only; excludes recycling and transport. Illustrative, not measured. This is not a net climate saving or an emission test.</p>${link(profile.source, "Published benchmark source")}</header>
 <section aria-labelledby="cases-title"><div class="section-heading"><div><div class="eyebrow">01 / PUBLISHED PRECEDENTS</div><h2 id="cases-title">Real Indian industrial exchanges.</h2></div></div><p>Indian examples from your research document, alongside the earlier Indian cases: who supplies the by-product, who uses it, and how they connected. Historical figures and missing buyer details are marked.</p>
 <div class="evidence-cases">${registry.cases.map((c) => `<article class="panel panel-body evidence-case" data-case="${esc(c.id)}"><div class="eyebrow">${esc(c.region)} · PUBLISHED CASE</div><h3>${esc(c.title)}</h3><p class="help-text">${esc(c.period)}</p><div class="evidence-flow"><strong>${esc(c.from)}</strong><span>↓ ${esc(c.material)} ↓</span><strong>${esc(c.to)}</strong></div><ul class="case-figures">${c.figures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><p>${esc(c.story)}</p>${c.connection ? `<p><strong>How they got connected</strong><br>${esc(c.connection)}</p>` : ""}<details><summary>Scope & limits</summary><p>${esc(c.limit)}</p></details><div class="case-sources">${link(c.source, c.publisher)}${(c.references || []).map((r) => link(r.url, r.label)).join("")}</div></article>`).join("")}</div></section>
 <section class="panel panel-body evidence-section"><div class="eyebrow">02 / PROJECT MEASUREMENT</div><h2>What our classifier has actually proved.</h2>${report ? `<div class="metric-strip"><div class="metric"><strong>${n(report.trained.test.accuracy * 100)}%</strong><span>Held-out TrashNet accuracy</span></div><div class="metric"><strong>${n(report.trained.test.macroF1 * 100)}%</strong><span>Macro-F1</span></div><div class="metric"><strong>${n(report.counts.test)}</strong><span>Test images</span></div></div><p>MobileNetV3 Small, fine-tuned on TrashNet. ${n(report.counts.train)} training / ${n(report.counts.validation)} validation images. Six broad categories, mostly isolated household objects.</p>` : "<p>No evaluation report available. Accuracy is unknown.</p>"}<p>Industrial-pile performance, purity, alloy, hazardous status, mass and price are not validated by this test. Classification accuracy is never an emissions multiplier.</p><a class="text-link" href="#results">Inspect measured results ↗</a></section>
${implementation()}`;
  const printDetails = () => {
    root.querySelectorAll("details").forEach(detail => { detail.dataset.printWasOpen = String(detail.open); detail.open = true; });
  };
  const restoreDetails = () => {
    root.querySelectorAll("details[data-print-was-open]").forEach(detail => { detail.open = detail.dataset.printWasOpen === "true"; delete detail.dataset.printWasOpen; });
  };
  window.addEventListener("beforeprint", printDetails);
  window.addEventListener("afterprint", restoreDetails);
  return () => { window.removeEventListener("beforeprint", printDetails); window.removeEventListener("afterprint", restoreDetails); };
}
