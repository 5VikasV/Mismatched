import { esc, num } from "./shared.js";
import { commercialSummary, allocationSummary } from "./commercial.js";
import { exportEstimate } from "../estimate.js";
export async function mountFeature(root, ctx) {
  let alive = true,
    requests = [],
    selected = null,
    cancelId = null,
    busy = false,
    error = "",
    url = null;
  const w = root.ownerDocument.defaultView,
    controller = new w.AbortController();
  root.dataset.feature = "bookings";
  function render() {
    if (!alive) return;
    const query = ctx.initialSearch?.toLowerCase() || "";
    const list = requests.filter((r) =>
      `${r.id} ${r.requirements.material} ${r.status}`
        .toLowerCase()
        .includes(query),
    );
    const item = requests.find((r) => r.id === selected);
    root.innerHTML = `<header class="feature-intro"><div><div class="eyebrow">05 / BOOKING REQUESTS</div><h1>Terms, kept together.</h1><p>Saved local requests with clear fees and a decision for every pickup.</p></div><a class="btn btn-primary" href="#planner">Plan a new request ↗</a></header><div class="notice">Pending agreement does not mean accepted, paid, reserved or dispatched. Commercial terms are snapshots; cancel and create a new request to change them.</div><p class="error-message" role="alert">${esc(error)}</p><button class="text-link" data-book-action="reload">${busy ? "Loading…" : "Refresh requests"}</button><div class="booking-layout"><section aria-label="Booking requests">${list.map((r) => `<button class="booking-list-item" data-book-action="select" data-id="${r.id}" aria-pressed="${r.id === selected}"><strong>${esc(r.requirements.material)} / ${esc(r.requirements.grade)}</strong><span>${num(r.plan.requiredKg / 1000)} t · ${esc(r.plan.quantityBand)}</span><small>${r.status === "cancelled" ? "Cancelled" : "Pending agreement"} · ${esc(new Date(r.createdAt).toLocaleString("en-IN"))}</small><small>${r.id}</small></button>`).join("") || '<div class="panel panel-body"><h2>No matching requests yet.</h2><p>Create a complete pool, decide each pickup and review the terms before saving.</p><a href="#planner">Open pool planner ↗</a></div>'}</section><section class="panel panel-body">${item ? `<div class="eyebrow">${item.status === "cancelled" ? "CANCELLED" : "PENDING AGREEMENT"}</div><h2>${esc(item.requirements.material)} / ${esc(item.requirements.grade)} · ${num(item.plan.requiredKg / 1000)} t</h2><p class="help-text">Request ${item.id}<br>${esc(item.policyVersion)} · Saved ${esc(item.createdAt)}${item.cancelledAt ? "<br>Cancelled " + esc(item.cancelledAt) : ""}</p>${allocationSummary(item.plan)}${commercialSummary(item.plan)}${item.acknowledgeUneconomical ? '<p class="notice">No-positive-savings acknowledgement recorded.</p>' : ""}<button class="btn btn-secondary" data-book-action="export">Export request CSV</button>${item.status !== "cancelled" ? `<button class="text-link" data-book-action="cancel" data-id="${item.id}">Cancel request</button>${cancelId === item.id ? `<div role="group" aria-label="Confirm cancellation"><p>Cancel this request? Its original terms remain saved.</p><button class="btn btn-primary" data-book-action="confirm-cancel" data-id="${item.id}">Confirm cancellation</button><button class="btn btn-secondary" data-book-action="keep">Keep request</button></div>` : ""}` : ""}` : "<h2>Choose a booking request</h2><p>Its material allocations, commission shares and transport responsibilities appear here.</p>"}</section></div>`;
  }
  async function reload() {
    busy = true;
    render();
    try {
      const result = await ctx.api("/api/booking-requests");
      if (alive) {
        requests = result.requests;
        selected =
          selected ||
          requests.find((r) =>
            `${r.id} ${r.requirements.material} ${r.status}`
              .toLowerCase()
              .includes(ctx.initialSearch?.toLowerCase() || ""),
          )?.id;
        error = "";
      }
    } catch (err) {
      if (alive) error = err.message;
    } finally {
      busy = false;
      render();
    }
  }
  root.addEventListener(
    "click",
    async (e) => {
      const b = e.target.closest("[data-book-action]");
      if (!b || busy) return;
      const action = b.dataset.bookAction;
      if (action === "select") {
        selected = b.dataset.id;
        cancelId = null;
        render();
      }
      if (action === "reload") await reload();
      if (action === "cancel") {
        cancelId = b.dataset.id;
        render();
      }
      if (action === "keep") {
        cancelId = null;
        render();
      }
      if (action === "confirm-cancel") {
        busy = true;
        render();
        try {
          await ctx.api(`/api/booking-requests/${b.dataset.id}/cancel`, {
            method: "POST",
            body: JSON.stringify({ confirmed: true }),
          });
          cancelId = null;
          try {
            await ctx.refreshData();
          } catch {}
          await reload();
        } catch (err) {
          if (alive) error = err.message;
        } finally {
          busy = false;
          render();
        }
      }
      if (action === "export") {
        const item = requests.find((r) => r.id === selected);
        if (!item) return;
        if (url) w.URL.revokeObjectURL(url);
        const text =
          exportEstimate(item.plan, item.requirements, {
            timestamp: item.createdAt,
          }).replace(
            "ScrapLoop planning estimate",
            "ScrapLoop booking request snapshot",
          ) +
          `"Request ID","${item.id}"\r\n"Request status","${item.status}"\r\n`;
        url = w.URL.createObjectURL(
          new w.Blob([text], { type: "text/csv;charset=utf-8" }),
        );
        const a = root.ownerDocument.createElement("a");
        a.href = url;
        a.download = "scraploop-booking-request.csv";
        a.click();
      }
    },
    { signal: controller.signal },
  );
  await reload();
  return () => {
    alive = false;
    controller.abort();
    if (url) w.URL.revokeObjectURL(url);
  };
}
