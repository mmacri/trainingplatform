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

test("Taylor resumes the flagship CIP-004 course and completes the role-change activity", async ({ page }) => {
  await login(page, "learner@gridguard.local");
  await page.getByRole("link", { name: /My Learning/ }).click();
  await expect(page.getByRole("heading", { name: /NERC CIP-004 Personnel Security & Training/ })).toBeVisible();
  await page.locator('a[href^="#/learn/course-cip004-annual-refresher/"]').click();

  await expect(page.getByRole("heading", { name: "Transfers, Promotions & Role Changes", level: 1 })).toBeVisible();
  await expect(page.getByText("Keep, Review, or Remove?")).toBeVisible();
  await page.getByRole("combobox", { name: "Access needed for the employee's new responsibilities" }).selectOption({ label: "KEEP" });
  await page.getByRole("combobox", { name: "Elevated access used only by the employee's previous team" }).selectOption({ label: "REMOVE" });
  await page.getByRole("combobox", { name: "Temporary project access with an end date that has passed" }).selectOption({ label: "REMOVE" });
  await page.getByRole("combobox", { name: "Standard company email access still required in the new role" }).selectOption({ label: "KEEP" });
  await page.getByRole("button", { name: "Check Record" }).click();
  await expect(page.getByText("Required activity complete.")).toBeVisible();

  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByText("Required activity complete.")).toBeVisible();
  await page.getByRole("link", { name: /Final Assessment/ }).click();
  await expect(page.getByRole("heading", { name: "Final Assessment Locked" })).toBeVisible();
});
