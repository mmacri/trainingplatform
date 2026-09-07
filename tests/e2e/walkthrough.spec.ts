import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const password = "GridGuard-Local-2026!";

async function login(page: Page, email: string) {
  await page.goto("/#/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("GridGuard Learning").first()).toBeVisible();
}

test("administrator creates and assigns a restricted evidence course", async ({ page }) => {
  await page.goto("/");
  await login(page, "admin@gridguard.local");

  await page.getByRole("link", { name: /Administration/ }).click();
  await page.getByRole("link", { name: /Users/ }).click();
  await page.getByRole("button", { name: "New User" }).click();
  await page.getByRole("button", { name: "Save Jordan Lee" }).click();
  await expect(page.getByText("jordan.lee@gridguard.local")).toBeVisible();

  await page.getByRole("link", { name: /Course Studio/ }).click();
  await page.getByRole("button", { name: /New Course/ }).click();
  await page.getByRole("button", { name: /Generate Outline/ }).click();
  await expect(page.getByText("Evidence Foundations")).toBeVisible();
  await page.getByRole("button", { name: "Publish" }).click();

  await page.getByRole("link", { name: /Administration/ }).click();
  await page.getByRole("link", { name: /Assignments/ }).click();
  await page.getByRole("button", { name: /Assign Jordan Evidence Course/ }).click();
  await expect(page.getByText("NERC CIP Evidence Fundamentals").first()).toBeVisible();

  await page.getByRole("button", { name: /Avery/ }).click();
  await page.getByTestId("switch-jordan.lee@gridguard.local").getByRole("button", { name: "Switch" }).click();
  await page.getByRole("link", { name: /My Learning/ }).click();
  await expect(page.getByText("NERC CIP Evidence Fundamentals")).toBeVisible();

  await page.getByText("NERC CIP Evidence Fundamentals").first().click();
});
