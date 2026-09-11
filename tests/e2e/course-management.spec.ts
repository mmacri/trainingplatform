import { expect, test } from "./support/fixtures";
import { loginAs, switchPersona } from "./support/auth";

test("course manager creates a course and opens the lifecycle workspace", async ({ page }) => {
  await loginAs(page, "manager");
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
  await loginAs(page, "manager");
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
  await loginAs(page, "manager");
  await page.getByRole("link", { name: /Course Management/ }).click();
  await page.getByRole("link", { name: /CIP-005 — Electronic Security Perimeter Access/ }).click();
  await page.getByRole("button", { name: "review", exact: true }).click();
  await page.getByRole("button", { name: "Mark Resolved" }).first().click();
  await expect(page.getByText("Approved").first()).toBeVisible();
  await page.getByRole("button", { name: "Resubmit for Review" }).click();
  await switchPersona(page, /Morgan/, "compliance");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Course approved")).toBeVisible();
});

test("approved course publishes and can be assigned", async ({ page }) => {
  await loginAs(page, "manager");
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
  await loginAs(page, "learner");
  await page.goto("/#/build");
  await expect(page.getByRole("heading", { name: "Access Restricted" })).toBeVisible();
  await expect(page.getByText("Course Management")).toBeVisible();
});
