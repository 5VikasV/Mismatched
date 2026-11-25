/** Restyle the user's original HTML without replacing any original data or scripts. */
import { readFileSync, writeFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const original = readFileSync("design/standalone/original.html", "utf8");
const { window } = new JSDOM(original);
const { document } = window;
const style = document.createElement("style");
style.id = "scraploop-layout-refresh";
style.textContent = readFileSync("design/standalone/layout.css", "utf8");
document.head.append(style);
document
  .querySelector("nav")
  .setAttribute("aria-label", "Workspace navigation");
document.querySelector("main").setAttribute("id", "main-content");
const dashboardGrid = [
  ...document.querySelector("#tab-dashboard").children,
].find((el) => el.style.display === "grid");
dashboardGrid?.classList.add("layout-dashboard-grid");
const matching = document.querySelector("#tab-matching");
[...matching.children]
  .find((el) => el.style.display === "grid")
  ?.classList.add("layout-matching-grid");
[...matching.children]
  .find(
    (el) => el.style.display === "flex" && el.querySelector("#btn-stream-pp"),
  )
  ?.classList.add("layout-material-toolbar");
// All pool data and controls stay intact, available under the existing section heading.
const pool = document.querySelector(".pool-planner-box");
const detail = document.createElement("details");
detail.className = pool.className;
const heading = pool.querySelector(".pool-planner-head");
const summary = document.createElement("summary");
summary.className = heading.className;
while (heading.firstChild) summary.append(heading.firstChild);
heading.remove();
const content = document.createElement("div");
content.className = "pool-layout-body";
while (pool.firstChild) content.append(pool.firstChild);
detail.append(summary, content);
pool.replaceWith(detail);
// Keep full tables available without compressing every column into a phone screen.
for (const table of document.querySelectorAll("table")) {
  const scroll = document.createElement("div");
  scroll.className = "layout-table-scroll";
  scroll.setAttribute("tabindex", "0");
  scroll.setAttribute("role", "region");
  scroll.setAttribute("aria-label", "Scrollable table");
  table.replaceWith(scroll);
  scroll.append(table);
}
const transport = document.querySelector("#tab-transport");
const breakdown = [...transport.children].find(
  (el) =>
    el.classList.contains("card-panel") && el.querySelector("#transportTable"),
);
if (breakdown) {
  const details = document.createElement("details");
  details.className = "layout-disclosure";
  const summary = document.createElement("summary");
  summary.textContent = "Detailed supplier cost breakdown";
  breakdown.replaceWith(details);
  details.append(summary, breakdown);
}
const waybills = document.querySelector("#tab-waybills");
for (const element of waybills.children)
  if (element.querySelector("#waybillSearchInput"))
    element.classList.add("layout-waybill-toolbar");
const originalScripts = [
  ...new JSDOM(original).window.document.querySelectorAll("script"),
].map((el) => el.textContent);
const outputScripts = [...document.querySelectorAll("script")].map(
  (el) => el.textContent,
);
if (JSON.stringify(originalScripts) !== JSON.stringify(outputScripts))
  throw new Error("Original scripts were modified");
writeFileSync(
  "index.html",
  "<!DOCTYPE html>\n" + document.documentElement.outerHTML + "\n",
);
console.log(
  "Built root index.html: original data and scripts preserved; presentation refreshed.",
);
window.close();
