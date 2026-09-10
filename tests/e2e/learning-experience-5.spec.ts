import { expect, test, type Page } from "@playwright/test";

const password = "GridGuard-Local-2026!";

async function resetBrowserData(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase("GridGuardDB");
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => resolve();
    });
  });
}

async function login(page: Page, email = "learner@gridguard.local") {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: /Home/ }).first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetBrowserData(page);
});

test("learner can use 5.0 storyline, program, and investigation workflow", async ({ page }) => {
  await login(page);

  await page.goto("/#/environment/timeline");
  await expect(page.getByRole("heading", { name: "North Valley Story Timeline" })).toBeVisible();
  await expect(page.getByText("OPS-SRV-12 Shows Security Drift")).toBeVisible();

  await page.goto("/#/environment/map");
  await page.getByRole("button", { name: /OPS-SRV-12/ }).click();
  await expect(page.getByText("Recurring server used for services").first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Open CIP-007" })).toBeVisible();

  await page.goto("/#/programs/program-cybersecurity-operations-readiness");
  await expect(page.getByRole("heading", { name: "Cybersecurity Operations Readiness" })).toBeVisible();
  await expect(page.getByText("Capstone").first()).toBeVisible();

  await page.goto("/#/investigations/investigation-nv-night-shift/run/e2e-night-shift");
  await expect(page.getByRole("heading", { name: "North Valley Night Shift Investigation" })).toBeVisible();
  await page.getByRole("button", { name: "Add to Findings" }).first().click();
  await page.getByRole("button", { name: "Preserve Evidence" }).first().click();
  await page.getByRole("button", { name: "POTENTIAL UNAUTHORIZED ACTIVITY" }).click();
  await expect(page.getByText("02:12 Unexpected RDP")).toBeVisible();
  await expect(page.getByText("Working hypothesis")).toBeVisible();
  await expect(page.getByText("Finding coverage:")).toBeVisible();

  await page.reload();
  await expect(page.getByText("02:12 Unexpected RDP")).toBeVisible();
  await expect(page.getByText("Working hypothesis")).toBeVisible();
});

test("manager coaching exposes prompts and bundle assignment", async ({ page }) => {
  await login(page, "manager@gridguard.local");

  await page.goto("/#/team/coaching");
  await expect(page.getByRole("heading", { name: "Coaching" })).toBeVisible();
  await expect(page.getByText("Coaching prompts").first()).toBeVisible();
  await page.getByRole("button", { name: "Assign CIP-007 Bundle" }).click();
  await expect(page.getByText("Readiness bundle assigned")).toBeVisible();
});
