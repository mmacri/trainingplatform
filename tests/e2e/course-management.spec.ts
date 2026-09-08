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

async function switchTo(page: Page, visibleName: RegExp, email: string) {
  await page.locator("header").getByRole("button", { name: visibleName }).click();
  await page.getByTestId(`switch-${email}`).getByRole("button", { name: "Switch" }).click();
  await expect(page.getByText("Demo user switched")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await resetBrowserData(page);
});

test("course manager creates a course and opens the lifecycle workspace", async ({ page }) => {
  await login(page, "manager@gridguard.local");
  await page.getByRole("link", { name: /Course Management/ }).click();
  await expect(page.getByRole("heading", { name: "Course Management" })).toBeVisible();
  await page.getByRole("link", { name: /Create Course/ }).click();
  await page.getByLabel("Short Description").fill("Learn how high-quality NERC CIP training evidence supports repeatable compliance-readiness activities.");
  for (let index = 0; index < 5; index += 1) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create Course & Open Studio" }).click();
  await expect(page.getByRole("heading", { name: "NERC CIP Evidence Management Essentials" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Curriculum" })).toBeVisible();
});

test("curriculum builder edits persist after reload", async ({ page }) => {
  await login(page, "manager@gridguard.local");
  await page.getByRole("link", { name: /Course Management/ }).click();
  await page.getByRole("link", { name: /CIP-004 — Supervisor & Access Owner Workshop/ }).click();
  await page.getByRole("button", { name: "curriculum" }).click();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Module name");
    await dialog.accept("Evidence Foundations");
  });
  await page.getByRole("button", { name: "+ Module" }).click();
  await expect(page.getByText("Evidence Foundations")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Evidence Foundations")).toBeVisible();
});

test("reviewer requests changes and course manager resolves them", async ({ page }) => {
  await login(page, "manager@gridguard.local");
  await page.getByRole("link", { name: /Course Management/ }).click();
  await page.getByRole("link", { name: /CIP-005 — Electronic Security Perimeter Access/ }).click();
  await page.getByRole("button", { name: "review", exact: true }).click();
  await page.getByRole("button", { name: "Mark Resolved" }).first().click();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await page.getByRole("button", { name: "Resubmit for Review" }).click();
  await switchTo(page, /Morgan/, "compliance@gridguard.local");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Course approved")).toBeVisible();
});

test("approved course publishes and can be assigned", async ({ page }) => {
  await login(page, "manager@gridguard.local");
  await page.getByRole("link", { name: /Course Management/ }).click();
  await page.getByRole("link", { name: /CIP-008 — Incident Response Fundamentals/ }).click();
  await page.getByRole("button", { name: "Publish" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish Version 1.0" }).click();
  await expect(page.getByRole("heading", { name: "Course Published" })).toBeVisible();
  await page.getByRole("link", { name: "Assign Learners" }).click();
  await page.getByText("Operations — TEAM").click();
  for (let index = 0; index < 3; index += 1) await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Assign Training" }).click();
  await expect(page.getByRole("heading", { name: "Training Assigned" })).toBeVisible();
  await page.getByRole("link", { name: "Monitor Progress" }).click();
  await expect(page.getByRole("button", { name: "analytics" })).toBeVisible();
});

test("role restrictions keep learner out of Course Management", async ({ page }) => {
  await login(page, "learner@gridguard.local");
  await page.goto("/#/build");
  await expect(page.getByRole("heading", { name: "Access Restricted" })).toBeVisible();
  await expect(page.getByText("Course Management")).toBeVisible();
});
