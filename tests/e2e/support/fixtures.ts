import { test as base } from "@playwright/test";
import { resetGridGuardBrowserData } from "./database";

export const test = base.extend({
  page: async ({ page }, use) => {
    await resetGridGuardBrowserData(page);
    await use(page);
  }
});

export { expect } from "@playwright/test";
