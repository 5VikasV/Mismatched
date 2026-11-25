import { buildLoopGraph, COMPATIBILITY_RULES } from "../loop-graph.js";
import { esc, num, money } from "./shared.js";
export function requestGraph(request) {
  if (!request) return buildLoopGraph([], COMPATIBILITY_RULES);
  const material = JSON.stringify([
    request.requirements.material.trim().toUpperCase(),
    request.requirements.grade.trim().toUpperCase(),
  ]);
  const height = Math.max(360, request.plan.allocations.length * 110 + 80);
  const nodes = request.plan.allocations.map((a, i) => ({
    id: a.recordId,
    name: a.company,
    location: a.title,
    x: 160,
    y: 80 + i * 110,
    outputs: [
      {
        material,
        quantityKg: a.quantityKg,
        pricePerKg: a.pricePerKg,
        valueInr: a.payout,
      },
    ],
    inputs: [],
  }));
  nodes.push({
    id: "buyer-" + request.id,
    name: "Buyer request " + request.id.slice(0, 8),
    location: "Buyer identity / output streams not recorded",
    x: 660,
    y: height / 2,
    outputs: [],
    inputs: [{ material, quantityKg: request.plan.requiredKg }],
  });
  return {
    ...buildLoopGraph(nodes, COMPATIBILITY_RULES, { maxLength: 4 }),
    height,
  };
}
export async function mountFeature(root, ctx) {
  let alive = true,
    requests = [],
    id = "",
    nodeId = "",
    error = "";
  const w = root.ownerDocument.defaultView,
    controller = new w.AbortController();
  root.dataset.feature = "loop";
  function render() {
    if (!alive) return;
    const request = requests.find((r) => r.id === id),
      g = requestGraph(request),
      selected = g.nodes.find((n) => n.id === nodeId);
    root.innerHTML = `<header class="feature-intro"><div><div class="eyebrow">08 / MATERIAL FLOW</div><h1>Follow the material.</h1><p>Explore a saved request’s supplier-to-buyer connections using its recorded material and grade.</p></div><a class="btn btn-secondary" href="#bookings">Booking requests ↗</a></header><div class="notice">Proposed flows, not deliveries. No factory conversions, buyer outputs or circular supply chains are assumed. Diagram positions are schematic, not geographic.</div><p class="error-message" role="alert">${esc(error)}</p><label class="field"><span class="field-label">Pending request</span><select class="select" id="flow-request"><option value="">Choose a request</option>${requests.map((r) => `<option value="${r.id}" ${id === r.id ? "selected" : ""}>${esc(r.requirements.material)} / ${esc(r.requirements.grade)} · ${r.id.slice(0, 8)}</option>`).join("")}</select></label>${
      request
        ? `<div class="flow-layout"><section class="panel panel-body"><h2>${esc(request.requirements.material)} / ${esc(request.requirements.grade)}</h2><div class="flow-canvas"><svg viewBox="0 0 850 ${g.height}" role="img" aria-label="Proposed supplier to buyer material connections"><defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0 0 7 3 0 6" fill="#74875d"/></marker></defs>${g.edges
            .map((e) => {
              const from = g.nodes.find((n) => n.id === e.from),
                to = g.nodes.find((n) => n.id === e.to);
              return `<path d="M${from.x + 65} ${from.y} C400 ${from.y} 410 ${to.y} ${to.x - 80} ${to.y}" fill="none" stroke="#74875d" stroke-width="2" marker-end="url(#flow-arrow)"/>`;
            })
            .join(
              "",
            )}${g.nodes.map((n) => `<g tabindex="0" role="button" aria-label="Inspect ${esc(n.name)}" data-flow-node="${esc(n.id)}" class="flow-node"><rect x="${n.x - 110}" y="${n.y - 30}" width="220" height="60" fill="${n.id === nodeId ? "#e3ecd4" : "#fff"}" stroke="#74875d"/><text x="${n.x}" y="${n.y + 5}" text-anchor="middle">${esc(n.name.length > 25 ? n.name.slice(0, 23) + "…" : n.name)}</text></g>`).join("")}</svg></div><p class="help-text">${g.edges.length} proposed connections · ${g.loops.length} recorded closed loops. Buyer output streams are unknown, so a closed industrial loop cannot be established.</p></section><aside class="panel panel-body"><h2>${selected ? esc(selected.name) : "Inspect a node"}</h2>${selected ? `<p>${esc(selected.location)}</p><p>${selected.outputs.length ? "Proposed output to this request" : "Proposed input requirement"}: ${num(selected.outputs[0]?.quantityKg || selected.inputs[0]?.quantityKg)} kg</p>${selected.outputs.length ? `<p>Gross material value: ${money(selected.outputs[0].valueInr)}</p>` : ""}` : "<p>Select a supplier or buyer node. Keyboard: Tab to a node, then Enter or Space.</p>"}</aside></div>`
        : '<section class="panel panel-body"><h2>No request selected</h2><p>Save a complete material pool to inspect its actual planned connections. No sample factories are loaded.</p><a href="#planner">Open pool planner ↗</a></section>'
    }`;
  }
  root.addEventListener(
    "change",
    (e) => {
      if (e.target.id === "flow-request") {
        id = e.target.value;
        nodeId = "";
        render();
      }
    },
    { signal: controller.signal },
  );
  const select = (e) => {
    const node = e.target.closest("[data-flow-node]");
    if (node) {
      nodeId = node.dataset.flowNode;
      render();
      [...root.querySelectorAll("[data-flow-node]")]
        .find((n) => n.dataset.flowNode === nodeId)
        ?.focus();
    }
  };
  root.addEventListener("click", select, { signal: controller.signal });
  root.addEventListener(
    "keydown",
    (e) => {
      if (
        e.target.closest("[data-flow-node]") &&
        ["Enter", " "].includes(e.key)
      ) {
        e.preventDefault();
        select(e);
      }
    },
    { signal: controller.signal },
  );
  render();
  try {
    const data = await ctx.api("/api/booking-requests");
    if (alive) {
      requests = data.requests.filter((r) => r.status === "pending_agreement");
      id = requests[0]?.id || "";
      render();
    }
  } catch (e) {
    if (alive) {
      error = e.message;
      render();
    }
  }
  return () => {
    alive = false;
    controller.abort();
  };
}
