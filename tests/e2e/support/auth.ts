import { expect, type Page } from "@playwright/test";
import { DEMO_PASSWORD, personaEmails, type TestPersona } from "./personas";

export async function loginAs(page: Page, personaOrEmail: TestPersona | string = "learner") {
  const email = personaOrEmail in personaEmails ? personaEmails[personaOrEmail as TestPersona] : personaOrEmail;
  await page.goto("/");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("link", { name: /Home/ }).first()).toBeVisible();
}

export async function switchPersona(page: Page, currentVisibleName: RegExp, target: TestPersona | string) {
  const email = target in personaEmails ? personaEmails[target as TestPersona] : target;
  await page.locator("header").getByRole("button", { name: currentVisibleName }).click();
  await page.getByTestId(`switch-${email}`).getByRole("button", { name: "Switch" }).click();
  await expect(page.getByText("Demo user switched")).toBeVisible();
}
