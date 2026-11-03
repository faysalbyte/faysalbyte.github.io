
const { test, expect } = require("@playwright/test");

test("homepage loads successfully", async ({ page }) => {
  const pageErrors = [];

  page.on("pageerror", error => {
    pageErrors.push(error.message);
  });

  await page.goto("/");

  await expect(page).toHaveTitle(/Faysal/i);
  await expect(page.locator("body")).toBeVisible();

  expect(pageErrors).toEqual([]);
});
