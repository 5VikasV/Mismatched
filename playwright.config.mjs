import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  testMatch: "*.spec.mjs",
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:4187",
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    },
  },
  webServer: {
    command: "node tests/browser/server.mjs",
    url: "http://127.0.0.1:4187/api/status",
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 3000 },
  },
  projects: [360, 768, 1366].map((width) => ({
    name: `width-${width}`,
    use: { viewport: { width, height: 1000 }, browserName: "chromium" },
  })),
});
