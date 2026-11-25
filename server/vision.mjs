import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export function createVision({
  python = process.env.ML_PYTHON || resolve(root, ".venv/bin/python"),
  timeoutMs = 45000,
} = {}) {
  let worker = null,
    pending = null,
    buffer = "";
  const metadata = () => {
    try {
      return JSON.parse(
        readFileSync(resolve(root, "ml/artifacts/metadata.json"), "utf8"),
      );
    } catch {
      return null;
    }
  };
  const status = () => ({
    available:
      existsSync(python) && existsSync(resolve(root, "ml/artifacts/model.pt")),
    metadata: metadata(),
  });
  function stop(message = "Local classifier stopped.") {
    const child = worker;
    worker = null;
    if (child) child.kill();
    buffer = "";
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
      pending = null;
    }
  }
  function start() {
    const child = spawn(python, [resolve(root, "ml/worker.py")], {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: root,
    });
    worker = child;
    child.stdin.on("error", () => {
      if (worker === child)
        stop("Could not send the image to the local classifier.");
    });
    child.stderr.on("data", () => {}); // never mix logs with the JSON protocol
    child.on("error", () => {
      if (worker === child)
        stop("Local classifier could not start. Install ml/requirements.txt.");
    });
    child.on("exit", () => {
      if (worker === child)
        stop("Local classifier exited. Check the model installation.");
    });
    child.stdout.on("data", (chunk) => {
      if (worker !== child) return;
      buffer += chunk.toString();
      if (buffer.length > 65536) return stop("Invalid classifier response.");
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 1);
        try {
          const data = JSON.parse(line);
          if (pending && data.id === pending.id) {
            const p = pending;
            pending = null;
            clearTimeout(p.timer);
            if (data.error) p.reject(new Error(data.error));
            else p.resolve(data.result);
          }
        } catch {
          stop("Invalid classifier response.");
        }
      }
    });
  }
  return {
    status,
    close: () => stop(),
    classify(dataBase64) {
      if (!status().available)
        return Promise.reject(
          Object.assign(
            new Error(
              "Install the local ML environment and run training first.",
            ),
            { status: 503 },
          ),
        );
      if (pending)
        return Promise.reject(
          Object.assign(
            new Error("Another image is being classified. Try again shortly."),
            { status: 429 },
          ),
        );
      if (!worker) start();
      return new Promise((resolvePromise, reject) => {
        const id = randomUUID();
        pending = {
          id,
          resolve: resolvePromise,
          reject,
          timer: setTimeout(
            () => stop("Local classification timed out. Try a smaller image."),
            timeoutMs,
          ),
        };
        worker.stdin.write(
          JSON.stringify({ id, dataBase64 }) + "\n",
          (error) => {
            if (error)
              stop("Could not send the image to the local classifier.");
          },
        );
      });
    },
  };
}
