import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout contre la pile locale (npm run db:up) et l'appli construite (npm run build).
// Lancer : npm run e2e
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  workers: 3,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "e2e/.results/results.json" }]],
  outputDir: "e2e/.results/artifacts",
  use: {
    baseURL: "http://localhost:3123",
    locale: "fr-CA",
    timezoneId: "America/Toronto",
    trace: "off",
    screenshot: "only-on-failure",
    ...devices["Pixel 7"], // 412 px, tactile
    viewport: { width: 390, height: 844 },
  },
  projects: [{ name: "chromium-mobile" }],
  webServer: {
    command: "npx next start -p 3123",
    url: "http://localhost:3123/connexion",
    reuseExistingServer: true,
    env: { ALLOW_DEMO: "1" },
  },
});
