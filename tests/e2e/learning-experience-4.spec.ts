import { expect, test } from "./support/fixtures";
import { loginAs } from "./support/auth";

test("learner can open North Valley context, reference mode, and scenario series", async ({ page }) => {
  await loginAs(page, "learner");

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
