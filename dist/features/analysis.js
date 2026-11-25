import { renderFieldConfidence } from "./confidence.js";
import { esc, field, num, money } from "./shared.js";
const names = [
  "title",
  "company",
  "material",
  "grade",
  "condition",
  "quantityKg",
  "pricePerKg",
  "location",
  "latitude",
  "longitude",
  "notes",
];
const labels = {
  title: "Record title",
  company: "Company",
  material: "Material / family",
  grade: "Confirmed grade",
  condition: "Visible condition (manual review)",
  quantityKg: "Quantity (kg)",
  pricePerKg: "Price (₹ / kg)",
  location: "Location",
  latitude: "Latitude",
  longitude: "Longitude",
  notes: "Evidence and review notes",
};
const numeric = ["quantityKg", "pricePerKg", "latitude", "longitude"];
export async function mountFeature(root, ctx) {
  let alive = true,
    file = null,
    preview = null,
    analysis = null,
    editing = null,
    busy = false,
    saving = false,
    search = ctx.initialSearch || "",
    reviewQueue = false,
    generation = 0,
    deleteId = null;
  let draft = Object.fromEntries(names.map((n) => [n, ""])),
    review = {},
    confirmed = false,
    error = "",
    replaceExisting = true,
    sampleLoaded = false;
  let fieldVersions = Object.fromEntries(names.map((n) => [n, 0]));
  const w = root.ownerDocument.defaultView;
  const clear = () => {
    generation++;
    if (preview) w.URL.revokeObjectURL(preview);
    preview = null;
    file = null;
    analysis = null;
    editing = null;
    draft = Object.fromEntries(names.map((n) => [n, ""]));
    review = {};
    confirmed = false;
    error = "";
    deleteId = null;
    replaceExisting = true;
    sampleLoaded = false;
    fieldVersions = Object.fromEntries(names.map((n) => [n, 0]));
  };
  function render() {
    if (!alive) return;
    root.dataset.feature = "analysis";
    const state = ctx.getData(),
      ready = state.status.vision?.available,
      pdf = file?.type === "application/pdf",
      apiReady = Boolean(state.status.aiConfigured),
      canAnalyse = Boolean(file && (pdf ? apiReady : ready));
    const records = state.records.filter(
      (r) =>
        (!reviewQueue || r.analysisId) &&
        `${r.title} ${r.company || ""} ${r.material || ""}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    );
    root.innerHTML = `<header class="feature-intro"><div><div class="eyebrow">03 / MATERIAL ANALYSIS</div><h1>Meet your material.</h1><p>Upload a photo or PDF, autofill the supported details, then review and save.</p></div><span class="desk-tag">${pdf ? (apiReady ? "DOCUMENT AI READY" : "PDF AI NOT CONFIGURED") : ready ? "LOCAL MODEL READY" : "MANUAL REVIEW AVAILABLE"}</span></header><ol class="process-strip"><li><b>01</b> Capture evidence</li><li><b>02</b> Review the details</li><li><b>03</b> Save your record</li></ol><div class="review-layout"><section><div class="panel panel-body"><div class="card-kicker">CAPTURE / 01</div><h2>Material evidence</h2><p class="analysis-engine" id="analysis-engine">${pdf ? (apiReady ? "PDF → AI document extraction ready" : "PDF → document AI is not configured") : file ? (ready ? "Photo → local ML classification ready" : "Photo → local classifier not installed") : "Photos → local ML · PDFs → AI document extraction"}</p><label class="upload-zone" id="upload-zone"><input id="analysis-file" class="upload-input" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" aria-label="Choose material photo or PDF"><span class="upload-symbol" aria-hidden="true">↥</span><strong>${esc(file?.name || "Drop a photo or PDF here")}</strong><span class="upload-instruction">or click to browse your files</span><span>JPG, PNG, WebP, PDF · up to 10 MB</span></label>${preview ? `<img class="evidence-photo" src="${preview}" alt="Selected material evidence">` : ""}<div class="analysis-actions"><button class="btn btn-primary" type="button" data-feature-action="analyse" ${busy || saving || !canAnalyse ? "disabled" : ""}>${busy ? "Analysing…" : "Analyse"}</button><button class="btn btn-secondary" type="button" data-feature-action="new">New record</button></div>${pdf ? `<p class="help-text" id="provider-disclosure">${apiReady ? "Click Analyse to send this PDF to your configured AI provider and autofill supported fields. API usage may incur charges. Your key stays on the server." : "PDF autofill requires the server’s API key. Configure the private .env file and restart npm run dev, then reload. Manual entry and sample fill are available."}</p>` : file && apiReady ? '<button class="text-link" data-feature-action="document" ' + (busy ? "disabled" : "") + '>Read photo text with AI</button><p class="help-text">Optional photo-text extraction uses your configured AI provider and may incur charges. Analyse uses the local model for broad material identification.</p>' : '<p class="help-text">The local photo model suggests a broad material category. It does not read invoice quantities, grades or prices.</p>'}</div><section class="panel panel-body evidence-panel"><div class="card-kicker">THE EVIDENCE TRAIL</div><h2>What supports the fields?</h2>${analysis ? `<p>${analysis.classification ? "Source: local ML image classifier (MobileNetV3 Small)" : "Source: AI document extraction using your configured provider"}</p><p class="analysis-status">${esc(analysis.filename)} · ${esc(analysis.model)}</p>${analysis.classification ? `<p>${analysis.classification.needsReview ? "Needs review" : "Category suggestion"}: <strong>${esc(analysis.classification.category)}</strong> · ${(analysis.classification.confidence * 100).toFixed(1)}% model score ${analysis.classification.experimental ? "· Experimental model" : ""}</p><meter class="confidence-meter" min="0" max="1" value="${analysis.classification.confidence}" aria-label="Model score for the suggested category">${(analysis.classification.confidence * 100).toFixed(1)}%</meter><p>All predictions require review. This score is not a quality guarantee.</p>` : ""}${(analysis.suggestions?.evidence || []).map((e) => `<div class="evidence-item"><strong>${esc(e.field)}</strong><blockquote>${esc(e.quote)}</blockquote>${e.page ? `<small>Page ${esc(e.page)}</small>` : ""}</div>`).join("")}<div class="warning-list">${(analysis.suggestions?.warnings || []).map((v) => `<p>${esc(v)}</p>`).join("")}</div>` : "<p>Model suggestions and original evidence will appear here. Manual records should reference your own supporting evidence.</p>"}<p class="help-text">Exact grades, purity, contamination levels, quantity, and price cannot be established by this image classifier. Grade and purity require supporting specifications or appropriate lab evidence; a model score does not certify quality.</p></section></section><section class="panel panel-body"><div class="card-kicker">REVIEW / 02</div><h2>${editing ? "Edit reviewed record" : "Review material details"}</h2><p class="help-text">Autofill from your uploaded file, or use a fictional example to test the form.</p><div class="analysis-quick-fill"><button class="btn btn-secondary" type="button" data-feature-action="autofill" ${busy || saving || !canAnalyse ? "disabled" : ""}>Fill from uploaded file</button><button class="btn btn-secondary" type="button" data-feature-action="sample" ${saving ? "disabled" : ""}>Fill sample data</button></div><label class="confirmation-label"><input type="checkbox" id="replace-existing" ${replaceExisting ? "checked" : ""} ${busy ? "disabled" : ""}> Replace existing values with supported file suggestions</label><p class="help-text">Autofill runs the same analysis as Analyse. Fields you edit while analysis is running are preserved. You must review and confirm before saving.</p>${sampleLoaded ? '<p class="lab-evidence-note" role="status">Fictional sample data loaded for testing. Sample fill uses no ML model or API. These values are not real stock or a live price quote.</p>' : ""}<form id="record-form" novalidate><div class="form-grid">${[
      [
        "Material identity",
        ["title", "company", "material", "grade", "condition"],
      ],
      ["Quantity & value", ["quantityKg", "pricePerKg"]],
      [
        "Location & supporting notes",
        ["location", "latitude", "longitude", "notes"],
      ],
    ]
      .map(
        ([group, fields]) =>
          `<div class="form-section-title">${group}</div>${fields.map((n) => `<div>${n === "notes" ? `<label class="field"><span class="field-label">${labels[n]}</span><textarea class="input" name="notes" maxlength="10000">${esc(draft.notes)}</textarea></label>` : field(n, labels[n], draft[n], numeric.includes(n) ? "number" : "text")}<span class="field-state" data-review="${n}">${status(n)}</span>${renderFieldConfidence(n, labels[n], analysis?.classification ? { confidence: { material: analysis.classification.confidence }, needsReview: analysis.classification.needsReview } : analysis?.suggestions)}</div>`).join("")}`,
      )
      .join(
        "",
      )}</div><label class="confirmation-label"><input name="confirmed" type="checkbox" ${confirmed ? "checked" : ""}> I have reviewed every populated field and confirm these details. Unknown values remain blank.</label><p class="error-message" id="record-error" role="alert">${esc(error)}</p><button class="btn btn-primary" type="submit" ${saving || busy ? "disabled" : ""}>${saving ? "Saving…" : editing ? "Save changes" : "Save reviewed record"}</button></form></section></div><section class="saved-ledger"><div class="feature-toolbar"><div><div class="eyebrow">YOUR MATERIAL LEDGER</div><h2>Saved material records</h2></div><label class="field"><span class="field-label">Search records</span><input id="record-search" class="input" type="search" value="${esc(search)}"></label><label><input id="review-queue" type="checkbox" ${reviewQueue ? "checked" : ""}> Photo/document records awaiting expert review</label></div><p class="help-text">User confirmation is not expert certification. Expert validation remains pending for these records.</p><div class="record-list">${records.map((r) => `<article class="record-card"><div><strong>${esc(r.title)}</strong><span>${esc(r.company || "Company unknown")} · ${esc(r.material || "Material unknown")}</span><small>${r.quantityKg == null ? "Quantity unknown" : `${num(r.quantityKg)} kg`} · ${r.pricePerKg == null ? "Price unknown" : `${money(r.pricePerKg)}/kg`}</small></div><div class="record-actions"><button class="text-link" data-feature-action="edit" data-id="${esc(r.id)}">Review / edit</button><button class="text-link" data-feature-action="delete" data-id="${esc(r.id)}">Delete</button></div>${deleteId === r.id ? `<div role="group" aria-label="Confirm deletion"><p>Delete this saved record?</p><button class="btn btn-primary" data-feature-action="confirm-delete" data-id="${esc(r.id)}">Delete record</button><button class="btn btn-secondary" data-feature-action="cancel-delete">Keep record</button></div>` : ""}</article>`).join("") || "<p>No matching records. Add a reviewed material above.</p>"}</div></section>`;
  }
  function status(n) {
    return draft[n] === "" || draft[n] == null
      ? "Unknown"
      : review[n] === "sample_value"
        ? "Sample value — needs review"
        : review[n] === "ai_suggestion"
          ? "AI suggestion"
          : review[n] === "user_confirmed"
            ? "User confirmed"
            : "Awaiting confirmation";
  }
  function updateStatus() {
    for (const n of names) {
      const el = root.querySelector(`[data-review="${n}"]`);
      if (el) el.textContent = status(n);
    }
  }
  function accept(f) {
    if (!f) return;
    if (
      !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
        f.type,
      ) ||
      !f.size ||
      f.size > 10 * 1024 * 1024
    ) {
      ctx.toast("Choose a non-empty JPG, PNG, WebP, or PDF up to 10 MB.", true);
      return;
    }
    if (sampleLoaded) {
      draft = Object.fromEntries(names.map((n) => [n, ""]));
      review = {};
      fieldVersions = Object.fromEntries(names.map((n) => [n, 0]));
      sampleLoaded = false;
    }
    generation++;
    busy = false;
    if (preview) w.URL.revokeObjectURL(preview);
    file = f;
    preview = f.type.startsWith("image/") ? w.URL.createObjectURL(f) : null;
    analysis = null;
    editing = null;
    confirmed = false;
    error = "";
    for (const n of names)
      if (review[n] === "ai_suggestion") {
        draft[n] = "";
        review[n] = "unknown";
      }
    render();
  }
  function fillSample() {
    if (saving) return;
    clear();
    busy = false;
    sampleLoaded = true;
    Object.assign(draft, {
      title: "SAMPLE — PP manufacturing trimmings",
      company: "ScrapLoop Test Factory (fictional)",
      material: "PP",
      grade: "PP-H",
      condition: "Clean",
      quantityKg: "1200",
      pricePerKg: "42",
      location: "Pune, Maharashtra, India (example location)",
      notes:
        "FICTIONAL SAMPLE FOR TESTING ONLY. 12 bags of 100 kg. Supplier-declared grade and condition; no laboratory certification. Not real stock or a live price quote.",
    });
    review = Object.fromEntries(
      names.map((n) => [n, draft[n] === "" ? "unknown" : "sample_value"]),
    );
    render();
    ctx.toast(
      "Sample fields filled. No model or API call was made; nothing has been saved.",
    );
  }
  async function analyse(document = file?.type === "application/pdf") {
    if (!file || busy || saving) return;
    const engineReady = document
      ? ctx.getData().status.aiConfigured
      : ctx.getData().status.vision?.available;
    if (!engineReady) {
      error = document
        ? "Configure the server API key and restart the server to analyse PDFs."
        : "The local image classifier is not installed.";
      render();
      return;
    }
    const token = ++generation,
      selected = file,
      versions = { ...fieldVersions },
      overwrite = replaceExisting;
    busy = true;
    error = "";
    render();
    try {
      const dataBase64 = await new Promise((resolve, reject) => {
        const reader = new w.FileReader();
        reader.onerror = () =>
          reject(new Error("Could not read the selected file."));
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.readAsDataURL(selected);
      });
      const result = await ctx.api(
        document ? "/api/analyze" : "/api/classify",
        {
          method: "POST",
          body: JSON.stringify({
            name: selected.name,
            mimeType: selected.type,
            dataBase64,
          }),
        },
      );
      if (!alive || token !== generation) return;
      analysis = result;
      for (const n of names) {
        const v = result.suggestions?.[n];
        if (
          v != null &&
          fieldVersions[n] === versions[n] &&
          (overwrite || draft[n] === "" || review[n] === "ai_suggestion")
        ) {
          draft[n] = v;
          review[n] = "ai_suggestion";
        }
      }
      if (!draft.title)
        draft.title = `${result.suggestions?.material || "Material"} review`;
      confirmed = false;
      ctx.toast("Analysis complete. Review every suggestion before saving.");
    } catch (e) {
      if (alive && token === generation) {
        error = e.message;
        ctx.toast(e.message, true);
      }
    } finally {
      if (alive && token === generation) {
        busy = false;
        render();
      }
    }
  }
  async function save() {
    if (saving || busy) return;
    error = "";
    if (!draft.title.trim()) error = "Enter a title for this research record.";
    else if (!confirmed)
      error = "Review and confirm the details before saving.";
    if (error) {
      root.querySelector("#record-error").textContent = error;
      return;
    }
    const payload = {
      ...draft,
      confirmed: true,
      fieldReview: Object.fromEntries(
        names.map((n) => [
          n,
          draft[n] === "" || draft[n] == null ? "unknown" : "user_confirmed",
        ]),
      ),
    };
    for (const n of numeric)
      payload[n] = draft[n] === "" ? null : Number(draft[n]);
    if (!editing) payload.analysisId = analysis?.id || null;
    const target = editing,
      token = generation;
    saving = true;
    render();
    try {
      const { record } = await ctx.api(
        target ? `/api/records/${encodeURIComponent(target)}` : "/api/records",
        { method: target ? "PATCH" : "POST", body: JSON.stringify(payload) },
      );
      // The record is committed even if refreshing shared data fails.
      // Retrying must PATCH that ID rather than create a duplicate.
      if (alive && token === generation) editing = record.id;
      await ctx.refreshData();
      if (!alive || token !== generation) return;
      editing = record.id;
      review = record.fieldReview || {};
      ctx.toast("Reviewed material record saved.");
    } catch (e) {
      if (alive && token === generation) {
        error = e.message;
        ctx.toast(e.message, true);
      }
    } finally {
      saving = false;
      if (alive && token === generation) render();
    }
  }
  async function edit(id) {
    const r = ctx.getData().records.find((r) => r.id === id);
    if (!r) return;
    clear();
    editing = id;
    draft = Object.fromEntries(names.map((n) => [n, r[n] ?? ""]));
    review = { ...r.fieldReview };
    confirmed = false;
    const token = generation;
    render();
    root.querySelector('[name="title"]').focus();
    if (r.analysisId) {
      try {
        const a = await ctx.api(
          `/api/analyses/${encodeURIComponent(r.analysisId)}`,
        );
        if (alive && token === generation) {
          analysis = a;
          render();
        }
      } catch (e) {
        if (alive && token === generation) ctx.toast(e.message, true);
      }
    }
  }
  const controller = new w.AbortController(),
    opts = { signal: controller.signal };
  root.addEventListener(
    "input",
    (e) => {
      const el = e.target;
      if (el.closest("#record-form")) {
        if (el.name === "confirmed") confirmed = el.checked;
        else if (names.includes(el.name)) {
          draft[el.name] = el.value;
          fieldVersions[el.name]++;
          review[el.name] = el.value === "" ? "unknown" : "user_confirmed";
          confirmed = false;
          root.querySelector('[name="confirmed"]').checked = false;
          updateStatus();
        }
      }
      if (el.id === "record-search") {
        const pos = el.selectionStart;
        search = el.value;
        render();
        const input = root.querySelector("#record-search");
        input.focus();
        input.setSelectionRange(pos, pos);
      }
    },
    opts,
  );
  root.addEventListener(
    "change",
    (e) => {
      if (e.target.id === "analysis-file") accept(e.target.files[0]);
      if (e.target.id === "replace-existing")
        replaceExisting = e.target.checked;
      if (e.target.name === "confirmed") confirmed = e.target.checked;
      if (e.target.id === "review-queue") {
        reviewQueue = e.target.checked;
        render();
      }
    },
    opts,
  );
  root.addEventListener(
    "dragover",
    (e) => {
      if (e.target.closest("#upload-zone")) e.preventDefault();
    },
    opts,
  );
  root.addEventListener(
    "drop",
    (e) => {
      if (e.target.closest("#upload-zone")) {
        e.preventDefault();
        accept(e.dataTransfer.files[0]);
      }
    },
    opts,
  );
  root.addEventListener(
    "submit",
    (e) => {
      if (e.target.id === "record-form") {
        e.preventDefault();
        save();
      }
    },
    opts,
  );
  root.addEventListener(
    "click",
    async (e) => {
      const button = e.target.closest("[data-feature-action]");
      if (!button) return;
      const action = button.dataset.featureAction;
      if (action === "new") {
        clear();
        busy = false;
        render();
      }
      if (action === "analyse" || action === "autofill") analyse();
      if (action === "document") analyse(true);
      if (action === "sample") fillSample();
      if (action === "edit") edit(button.dataset.id);
      if (action === "delete") {
        deleteId = button.dataset.id;
        render();
      }
      if (action === "cancel-delete") {
        deleteId = null;
        render();
      }
      if (action === "confirm-delete") {
        button.disabled = true;
        try {
          await ctx.api(
            `/api/records/${encodeURIComponent(button.dataset.id)}`,
            { method: "DELETE", body: "{}" },
          );
          await ctx.refreshData();
          if (alive) {
            if (editing === button.dataset.id) clear();
            deleteId = null;
            render();
          }
        } catch (e) {
          if (alive) {
            button.disabled = false;
            ctx.toast(e.message, true);
          }
        }
      }
    },
    opts,
  );
  render();
  return () => {
    alive = false;
    generation++;
    controller.abort();
    if (preview) w.URL.revokeObjectURL(preview);
  };
}
