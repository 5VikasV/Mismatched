import { createApp } from "../../server/app.mjs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "scraploop-browser-"));
const app = createApp({
  dbPath: join(dir, "test.sqlite"),
  apiKey: "",
  fetchImpl: () => {
    throw new Error("Browser checks must never call paid providers");
  },
});
app.server.listen(4187, "127.0.0.1");
for (const signal of ["SIGTERM", "SIGINT"])
  process.once(signal, () => {
    app.close();
    rmSync(dir, { recursive: true, force: true });
    process.exit(0);
  });
