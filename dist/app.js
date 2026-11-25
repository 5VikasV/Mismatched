import { icon } from "./icons.js";
import { mountMaterialLoop } from "./material-loop.js";

const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const number = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 }).format(
    Number(value) || 0,
  );
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Not published";
const safeURL = (value) => {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url.href
      : "";
  } catch {
    return "";
  }
};
const nav = [
  ["overview", "grid", "Overview"],
  ["directory", "building", "Facility directory"],
  ["analysis", "spark", "Material analysis"],
  ["planner", "box", "Pool planner"],
  ["results", "shield", "Model results"],
  ["sources", "list", "Sources & setup"],
];
const loaders = {
  directory: () => import("./features/directory.js"),
  analysis: () => import("./features/analysis.js"),
  planner: () => import("./features/planner.js"),
  results: () => import("./features/results.js"),
};
const state = {
  status: { aiConfigured: false, vision: { available: false } },
  facilities: [],
  sources: [],
  records: [],
  loaded: false,
  error: "",
};
let cleanup = null,
  generation = 0,
  refreshGeneration = 0,
  toastTimer,
  importing = false;
const main = () => document.getElementById("main");

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The workspace server returned an unreadable response. Restart npm run dev and retry.",
    );
  }
  if (!response.ok)
    throw new Error(data.message || "This request could not be completed.");
  return data;
}
async function refreshData(renderPage = true) {
  const request = ++refreshGeneration;
  try {
    const [status, facilities, sources, records] = await Promise.all([
      api("/api/status"),
      api("/api/facilities"),
      api("/api/sources"),
      api("/api/records"),
    ]);
    if (request !== refreshGeneration) return;
    Object.assign(state, {
      status,
      facilities: facilities.facilities || [],
      sources: sources.sources || [],
      records: records.records || [],
      loaded: true,
      error: "",
    });
  } catch (error) {
    if (request !== refreshGeneration) return;
    state.error = error.message;
    state.loaded = true;
  }
  document.body.dataset.ready = "true";
  updateShellStatus();
  if (renderPage) render();
  else if (state.error) throw new Error(state.error);
  return state;
}
function toast(message, isError = false) {
  clearTimeout(toastTimer);
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast ${isError ? "toast-error" : ""}`;
  el.hidden = false;
  toastTimer = setTimeout(() => (el.hidden = true), 6000);
}
function closeMenu(restore = false) {
  document.getElementById("sidebar").classList.remove("open");
  document.querySelector(".sidebar-overlay").classList.remove("visible");
  document
    .querySelector(".mobile-menu-btn")
    .setAttribute("aria-expanded", "false");
  if (restore) document.querySelector(".mobile-menu-btn").focus();
}
function navigate(route) {
  if (!nav.some((n) => n[0] === route)) return;
  if (location.hash === `#${route}`) render();
  else location.hash = route;
  closeMenu();
}
function updateShellStatus() {
  const el = document.getElementById("connection-status");
  if (el)
    el.textContent = state.error ? "Connection unavailable" : "Local workspace";
}
function heading(label, title, description, actions = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${label}</div><h1 class="page-title">${title}</h1><p class="page-subtitle">${description}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function badge(text, kind = "neutral") {
  return `<span class="badge ${kind}">${esc(text)}</span>`;
}
function importButton() {
  return `<button class="btn btn-primary" data-action="import" ${importing ? "disabled" : ""}>${importing ? "Importing…" : "Import public records"}</button>`;
}
function mountShell() {
  document.getElementById("app").innerHTML =
    `<div class="app-shell"><aside class="sidebar" id="sidebar" aria-label="Main navigation"><a class="brand" href="/" aria-label="ScrapLoop home"><svg viewBox="0 0 28 28" class="brand-mark" aria-hidden="true"><path d="M5 8h13l-3-3m8 15H10l3 3M18 8a8 8 0 0 1 4 12M10 20a8 8 0 0 1-4-12"/></svg><span>SCRAPLOOP</span></a><span class="nav-section">MATERIAL WORKSPACE</span><nav>${nav.map(([id, i, label]) => `<a class="nav-link" href="#${id}" data-nav="${id}">${icon(i)}<span>${label}</span></a>`).join("")}</nav><div class="sidebar-foot"><p><span class="status-dot"></span><span id="connection-status">Local workspace</span></p><p class="help-text">Records are saved on this computer.<br>No account needed.</p><a class="text-link" href="/">Back to material exchange ↗</a></div></aside><div class="sidebar-overlay" data-action="close-menu"></div><div class="workspace"><header class="topbar"><div class="breadcrumbs"><button type="button" class="icon-btn mobile-menu-btn" data-action="menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button><a href="/">ScrapLoop</a><span>/</span><strong id="breadcrumb">Overview</strong></div><span class="workspace-label">RESEARCH / PLAN / REUSE</span></header><main id="main" class="main-content" tabindex="-1"></main><footer class="workspace-footer"><span>SCRAPLOOP / TEAM MISMATCHED</span><span>Evidence before estimates.</span></footer></div></div>`;
}
function render() {
  const current = ++generation;
  cleanup?.();
  cleanup = null;
  main().replaceChildren();
  delete main().dataset.feature;
  let route = location.hash.slice(1) || "overview";
  if (!nav.some((n) => n[0] === route)) route = "overview";
  const label = nav.find((n) => n[0] === route)[2];
  document.body.dataset.page = route;
  document.title = `ScrapLoop — ${label}`;
  document.getElementById("breadcrumb").textContent = label;
  document.querySelectorAll("[data-nav]").forEach((el) => {
    const active = el.dataset.nav === route;
    el.classList.toggle("active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  if (!state.loaded) {
    main().innerHTML =
      '<div class="loading-state" role="status"><span class="loading-spinner"></span><p>Opening your workspace…</p></div>';
    return;
  }
  if (state.error) {
    main().innerHTML = `${heading("LOCAL CONNECTION", "Let’s reconnect.", "The workspace needs its local server to load your records.")}<div class="error-message" role="alert">${esc(state.error)}</div><button class="btn btn-primary" data-action="refresh">Try again</button>`;
    return;
  }
  if (loaders[route]) {
    const root = document.createElement("div");
    root.dataset.feature = route;
    root.innerHTML =
      '<div class="loading-state" role="status"><span class="loading-spinner"></span><p>Opening this page…</p></div>';
    main().append(root);
    const loader = window.__features?.[route] || loaders[route];
    Promise.resolve()
      .then(loader)
      .then((module) => {
        if (current !== generation) return;
        return module.mountFeature(root, {
          getData: () => state,
          api,
          refreshData: () => refreshData(false),
          navigate,
          toast,
        });
      })
      .then((dispose) => {
        if (current === generation) cleanup = dispose;
        else dispose?.();
      })
      .catch((error) => {
        if (current === generation)
          root.innerHTML = `<div class="error-message" role="alert">${esc(error.message)}</div><button class="btn btn-secondary" data-action="refresh" data-shell-action>Reload workspace</button>`;
      });
    return;
  }
  main().innerHTML = route === "sources" ? sourcesPage() : overview();
  if (route === "overview")
    cleanup = mountMaterialLoop(document.querySelector("[data-material-loop]"));
}
function overview() {
  const states = new Set(state.facilities.map((f) => f.state).filter(Boolean));
  const primary = !state.facilities.length
    ? importButton()
    : !state.records.length
      ? '<a class="btn btn-primary" href="#analysis">Analyse a material</a>'
      : '<a class="btn btn-primary" href="#planner">Open pool planner</a>';
  return `${heading("YOUR MATERIAL WORKSPACE", "A clearer next step for every material.", "Find sourced facility information, review material evidence, and plan compatible supply.", primary)}<div class="dashboard-grid"><div class="overview-main"><section class="panel overview-steps"><div class="panel-header"><h2>Build your local loop.</h2></div><ol class="setup-steps"><li class="${state.facilities.length ? "complete" : ""}"><span>01</span><div><a href="#directory">Explore facilities</a><p>Import attributed public records and inspect the sources.</p></div></li><li class="${state.records.length ? "complete" : ""}"><span>02</span><div><a href="#analysis">Review a material</a><p>Use local classification, then confirm supported details.</p></div></li><li><span>03</span><div><a href="#planner">Calculate a pool</a><p>Select compatible lots and compare delivered costs.</p></div></li></ol></section><section class="loop-exhibit" data-material-loop aria-label="Interactive 3D material reuse loop"><div class="loop-stage"><img class="loop-poster" src="/assets/3d/material-loop-poster.webp" alt="Miniature factory encircled by a conveyor carrying copper coils, polymer offcuts and cardboard"><model-viewer src="/assets/3d/material-loop.glb" alt="A 3D factory with material lots circulating on a conveyor. Drag to rotate." camera-controls touch-action="pan-y" disable-zoom disable-pan camera-orbit="35deg 57deg 10.7m" min-camera-orbit="auto 25deg auto" max-camera-orbit="auto 85deg auto" camera-target="0m 1m 0m" field-of-view="33deg" shadow-intensity="1" shadow-softness=".8" exposure="1.15" environment-image="neutral" interaction-prompt="none" loading="eager" reveal="auto"></model-viewer></div><span class="sr-only" data-loop-status role="status">Loading the material loop</span></section><section class="metric-strip" aria-label="Workspace summary">${[
    [state.facilities.length, "Public facility records"],
    [states.size, "States represented"],
    [state.records.length, "Reviewed material records"],
    [
      state.status.vision?.available ? "Ready" : "Not installed",
      "Local classification",
    ],
  ]
    .map(
      ([v, l]) =>
        `<div class="metric"><strong>${esc(v)}</strong><span>${l}</span></div>`,
    )
    .join(
      "",
    )}</section></div><aside class="overview-rail"><section class="panel map-panel"><div class="panel-header"><div><div class="eyebrow">SOURCE COVERAGE / INDIA</div><h2>Your wider loop</h2></div></div>${indiaMap(state.facilities)}<div class="panel-footer">${state.facilities.filter(hasCoordinates).length} geolocated / ${state.facilities.length} public records</div></section><section class="panel"><div class="panel-header"><h2>Evidence, kept separate.</h2></div><div class="panel-body"><p>Directory records are research leads. Your reviewed material notes are the inputs used for planning.</p><a class="text-link" href="#sources">Sources & setup ↗</a></div></section></aside></div>`;
}
function sourcesPage() {
  return `${heading("SOURCES & SETUP", "A clear trail behind every record.", "Check source provenance, local model installation and optional document analysis.")}<div class="setup-grid"><section class="panel"><div class="panel-header"><h2>Local image classification</h2>${badge(state.status.vision?.available ? "Installed" : "Not installed")}</div><div class="panel-body"><p>The specialist model runs on this computer. It suggests broad categories; grade, quantity, condition and price still need review.</p><p class="help-text">${state.status.vision?.available ? esc(state.status.vision.metadata?.modelVersion || "Local checkpoint available") : "Follow the README to install the Python environment and train the checkpoint."}</p><div class="setup-actions"><a class="btn btn-primary" href="#analysis">Material analysis</a><a class="text-link" href="#results">Measured results</a></div></div></section><section class="panel"><div class="panel-header"><h2>Optional document provider</h2>${badge(state.status.aiConfigured ? "Configured" : "Not configured")}</div><div class="panel-body"><p>PDF evidence can be reviewed manually. Optional document extraction uses your server-side key only when you explicitly choose it.</p><div class="config-code"><code>OPENAI_API_KEY=your_key</code><code>OPENAI_MODEL=${esc(state.status.model || "gpt-4.1-mini")}</code></div><p class="help-text">Configure the private .env file and restart the server. Local photo classification needs no provider key. Provider document extraction may incur charges.</p></div></section></div><section class="panel"><div class="panel-header"><div><h2>Public directory snapshot</h2><p>${state.facilities.length} facility records · ${state.sources.length} sources</p></div>${importButton()}</div><div class="panel-body"><p>Import the reviewed bundle explicitly. Re-imports update existing source IDs without duplicating records. Published listings do not confirm current authorisation or available stock.</p></div></section><div class="source-list">${state.sources.map((s) => `<article class="panel source-card"><div class="source-heading"><div><h3>${esc(s.title)}</h3><p>${esc(s.publisher)}</p></div><a class="text-link" href="${esc(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">Read source ↗</a></div><div class="source-details"><div><span>Published</span><strong>${date(s.publicationDate)}</strong></div><div><span>Retrieved</span><strong>${date(s.retrievedAt)}</strong></div><div><span>Coverage</span><strong>${esc(s.coverage)}</strong></div></div><p>${esc(s.notes)}</p><details><summary>Reuse terms</summary><p>${esc(s.terms)}</p>${s.termsUrl ? `<a class="text-link" href="${esc(safeURL(s.termsUrl))}" target="_blank" rel="noopener noreferrer">Publisher policy ↗</a>` : ""}</details></article>`).join("") || '<p class="muted">Source references appear after importing public records.</p>'}</div>`;
}

function hasCoordinates(f) {
  return (
    typeof f.latitude === "number" &&
    Number.isFinite(f.latitude) &&
    typeof f.longitude === "number" &&
    Number.isFinite(f.longitude) &&
    f.latitude >= 6 &&
    f.latitude <= 38 &&
    f.longitude >= 67 &&
    f.longitude <= 99
  );
}
function indiaMap(facilities) {
  const points = facilities.filter(hasCoordinates),
    coverage = new Set(facilities.map((f) => f.state).filter(Boolean));
  return `<div class="india-map"><svg viewBox="0 0 440 410" role="img" aria-label="Approximate India overview showing only facility coordinates supplied by verified sources"><defs><pattern id="geogrid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="#d9e0d7" stroke-width=".7"/></pattern></defs><rect width="440" height="410" fill="#f0f4ed"/><rect width="440" height="410" fill="url(#geogrid)"/><path d="m130 38 31-8 16 19 19 4 9 22 26 4 13 20-15 21 18 23 45 3 19-18 28 3 21-12 27 6-7 18-25 11-11 22-20-7-27 9-22-7-17 21-16 15-8 28-19 22-13 37-22 42-16 40-15-7-8-28-13-25-8-34-16-14-10-30-17-11-12-34-17-14-24 1-13-20 12-20 22 2 14-19 4-21 19-9 5-21-10-16 8-20Z" fill="#dce7d2" stroke="#a8bba0" stroke-width="1.5"/><path d="m132 123 37 26 24-6 37 27M138 182l36 28 44-4M173 211l-9 45 28 21M203 79l-30 24-5 46M248 156l-41 26 11 24M184 277l-5 41" fill="none" stroke="#c0d0b8" stroke-width="1"/><text x="25" y="32" font-size="11" font-family="monospace" fill="#778471">INDIA · APPROXIMATE PROJECTION</text><text x="330" y="376" font-size="11" font-family="monospace" fill="#778471">N ↑</text>${points.map((f) => `<circle cx="${((f.longitude - 67) / 32) * 380 + 30}" cy="${((38 - f.latitude) / 32) * 350 + 28}" r="5" fill="#335e40" stroke="#fff" stroke-width="2"><title>${esc(f.name)}</title></circle>`).join("")}</svg><div class="map-caption">${points.length ? `${points.length} source-supplied coordinate${points.length === 1 ? "" : "s"} plotted` : "No reliable facility coordinates in the current records"}<span>${coverage.size} states represented · Addresses remain searchable</span></div></div>`;
}
async function importRecords() {
  if (importing) return;
  importing = true;
  render();
  try {
    const result = await api("/api/import-public", {
      method: "POST",
      body: "{}",
    });
    await refreshData();
    toast(`${result.totalFacilities} public records available.`);
  } catch (error) {
    toast(error.message, true);
  } finally {
    importing = false;
    render();
  }
}
document.addEventListener("click", (event) => {
  if (
    event.target.closest("[data-feature]") &&
    !event.target.closest("[data-shell-action]")
  )
    return;
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "menu") {
    const open = document.getElementById("sidebar").classList.toggle("open");
    document
      .querySelector(".sidebar-overlay")
      .classList.toggle("visible", open);
    target.setAttribute("aria-expanded", String(open));
    if (open) document.querySelector(".nav-link.active")?.focus();
  }
  if (target.dataset.action === "close-menu") closeMenu(true);
  if (target.dataset.action === "refresh") refreshData();
  if (target.dataset.action === "import") importRecords();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape")
    closeMenu(document.getElementById("sidebar").classList.contains("open"));
});
window.addEventListener("hashchange", () => {
  render();
  closeMenu();
  window.scrollTo({ top: 0 });
  main().focus({ preventScroll: true });
});
mountShell();
render();
refreshData();
