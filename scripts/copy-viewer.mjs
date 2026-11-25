import { copyFileSync, mkdirSync } from "node:fs";
mkdirSync("dist/vendor", { recursive: true });
copyFileSync(
  "node_modules/@google/model-viewer/dist/model-viewer.min.js",
  "dist/vendor/model-viewer.min.js",
);
copyFileSync(
  "node_modules/@google/model-viewer/LICENSE",
  "dist/vendor/model-viewer.LICENSE",
);
console.log("Copied locally hosted model-viewer and license.");
