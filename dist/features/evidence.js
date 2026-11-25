import { esc, money } from "./shared.js";
import { PROFILES, CATEGORIES } from "../evidence-data.js";
import { businessProjection, evidenceCSV } from "../evidence-calculator.js";
const n = (v) =>
  Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const link = (url, label) =>
  `<a class="text-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const input = (name, label, value = "", extra = "") =>
  `<label class="field"><span class="field-label">${label}</span><input class="input" name="${name}" type="number" step="${name === "orders" ? "1" : "any"}" value="${value}" ${extra}></label>`;
const options = (rows) =>
  rows
    .map(([id, label]) => `<option value="${id}">${esc(label)}</option>`)
    .join("");
export async function mountFeature(root, context) {
  const window = root.ownerDocument.defaultView,
    document = root.ownerDocument;
  const { FormData, URL, Blob } = window;
  let alive = true,
    requestVersion = 0,
    assessment = null,
    business = null;
  let registry, report;
  try {
    [registry, { report }] = await Promise.all([
      context.api("/api/evidence"),
      context.api("/api/model-report"),
    ]);
  } catch (e) {
    root.innerHTML = `<p role="alert">${esc(e.message)}</p><button class="btn" data-action="refresh" data-shell-action>Retry</button>`;
    return;
  }
  if (!alive) return;
  root.innerHTML = `<header class="feature-intro"><div><div class="eyebrow">09 / EVIDENCE & NUMBERS</div><h1>Waste has a cost.<br>Show the alternative.</h1><p>Published industrial exchanges, measured model results and transparent projections. Each number has a boundary.</p></div><span class="desk-tag">REVIEWED ${esc(registry.reviewedAt)}</span></header>
 <div class="evidence-toolbar"><button class="btn btn-secondary" id="evidence-export">Export pitch CSV</button><button class="btn btn-secondary" id="evidence-print">Print pitch</button></div>
 <section aria-labelledby="cases-title"><div class="section-heading"><div><div class="eyebrow">01 / PUBLISHED PRECEDENTS</div><h2 id="cases-title">Someone’s surplus. Someone else’s input.</h2></div></div><p>These sources show real reuse and demand. They do not establish that an identified company bought excess stock, burned that same stock, and had a ready buyer at the same time. We do not invent that link.</p>
 <div class="evidence-cases">${registry.cases.map((c) => `<article class="panel panel-body evidence-case"><div class="eyebrow">${esc(c.region)} · PUBLISHED CASE</div><h3>${esc(c.title)}</h3><p class="help-text">${esc(c.period)}</p><div class="evidence-flow"><strong>${esc(c.from)}</strong><span>↓ ${esc(c.material)} ↓</span><strong>${esc(c.to)}</strong></div><ul class="case-figures">${c.figures.map((f) => `<li>${esc(f)}</li>`).join("")}</ul><p>${esc(c.story)}</p><details><summary>Scope & limits</summary><p>${esc(c.limit)}</p></details>${link(c.source, c.publisher)}</article>`).join("")}</div></section>
 <section class="panel panel-body evidence-section"><div class="eyebrow">02 / PROJECT MEASUREMENT</div><h2>What our classifier has actually proved.</h2>${report ? `<div class="metric-strip"><div class="metric"><strong>${n(report.trained.test.accuracy * 100)}%</strong><span>Held-out TrashNet accuracy</span></div><div class="metric"><strong>${n(report.trained.test.macroF1 * 100)}%</strong><span>Macro-F1</span></div><div class="metric"><strong>${n(report.counts.test)}</strong><span>Test images</span></div></div><p>MobileNetV3 Small, fine-tuned on TrashNet. ${n(report.counts.train)} training / ${n(report.counts.validation)} validation images. Six broad categories, mostly isolated household objects.</p>` : "<p>No evaluation report available. Accuracy is unknown.</p>"}<p>Industrial-pile performance, purity, alloy, hazardous status, mass and price are not validated by this test. Classification accuracy is never an emissions multiplier.</p><a class="text-link" href="#results">Inspect measured results ↗</a></section>
 <section class="evidence-section" aria-labelledby="carbon-title"><div class="eyebrow">03 / CONDITIONAL PROJECTION</div><h2 id="carbon-title">What could be avoided?</h2><p>Select a documented material and compare pathways. All categories can be assessed for evidence availability; only matching published profiles produce a number. Hazardous classification needs separate evidence.</p>
 <form id="emissions-form" class="panel panel-body"><div class="form-grid"><label class="field"><span class="field-label">Material category</span><select class="input" name="category">${options(CATEGORIES.map((c) => [c, c]))}</select></label><label class="field"><span class="field-label">Verified subtype / published profile</span><select class="input" name="profileId"></select></label>
 <label class="field"><span class="field-label">Documented condition</span><select class="input" name="condition">${options(
   [
     ["unknown", "Unknown"],
     ["clean", "Confirmed clean / within profile scope"],
     ["contaminated", "Contaminated"],
     ["hazardous", "Hazardous"],
   ],
 )}</select></label>
 <label class="field"><span class="field-label">Baseline disposal</span><select class="input" name="baseline">${options(
   [
     ["landfill", "Landfill"],
     ["combustion", "Controlled combustion / energy recovery"],
     ["open-burning", "Open burning (no configured factor)"],
   ],
 )}</select></label>
 <label class="field"><span class="field-label">Alternative treatment</span><select class="input" name="alternative"><option value="recycling">Closed-loop recycling within profile scope</option></select></label>
 <label class="field"><span class="field-label">Assessment boundary</span><select class="input" name="mode">${options(
   [
     ["lifecycle", "Net lifecycle CO₂e comparison"],
     ["direct-burning", "Direct burning-point CO₂ benchmark"],
   ],
 )}</select></label>
 ${input("massTonnes", "Baseline waste (metric tonnes)", "", 'min="0.000001" max="1000000" required')}${input("adoptionPercent", "Share routed via platform (%)", "", 'min="0" max="100" required')}${input("recoveryPercent", "Successfully recovered share of routed waste (%)", "", 'min="0" max="100" required')}</div><p class="help-text">Remaining waste stays on the baseline pathway. Adoption and recovery are explicit assumptions, unrelated to classifier accuracy. Factor overrides are not accepted.</p><div class="evidence-toolbar"><button class="btn btn-primary" type="submit">Calculate projection</button><button class="btn btn-secondary" type="button" id="load-benchmark">Load illustrative 100 t PP example</button></div></form><div id="emissions-result" aria-live="polite"><p>Enter assumptions to calculate. No emission test has been performed.</p></div>
 <div class="panel panel-body"><h3>Carbon is only one part of pollution.</h3><p>PM2.5, NOx, SO₂, dioxins and heavy-metal releases: insufficient published evidence for the selected waste and process. A CO₂ factor cannot quantify their reduction. Rubber, mixed e-waste, contaminated materials and hazardous mixtures have no configured assessment profiles.</p><details><summary>Published factors, units & boundaries</summary><p>EPA WARM v16, December 2023. US average scenarios, not local Indian measurements. Recycling values include negative avoided-production credits. Glass profiles cover bottles and jars, not flat or electronic glass. Can profiles are not generic industrial metal scrap.</p><div class="table-scroll"><table><thead><tr><th>Profile</th><th>Landfill</th><th>Controlled combustion</th><th>Recycling</th><th>Direct CO₂</th><th>Source</th></tr></thead><tbody>${PROFILES.map((p) => `<tr><th>${esc(p.label)}</th><td>${p.landfill}</td><td>${p.combustion}</td><td>${p.recycling}</td><td>${p.directBurn ?? "Not applicable"}</td><td>${link(p.source, p.exhibit)}</td></tr>`).join("")}</tbody></table></div><p>All factors: metric tonnes CO₂(e) per US short ton; 1 US short ton = 907.18474 kg. Direct burning figures represent CO₂ only. Negative values represent net credits, not negative stack emissions.</p></details></div></section>
 <section class="evidence-section"><div class="eyebrow">04 / BUSINESS PROJECTION</div><h2>Make the unit economics visible.</h2><p>Material subtotal below ₹1 lakh: 5%; ₹1–10 lakh inclusive: 4%; above ₹10 lakh: 3%. Commission is split 70% buyer / 30% seller, and excludes transport. Applied per order.</p><form id="business-form" class="panel panel-body"><div class="form-grid">${input("orders", "Hypothetical monthly orders", "", 'min="0" max="1000000" required')}${input("materialValue", "Material value per hypothetical order (₹)", "", 'min="0.01" max="10000000000" required')}${input("fixedCosts", "Monthly fixed operating costs (₹, optional)", "", 'min="0" max="10000000000"')}${input("variableCosts", "Variable operating cost per order (₹, optional)", "", 'min="0" max="10000000000"')}</div><button class="btn btn-primary" type="submit">Calculate business scenario</button></form><div id="business-result" aria-live="polite"><p>No revenue projection until you enter assumptions. Taxes, refunds and unentered costs are not included.</p></div></section>
 <section class="panel panel-body evidence-section"><h2>Saved requests: a cost waterfall.</h2><p>These are pending proposals, not paid orders or realised savings.</p><label class="field"><span class="field-label">Saved booking request</span><select class="input" id="evidence-booking"><option value="">Choose a saved request</option>${context
   .getData()
   .bookingRequests.filter(
     (r) => r.status === "pending_agreement" && r.plan?.transportComplete,
   )
   .map(
     (r) =>
       `<option value="${esc(r.id)}">${esc(r.id)} · ${esc(r.requirements.material)}</option>`,
   )
   .join(
     "",
   )}</select></label><div id="booking-waterfall"><p>No request selected.</p></div></section>
 <section class="panel panel-body evidence-section"><div class="eyebrow">05 / PROOF FOR A PILOT</div><h2>Turn projections into evidence.</h2><div class="table-scroll"><table><thead><tr><th>Who needs the number?</th><th>What to show</th><th>What proves it</th></tr></thead><tbody><tr><th>Buyer / procurement</th><td>Delivered cost, accepted grade, repeat purchase</td><td>Virgin-material quote, purchase invoice, quality acceptance, freight bill</td></tr><tr><th>Seller / factory</th><td>Net proceeds and disposal cost avoided</td><td>Original disposal quote, weighbridge record, paid invoice</td></tr><tr><th>Platform / investor</th><td>GMV, commission, repeat rate, contribution</td><td>Completed-order ledger, collected fees, acquisition and operating costs</td></tr><tr><th>Environment team</th><td>Mass diverted and comparable emissions</td><td>Baseline disposal records, accepted deliveries, recovery yields, route data and applicable published factors</td></tr></tbody></table></div><p>Show the material-flow diagram, cost waterfall, before/after emissions bars and adoption sensitivity alongside assumptions. Measure completed deliveries before claiming savings. Repeat customers and collected fees demonstrate business demand.</p><p>Setup instructions remain in the project README. Public-record imports and individual source links remain in the Facility directory.</p><a href="#directory" class="text-link">Open facility directory ↗</a></section>`;
  const form = root.querySelector("#emissions-form"),
    bf = root.querySelector("#business-form");
  const values = (f) => Object.fromEntries(new FormData(f));
  function syncProfiles() {
    form.elements.profileId.innerHTML =
      '<option value="">Choose a verified subtype</option>' +
      options(
        PROFILES.filter((p) => p.category === form.elements.category.value).map(
          (p) => [p.id, p.label],
        ),
      );
  }
  syncProfiles();
  form.addEventListener("input", () => {
    requestVersion++;
    assessment = null;
    root.querySelector("#emissions-result").innerHTML =
      "<p>Assumptions changed. Calculate to update the projection.</p>";
  });
  form.elements.category.addEventListener("change", syncProfiles);
  root.querySelector("#load-benchmark").onclick = () => {
    form.elements.category.value = "plastic";
    syncProfiles();
    Object.entries({
      profileId: "pp",
      condition: "clean",
      baseline: "combustion",
      alternative: "recycling",
      mode: "direct-burning",
      massTonnes: 100,
      adoptionPercent: 30,
      recoveryPercent: 90,
    }).forEach(([k, v]) => (form.elements[k].value = v));
    form.requestSubmit();
  };
  function renderAssessment(r) {
    const out = root.querySelector("#emissions-result");
    if (r.status !== "estimated") {
      out.innerHTML = `<div class="panel panel-body"><h3>Insufficient published evidence</h3><p>${esc(r.reason)}</p><p>No carbon or toxic-pollutant saving is asserted.</p></div>`;
      return;
    }
    const max = Math.max(Math.abs(r.beforeTonnes), Math.abs(r.afterTonnes), 1);
    out.innerHTML = `<section class="panel panel-body"><div class="eyebrow">ILLUSTRATIVE PROJECTION · NOT A SCRAPLOOP OUTCOME</div><div class="metric-strip"><div class="metric"><strong>${n(r.divertedTonnes)} t</strong><span>Successfully diverted</span></div><div class="metric"><strong>${n(r.avoidedTonnes)} t</strong><span>${esc(r.units)} avoided</span></div><div class="metric"><strong>${r.reductionPercent == null ? "Withheld" : n(r.reductionPercent) + "%"}</strong><span>${r.inputs.mode === "direct-burning" ? "Burning-point CO₂ reduction" : "Comparable reduction"}</span></div></div><p>${esc(r.boundary)}</p>${r.percentageNote ? `<p>${esc(r.percentageNote)}</p>` : ""}<div class="emissions-bars">${[
      ["Baseline", r.beforeTonnes],
      ["With assumed adoption", r.afterTonnes],
    ]
      .map(
        ([label, v]) =>
          `<div><span>${label}: ${n(v)} ${esc(r.units)}</span><meter min="0" max="${max}" value="${Math.abs(v)}" aria-label="${label}, ${n(v)} ${esc(r.units)}; bar shows magnitude"></meter>${v < 0 ? "<small>Negative net lifecycle credit</small>" : ""}</div>`,
      )
      .join(
        "",
      )}</div><p>Mass ${n(r.inputs.massTonnes)} t × adoption ${r.inputs.adoptionPercent}% × recovery ${r.inputs.recoveryPercent}% = ${n(r.divertedTonnes)} t diverted.</p><p>${link(r.profile.source, `${r.profile.version} · ${r.profile.exhibit}`)}</p><h3>Adoption sensitivity</h3><p>Recovery held at ${r.inputs.recoveryPercent}%. Successful diversion varies with adoption.</p><div class="table-scroll"><table><thead><tr><th>Adoption</th><th>Diverted mass (t)</th><th>Avoided ${r.inputs.mode === "direct-burning" ? "direct CO₂" : "net CO₂e"} (t)</th></tr></thead><tbody>${[
      10, 30, 50, 100,
    ]
      .map((a) => {
        const diverted =
          (((r.inputs.massTonnes * a) / 100) * r.inputs.recoveryPercent) / 100;
        const f =
          r.inputs.mode === "direct-burning"
            ? r.profile.directBurn
            : r.profile[r.inputs.baseline] - r.profile.recycling;
        return `<tr><th>${a}%</th><td>${n(diverted)}</td><td>${n(((diverted * 1000) / 907.18474) * f)}</td></tr>`;
      })
      .join("")}</tbody></table></div></section>`;
  }
  form.onsubmit = async (e) => {
    e.preventDefault();
    const version = ++requestVersion;
    assessment = null;
    const v = values(form);
    for (const k of ["massTonnes", "adoptionPercent", "recoveryPercent"])
      v[k] = Number(v[k]);
    const out = root.querySelector("#emissions-result");
    out.innerHTML =
      '<p role="status">Calculating published-factor scenario…</p>';
    try {
      const r = await context.api("/api/emissions-assessment", {
        method: "POST",
        body: JSON.stringify(v),
      });
      if (!alive || version !== requestVersion) return;
      assessment = r;
      renderAssessment(r);
    } catch (err) {
      if (alive && version === requestVersion)
        out.innerHTML = `<p role="alert">${esc(err.message)}</p>`;
    }
  };
  bf.oninput = () => {
    business = null;
    root.querySelector("#business-result").innerHTML =
      "<p>Assumptions changed. Calculate to update the projection.</p>";
  };
  bf.onsubmit = (e) => {
    e.preventDefault();
    const v = values(bf);
    for (const k in v) v[k] = v[k] === "" ? null : Number(v[k]);
    try {
      business = businessProjection(v);
      const b = business;
      root.querySelector("#business-result").innerHTML =
        `<section class="panel panel-body"><div class="eyebrow">HYPOTHETICAL MONTH · NOT COLLECTED REVENUE</div><div class="metric-strip"><div class="metric"><strong>${money(b.gmv)}</strong><span>Projected GMV</span></div><div class="metric"><strong>${money(b.revenue)}</strong><span>Projected commission</span></div><div class="metric"><strong>${b.feePercent}%</strong><span>Per-order rate</span></div></div><p>${n(b.orders)} orders × ${money(b.materialValue)} material subtotal; commission ${money(b.fee)} per order (${money(b.buyerFee)} buyer / ${money(b.sellerFee)} seller).</p><p>Contribution per order: ${b.contributionPerOrder == null ? "Unknown — enter variable costs" : money(b.contributionPerOrder)}. Monthly operating result: ${b.operatingResult == null ? "Unknown — enter fixed and variable costs" : money(b.operatingResult)}. Break-even: ${b.breakEvenOrders == null ? "Not established" : n(b.breakEvenOrders) + " orders / month"}.</p><p>No assumed market price, customer count or guaranteed margin. Taxes, refunds and omitted costs excluded.</p></section>`;
    } catch (err) {
      business = null;
      root.querySelector("#business-result").innerHTML =
        `<p role="alert">${esc(err.message)}</p>`;
    }
  };
  let selectedBooking = null;
  root.querySelector("#evidence-booking").onchange = (e) => {
    selectedBooking =
      context.getData().bookingRequests.find((r) => r.id === e.target.value) ||
      null;
    const r = selectedBooking,
      p = r?.plan;
    root.querySelector("#booking-waterfall").innerHTML = p
      ? `<h3>${esc(r.id)}</h3><dl class="evidence-waterfall">${[
          ["Material subtotal", p.materialCost],
          ["Buyer commission", p.buyerFee],
          ["Buyer transport", p.buyerTransport],
          ["Buyer total", p.totalCost],
          ["Seller commission", p.sellerFee],
          ["Seller transport", p.sellerTransport],
          ["Seller net proceeds", p.sellerNet],
          ["Estimated buyer savings", p.savings],
          ["Platform commission", p.fee],
        ]
          .map(
            ([k, v]) =>
              `<div><dt>${k}</dt><dd>${v == null ? "Unknown" : money(v)}</dd></div>`,
          )
          .join(
            "",
          )}</dl><p>Immutable saved financial snapshot. Pending agreement; no payment or delivery confirmed.</p>`
      : "<p>No request selected.</p>";
  };
  const printDetails = () => {
    root.querySelectorAll("details").forEach((d) => {
      d.dataset.printWasOpen = String(d.open);
      d.open = true;
    });
  };
  const restoreDetails = () => {
    root.querySelectorAll("details[data-print-was-open]").forEach((d) => {
      d.open = d.dataset.printWasOpen === "true";
      delete d.dataset.printWasOpen;
    });
  };
  window.addEventListener("beforeprint", printDetails);
  window.addEventListener("afterprint", restoreDetails);
  root.querySelector("#evidence-print").onclick = () => window.print();
  root.querySelector("#evidence-export").onclick = () => {
    const rows = [
      [
        "Evidence type",
        "Metric",
        "Value",
        "Unit / boundary",
        "Source",
        "Reviewed / exported",
      ],
      [
        "Metadata",
        "Exported at",
        new Date().toISOString(),
        "UTC",
        "",
        registry.reviewedAt,
      ],
    ];
    for (const c of registry.cases) {
      for (const f of c.figures)
        rows.push([
          "Published precedent",
          c.title,
          f,
          c.period,
          c.source,
          registry.reviewedAt,
        ]);
      rows.push([
        "Published precedent limits",
        c.title,
        c.limit,
        "Not a ScrapLoop result",
        c.source,
        registry.reviewedAt,
      ]);
    }
    if (report) {
      rows.push(
        [
          "Measured classifier",
          "Accuracy",
          report.trained.test.accuracy * 100,
          "% held-out TrashNet",
          "/api/model-report",
          report.createdAt,
        ],
        [
          "Measured classifier",
          "Macro-F1",
          report.trained.test.macroF1 * 100,
          "% held-out TrashNet",
          "/api/model-report",
          report.createdAt,
        ],
        [
          "Measured classifier",
          "Test images",
          report.counts.test,
          "Dataset labels; industrial generalisation unvalidated",
          "/api/model-report",
          report.createdAt,
        ],
      );
    }
    if (assessment) {
      for (const [k, v] of Object.entries(assessment.inputs))
        rows.push([
          "Projection assumption",
          k,
          v,
          "User-entered scenario",
          "",
          registry.reviewedAt,
        ]);
      if (assessment.status === "estimated") {
        for (const k of [
          "divertedTonnes",
          "beforeTonnes",
          "afterTonnes",
          "avoidedTonnes",
          "reductionPercent",
        ])
          rows.push([
            "Emissions projection",
            k,
            assessment[k],
            k === "reductionPercent"
              ? "% (null = withheld)"
              : k === "divertedTonnes"
                ? "metric tonnes material"
                : assessment.units,
            assessment.profile.source,
            registry.reviewedAt,
          ]);
        rows.push([
          "Projection boundary",
          "Scope",
          assessment.boundary,
          assessment.percentageNote ?? "",
          assessment.profile.source,
          registry.reviewedAt,
        ]);
        for (const k of ["landfill", "combustion", "recycling", "directBurn"])
          rows.push([
            "Published factor",
            k,
            assessment.profile[k],
            k === "directBurn"
              ? "MT CO₂ / US short ton (direct)"
              : assessment.profile.units,
            assessment.profile.source,
            assessment.profile.exhibit,
          ]);
      } else
        rows.push([
          "Insufficient evidence",
          "Reason",
          assessment.reason,
          "No savings asserted",
          "",
          registry.reviewedAt,
        ]);
    }
    if (business)
      for (const [k, v] of Object.entries(business))
        rows.push([
          "Hypothetical business",
          k,
          v,
          (k === "feePercent"
            ? "% per order"
            : k === "orders"
              ? "orders / month"
              : k === "breakEvenOrders"
                ? "orders / month"
                : k === "policyVersion"
                  ? "policy version"
                  : [
                        "materialValue",
                        "fee",
                        "buyerFee",
                        "sellerFee",
                        "variableCosts",
                        "contributionPerOrder",
                      ].includes(k)
                    ? "INR / order"
                    : "INR / month") + "; hypothetical, not paid revenue",
          "/trade-policy.js",
          registry.reviewedAt,
        ]);
    if (selectedBooking)
      for (const k of [
        "materialCost",
        "buyerFee",
        "buyerTransport",
        "totalCost",
        "sellerFee",
        "sellerTransport",
        "sellerNet",
        "savings",
        "fee",
      ])
        rows.push([
          "Pending booking snapshot",
          k,
          selectedBooking.plan[k],
          "INR; not paid or delivered",
          selectedBooking.id,
          registry.reviewedAt,
        ]);
    const url = URL.createObjectURL(
      new Blob([evidenceCSV(rows)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "scraploop-pitch-evidence.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return () => {
    alive = false;
    requestVersion++;
    window.removeEventListener("beforeprint", printDetails);
    window.removeEventListener("afterprint", restoreDetails);
  };
}
