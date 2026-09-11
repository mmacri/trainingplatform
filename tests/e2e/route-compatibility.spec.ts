import { expect, test } from "./support/fixtures";
import { loginAs, switchPersona } from "./support/auth";

test("learner deep routes continue to render after refactor", async ({ page }) => {
  await loginAs(page, "learner");

  const routes = [
    { href: "/#/home", heading: /Welcome|Next Step|Learning Operations/i },
    { href: "/#/learning", heading: /My Learning|Learn/i },
    { href: "/#/practice", heading: /Practice/i },
    { href: "/#/scenarios", heading: /Scenario Lab/i },
    { href: "/#/skills", heading: /My Skills|Skills/i },
    { href: "/#/progress", heading: /Progress|Activity|Certificates/i },
    { href: "/#/resources", heading: /Resources/i },
    { href: "/#/environment", heading: /North Valley|Environment/i },
    { href: "/#/programs/program-cybersecurity-operations-readiness", heading: /Cybersecurity Operations Readiness/i }
  ];

  for (const route of routes) {
    await page.goto(route.href);
    await expect(page.getByText("Access Restricted")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  }
});

test("manager and compliance deep routes continue to render after refactor", async ({ page }) => {
  await loginAs(page, "manager");

  for (const route of [
    { href: "/#/build", heading: /Course Management|Content Operations/i },
    { href: "/#/build/quality", heading: /Course Quality/i },
    { href: "/#/team", heading: /Team Learning|Learning Operations|Coaching/i }
  ]) {
    await page.goto(route.href);
    await expect(page.getByText("Access Restricted")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  }

  await switchPersona(page, /Morgan/i, "compliance");
  for (const route of [
    { href: "/#/compliance", heading: /Compliance/i },
    { href: "/#/standards", heading: /Standards/i }
  ]) {
    await page.goto(route.href);
    await expect(page.getByText("Access Restricted")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible();
  }
});
