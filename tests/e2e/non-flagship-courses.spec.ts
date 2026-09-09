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

test("learner can open and progress through CIP-004 Foundations", async ({ page }) => {
  await login(page, "learner@gridguard.local");
  await page.goto("/#/courses/course-cip004-foundations");
  await expect(page.getByRole("heading", { name: "CIP-004 — Personnel & Training Foundations" })).toBeVisible();

  await page.getByRole("link", { name: /Start Course|Resume Course|View Course/ }).click();
  await expect(page.getByRole("heading", { name: "Why People Matter", level: 1 })).toBeVisible();
  await expect(page.getByText("Security controls are operated, approved, maintained, and monitored by people.")).toBeVisible();

  await page.getByRole("button", { name: "Complete & Continue" }).click();
  await expect(page.getByRole("heading", { name: "Training & Awareness", level: 1 })).toBeVisible();
  await page.getByLabel("Learner").check();
  await page.getByLabel("Course").check();
  await page.getByLabel("Version").check();
  await page.getByLabel("Completion date").check();
  await page.getByLabel("Assessment result").check();
  await page.getByRole("button", { name: "Check Record" }).click();
  await expect(page.getByText("Required activity complete.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("gridguard.session"))).toBeTruthy();
  expect(await page.evaluate(() => localStorage.getItem("gridguard.sessions"))).toContain("learner@gridguard.local");
  await expect.poll(async () => page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("GridGuardDB");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<number>((resolve, reject) => {
      const request = database.transaction("scenarioAttempts", "readonly").objectStore("scenarioAttempts").getAll();
      request.onsuccess = () => resolve(request.result.length);
      request.onerror = () => reject(request.error);
    });
  })).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Training & Awareness", level: 1 })).toBeVisible();
  await expect(page.getByText("Required activity complete.")).toBeVisible();
});
