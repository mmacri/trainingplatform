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

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: /Home/ }).first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetBrowserData(page);
});

test("learner completes practice and sees skill evidence", async ({ page }) => {
  await login(page, "learner@gridguard.local");
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { name: "Practice", exact: true })).toBeVisible();

  await page.goto("/#/practice/practice-unexpected-mfa");
  await expect(page.getByRole("heading", { name: "Unexpected MFA" })).toBeVisible();
  await page.getByRole("button", { name: "Deny and report" }).click();
  await page.getByRole("button", { name: "Complete Challenge" }).click();
  await expect(page.getByRole("heading", { name: "Challenge Complete" })).toBeVisible();

  await page.getByRole("link", { name: "View Skills" }).click();
  await expect(page.getByRole("heading", { name: "My Skills" })).toBeVisible();
  await expect(page.getByText(/Evidence item|evidence items/i).first()).toBeVisible();
});

test("scenario branching persists and replay preserves the original attempt", async ({ page }) => {
  await login(page, "learner@gridguard.local");
  await page.goto("/#/scenarios/scenario-unexpected-admin-connection");
  await page.getByRole("button", { name: "Start Scenario" }).click();
  await expect(page.getByRole("heading", { name: "Unexpected Administrative Connection" })).toBeVisible();

  await page.getByRole("button", { name: /Immediately declare/ }).click();
  await expect(page.getByText("Incident Declared Prematurely")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Incident Declared Prematurely")).toBeVisible();
  await page.getByRole("button", { name: /known facts/i }).click();
  await page.getByRole("button", { name: /Timestamps/ }).click();
  await expect(page.getByRole("heading", { name: "Scenario Complete" })).toBeVisible();

  await page.getByRole("link", { name: "Replay" }).click();
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.getByRole("heading", { name: "Unexpected Administrative Connection" })).toBeVisible();
});
