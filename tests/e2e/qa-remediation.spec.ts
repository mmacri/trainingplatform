import { expect, test } from "./support/fixtures";
import { loginAs } from "./support/auth";

test("learner can open review-demo courses that remain required by programs", async ({ page }) => {
  await loginAs(page, "learner");

  const courses = [
    { id: "course-cip005-esp-access", title: /Electronic Security Perimeter Access|CIP-005/i },
    { id: "course-cip008-incident-response", title: /Incident Response Fundamentals|CIP-008/i }
  ];

  for (const course of courses) {
    await page.goto(`/#/courses/${course.id}`);
    await expect(page.getByText("Access Restricted")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: course.title }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Start Course|Resume Course|Continue Course|Start Learning|Resume Learning/i }).first()).toBeVisible();
  }

  await page.goto("/#/programs/program-cybersecurity-operations-readiness");
  await expect(page.getByRole("heading", { name: "Cybersecurity Operations Readiness" })).toBeVisible();
  await expect(page.getByText("CIP-005").first()).toBeVisible();
  await expect(page.getByText("CIP-008").first()).toBeVisible();
});

test("global search and Course Quality dashboard expose remediation signals", async ({ page }) => {
  await loginAs(page, "manager");

  await page.getByLabel("Search").last().click();
  await page.getByPlaceholder("Search courses, lessons, practice, scenarios, resources, skills...").fill("patch");
  await expect(page.getByText(/Patch Management|Patch Constraint|CIP-007/i).first()).toBeVisible();

  await page.goto("/#/build/quality");
  await expect(page.getByRole("heading", { name: "Course Quality" })).toBeVisible();
  await expect(page.getByRole("link", { name: /CIP-005|Electronic Security/i }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /CIP-008|Incident Response/i }).first()).toBeVisible();
  await expect(page.getByText("BLOCKED")).toHaveCount(0);
});

test("header controls meet 44px touch target minimum on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await loginAs(page, "learner");

  const controls = [
    page.getByLabel("Open navigation"),
    page.getByLabel("Notifications"),
    page.getByLabel("Search")
  ];

  for (const control of controls) {
    const box = await control.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});
