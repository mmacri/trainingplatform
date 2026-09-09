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

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("learner@gridguard.local");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: /Home/ }).first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetBrowserData(page);
});

test("learner can open North Valley context, reference mode, and scenario series", async ({ page }) => {
  await login(page);

  await page.goto("/#/environment");
  await expect(page.getByRole("heading", { name: "North Valley Energy" })).toBeVisible();
  await page.getByRole("button", { name: "Systems" }).click();
  await expect(page.getByText("OPS-SRV-12")).toBeVisible();

  await page.goto("/#/courses/course-cip007-system-security/reference");
  await expect(page.getByText("Use at Work: concise job aids")).toBeVisible();
  await expect(page.getByText("System Security Review Checklist")).toBeVisible();

  await page.goto("/#/scenarios");
  await expect(page.getByText("OPS-SRV-12 Investigation Series")).toBeVisible();
  await expect(page.getByRole("link", { name: /Unexpected Administrative Connection/ }).first()).toBeVisible();
});
