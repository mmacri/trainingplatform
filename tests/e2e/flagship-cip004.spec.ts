import { expect, test } from "./support/fixtures";
import { loginAs } from "./support/auth";

test("Taylor resumes the flagship CIP-004 course and completes the role-change activity", async ({ page }) => {
  await loginAs(page, "learner");
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
