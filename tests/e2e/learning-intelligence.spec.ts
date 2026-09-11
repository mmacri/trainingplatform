import { expect, test } from "./support/fixtures";
import { loginAs } from "./support/auth";

test("learner completes practice and sees skill evidence", async ({ page }) => {
  await loginAs(page, "learner");
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
  await loginAs(page, "learner");
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
