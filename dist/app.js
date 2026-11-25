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
  ["bookings", "truck", "Booking requests"],
  ["results", "shield", "Model results"],
  ["sources", "list", "Sources & setup"],
];
const loaders = {
  directory: () => import("./features/directory.js"),
  analysis: () => import("./features/analysis.js"),
  planner: () => import("./features/planner.js"),
  bookings: () => import("./features/bookings.js"),
  results: () => import("./features/results.js"),
};
const state = {
  status: { aiConfigured: false, vision: { available: false } },
  facilities: [],
  sources: [],
  records: [],
  bookingRequests: [],
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
    const [status, facilities, sources, records, bookings] = await Promise.all([
      api("/api/status"),
      api("/api/facilities"),
      api("/api/sources"),
      api("/api/records"),
      api("/api/booking-requests"),
    ]);
    if (request !== refreshGeneration) return;
    Object.assign(state, {
      status,
      facilities: facilities.facilities || [],
      sources: sources.sources || [],
      records: records.records || [],
      bookingRequests: bookings.requests || [],
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
  document.getElementById("app").innerHTML = `<div class="app-shell">
    <header class="desk-masthead"><a class="brand" href="/" aria-label="ScrapLoop home"><svg viewBox="0 0 28 28" class="brand-mark" aria-hidden="true"><path d="M5 8h13l-3-3m8 15H10l3 3M18 8a8 8 0 0 1 4 12M10 20a8 8 0 0 1-4-12"/></svg><span>SCRAPLOOP<span class="brand-caption">THE MATERIAL DESK</span></span></a><div class="masthead-note"><span class="status-dot"></span><span id="connection-status">Local workspace</span><span class="masthead-divider">/</span><span>Saved on this computer</span></div><div class="masthead-actions"><button class="finder-trigger" data-action="finder" aria-label="Search workspace" title="Find anything (Ctrl+K)" aria-haspopup="dialog">${icon("search")}<span>Find anything</span><kbd>⌘ / Ctrl K</kbd></button><a class="btn btn-primary quick-add" href="#analysis">+ <span>Add material</span></a><button type="button" class="icon-btn mobile-menu-btn" data-action="menu" aria-label="Open navigation" aria-controls="sidebar" aria-expanded="false">${icon("menu")}</button></div></header>
    <div class="desk-navigation" id="sidebar"><nav aria-label="Main navigation">${nav.map(([id, i, label], index) => `<a class="nav-link" href="#${id}" data-nav="${id}"><span class="nav-number">0${index + 1}</span><span>${label}</span>${icon(i)}</a>`).join("")}</nav><a class="desk-home" href="/">Landing page ↗</a></div><div class="sidebar-overlay" data-action="close-menu"></div>
    <div class="workspace"><div class="desk-location"><div class="breadcrumbs"><span>WORKSPACE</span><span>/</span><strong id="breadcrumb">Overview</strong></div><span class="workspace-label">INDUSTRIAL MATERIAL REUSE</span></div><main id="main" class="main-content" tabindex="-1"></main><footer class="workspace-footer"><a href="/">SCRAPLOOP<span> / TEAM MISMATCHED</span></a><span>From evidence to a better use.</span><a href="#sources">Sources & setup ↗</a></footer></div></div>
    <dialog class="finder-dialog" id="workspace-finder" aria-labelledby="finder-title"><div class="finder-header"><label id="finder-title" for="finder-input">Find a page, facility or material</label><button class="icon-btn" data-action="close-finder" aria-label="Close search">${icon("close")}</button></div><input class="input" id="finder-input" type="search" placeholder="Try ‘analysis’, ‘Pune’ or a saved material…" autocomplete="off"><div id="finder-results" class="finder-results" aria-live="polite"></div><p class="finder-hint">Tab to a result · Enter to open · Esc to close</p></dialog>`;
}
let finderFocus = null;
let pendingSearch = null;
function openFinder() {
  const dialog = document.getElementById("workspace-finder");
  if (dialog.open) return;
  finderFocus = document.activeElement;
  dialog.showModal();
  document.getElementById("finder-input").value = "";
  renderFinder();
  document.getElementById("finder-input").focus();
}
function closeFinder() {
  document.getElementById("workspace-finder").close();
  finderFocus?.focus();
}
function renderFinder() {
  const query = document
    .getElementById("finder-input")
    .value.trim()
    .toLowerCase();
  const matches = (value) => value.toLowerCase().includes(query);
  const pages = nav
    .filter((n) => matches(n[2]))
    .map(([route, i, label]) => ({
      route,
      label,
      detail: "Workspace page",
      icon: i,
    }));
  const facilities = query
    ? state.facilities
        .filter((f) =>
          matches(
            `${f.name} ${f.state} ${f.district || ""} ${(f.materials || []).join(" ")}`,
          ),
        )
        .slice(0, 5)
        .map((f) => ({
          route: "directory",
          label: f.name,
          detail: `Facility · ${f.state}`,
          search: f.name,
          icon: "building",
        }))
    : [];
  const records = query
    ? state.records
        .filter((r) =>
          matches(`${r.title} ${r.material || ""} ${r.company || ""}`),
        )
        .slice(0, 5)
        .map((r) => ({
          route: "analysis",
          label: r.title,
          detail: `Saved material · ${r.material || "Unspecified"}`,
          search: r.title,
          icon: "box",
        }))
    : [];
  const bookings = query
    ? state.bookingRequests
        .filter((r) =>
          matches(
            `${r.id} ${r.requirements.material} ${r.requirements.grade} ${r.status}`,
          ),
        )
        .slice(0, 5)
        .map((r) => ({
          route: "bookings",
          label: `${r.requirements.material} / ${r.requirements.grade}`,
          detail: `Booking request · ${r.id}`,
          search: r.id,
          icon: "truck",
        }))
    : [];
  document.getElementById("finder-results").innerHTML =
    [...pages, ...facilities, ...records, ...bookings]
      .map(
        (r) =>
          `<button class="finder-result" data-action="finder-go" data-route="${r.route}" data-query="${esc(r.search || "")}">${icon(r.icon)}<span><strong>${esc(r.label)}</strong><small>${esc(r.detail)}</small></span><span aria-hidden="true">↗</span></button>`,
      )
      .join("") ||
    '<p class="finder-empty">No matches in this workspace. Try a page name or a shorter search.</p>';
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
          initialSearch:
            pendingSearch?.route === route ? pendingSearch.query : "",
        });
      })
      .then((dispose) => {
        if (current === generation) pendingSearch = null;
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
  const ready = state.status.vision?.available;
  const next = !state.facilities.length
    ? importButton()
    : !state.records.length
      ? '<a class="btn btn-primary" href="#analysis">Analyse your first material ↗</a>'
      : '<a class="btn btn-primary" href="#planner">Plan a material pool ↗</a>';
  const recent = [...state.records]
    .sort((a, b) =>
      String(b.updatedAt || b.createdAt || "").localeCompare(
        String(a.updatedAt || a.createdAt || ""),
      ),
    )
    .slice(0, 4);
  return `<section class="desk-hero"><div class="hero-copy"><div class="eyebrow"><span class="orange-rule"></span>THE NEXT LIFE STARTS HERE</div><h1>Less waste.<br><em>More possibility.</em></h1><p>Your desk for finding facilities, understanding materials and making the numbers work.</p><div class="hero-actions">${next}<a class="text-link" href="#directory">Explore the directory ↗</a></div><div class="hero-footnote"><span class="status-dot"></span>${ready ? "Local image classifier ready" : "Manual review available · classifier not installed"}</div></div><section class="loop-exhibit" data-material-loop aria-label="Interactive 3D material reuse loop"><div class="loop-stage"><img class="loop-poster" src="/assets/3d/material-loop-poster.webp" alt="Miniature factory encircled by a conveyor carrying copper coils, polymer offcuts and cardboard"><model-viewer src="/assets/3d/material-loop.glb" alt="A 3D factory with material lots circulating on a conveyor. Drag to rotate." camera-controls touch-action="pan-y" disable-zoom disable-pan camera-orbit="35deg 57deg 10.7m" min-camera-orbit="auto 25deg auto" max-camera-orbit="auto 85deg auto" camera-target="0m 1m 0m" field-of-view="33deg" shadow-intensity="1" shadow-softness=".8" exposure="1.15" environment-image="neutral" interaction-prompt="none" loading="eager" reveal="auto"></model-viewer></div><span class="sr-only" data-loop-status role="status">Loading the material loop</span></section></section>
  <section class="metric-strip desk-metrics" aria-label="Workspace summary">${[
    [state.facilities.length, "Public facility records"],
    [states.size, "States represented"],
    [state.records.length, "Reviewed material records"],
    [ready ? "Ready" : "Not installed", "Local classification"],
  ]
    .map(
      ([v, l], i) =>
        `<div class="metric"><span class="metric-index">0${i + 1} /</span><strong>${esc(v)}</strong><span>${l}</span></div>`,
    )
    .join("")}</section>
  <section class="desk-workflow"><div class="section-heading"><div><div class="eyebrow">A PRACTICAL WORKFLOW</div><h2>Build your local loop.</h2></div><span class="section-note">Three steps. Your evidence at every stage.</span></div><div class="workflow-links">${[
    [
      "directory",
      "01",
      "Find your network",
      "Browse attributed facility records. Check the source before making contact.",
      state.facilities.length
        ? `${state.facilities.length} records to explore`
        : "Start with a public import",
      "building",
    ],
    [
      "analysis",
      "02",
      "Know your material",
      "Drop in a photo. Review the suggestion. Save only the details you can support.",
      `${state.records.length} reviewed records`,
      "spark",
    ],
    [
      "planner",
      "03",
      "Make a pool work",
      "Combine compatible lots and compare the full delivered cost.",
      "Your inputs. Transparent estimates.",
      "box",
    ],
  ]
    .map(
      ([route, n, title, copy, note, i]) =>
        `<a class="workflow-link" href="#${route}"><span class="workflow-number">${n}</span><div class="workflow-symbol">${icon(i)}</div><h3>${title}</h3><p>${copy}</p><div class="workflow-bottom"><span>${note}</span><span class="round-arrow" aria-hidden="true">↗</span></div></a>`,
    )
    .join("")}</div></section>
  <div class="desk-bottom-grid"><section class="desk-ledger"><div class="section-heading"><div><div class="eyebrow">YOUR MATERIAL LEDGER</div><h2>Recently reviewed</h2></div><a class="text-link" href="#analysis">All records ↗</a></div>${recent.length ? `<div class="recent-records">${recent.map((r, i) => `<a href="#analysis" class="recent-record" data-action="open-material" data-query="${esc(r.title)}"><span class="ledger-number">${String(i + 1).padStart(2, "0")}</span><div><strong>${esc(r.title)}</strong><span>${esc(r.company || "Company unknown")} · ${esc(r.material || "Material unknown")}</span></div><span>${r.quantityKg == null ? "Quantity unknown" : number(r.quantityKg) + " kg"}</span><span aria-hidden="true">↗</span></a>`).join("")}</div>` : '<div class="ledger-empty"><span class="ledger-empty-mark">+</span><h3>A place for what you know.</h3><p>Your reviewed materials will appear here. Start with a photo or enter a record yourself.</p><a class="btn btn-secondary" href="#analysis">Add a material ↗</a></div>'}</section><aside class="source-snapshot"><div class="eyebrow">BEHIND THE DIRECTORY</div><h2>Real sources.<br>Visible limits.</h2><p>${state.sources.length} attributed sources covering ${states.size} states. Facility listings are research leads, not confirmed available stock.</p><div class="coverage-bars">${
    [...states]
      .sort()
      .map((st) => {
        const count = state.facilities.filter((f) => f.state === st).length;
        return `<div><span>${esc(st)}</span><strong>${count}</strong><meter min="0" max="${state.facilities.length || 1}" value="${count}" aria-label="${esc(st)} facility count">${count}</meter></div>`;
      })
      .join("") ||
    '<p class="help-text">Coverage appears after you import the public records.</p>'
  }</div><a class="text-link" href="#sources">Inspect the sources ↗</a></aside></div>`;
}

function sourcesPage() {
  return `${heading("07 / SOURCES & SETUP", "Follow the evidence.", "Check source provenance, local model installation and optional document analysis.")}<div class="setup-grid"><section class="panel"><div class="panel-header"><h2>Local image classification</h2>${badge(state.status.vision?.available ? "Installed" : "Not installed")}</div><div class="panel-body"><p>The specialist model runs on this computer. It suggests broad categories; grade, quantity, condition and price still need review.</p><p class="help-text">${state.status.vision?.available ? esc(state.status.vision.metadata?.modelVersion || "Local checkpoint available") : "Follow the README to install the Python environment and train the checkpoint."}</p><div class="setup-actions"><a class="btn btn-primary" href="#analysis">Material analysis</a><a class="text-link" href="#results">Measured results</a></div></div></section><section class="panel"><div class="panel-header"><h2>Optional document provider</h2>${badge(state.status.aiConfigured ? "Configured" : "Not configured")}</div><div class="panel-body"><p>PDF evidence can be reviewed manually. Optional document extraction uses your server-side key only when you explicitly choose it.</p><div class="config-code"><code>OPENAI_API_KEY=your_key</code><code>OPENAI_MODEL=${esc(state.status.model || "gpt-4.1-mini")}</code></div><p class="help-text">Configure the private .env file and restart the server. Local photo classification needs no provider key. Provider document extraction may incur charges.</p></div></section></div><section class="panel"><div class="panel-header"><div><h2>Public directory snapshot</h2><p>${state.facilities.length} facility records · ${state.sources.length} sources</p></div>${importButton()}</div><div class="panel-body"><p>Import the reviewed bundle explicitly. Re-imports update existing source IDs without duplicating records. Published listings do not confirm current authorisation or available stock.</p></div></section><div class="source-list">${state.sources.map((s) => `<article class="panel source-card"><div class="source-heading"><div><h3>${esc(s.title)}</h3><p>${esc(s.publisher)}</p></div><a class="text-link" href="${esc(safeURL(s.url))}" target="_blank" rel="noopener noreferrer">Read source ↗</a></div><div class="source-details"><div><span>Published</span><strong>${date(s.publicationDate)}</strong></div><div><span>Retrieved</span><strong>${date(s.retrievedAt)}</strong></div><div><span>Coverage</span><strong>${esc(s.coverage)}</strong></div></div><p>${esc(s.notes)}</p><details><summary>Reuse terms</summary><p>${esc(s.terms)}</p>${s.termsUrl ? `<a class="text-link" href="${esc(safeURL(s.termsUrl))}" target="_blank" rel="noopener noreferrer">Publisher policy ↗</a>` : ""}</details></article>`).join("") || '<p class="muted">Source references appear after importing public records.</p>'}</div>`;
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
  if (event.target.closest(".skip-link")) {
    event.preventDefault();
    main().focus();
    main().scrollIntoView({ block: "start" });
    return;
  }
  if (
    event.target.closest("[data-feature]") &&
    !event.target.closest("[data-shell-action]")
  )
    return;
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "open-material") {
    event.preventDefault();
    pendingSearch = { route: "analysis", query: target.dataset.query };
    navigate("analysis");
  }
  if (target.dataset.action === "finder") openFinder();
  if (target.dataset.action === "close-finder") closeFinder();
  if (target.dataset.action === "finder-go") {
    pendingSearch = {
      route: target.dataset.route,
      query: target.dataset.query,
    };
    closeFinder();
    navigate(target.dataset.route);
  }
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
document.addEventListener("input", (event) => {
  if (event.target.id === "finder-input") renderFinder();
});
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    openFinder();
    return;
  }
  if (
    event.key === "Escape" &&
    document.getElementById("workspace-finder").open
  ) {
    event.preventDefault();
    closeFinder();
    return;
  }
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
