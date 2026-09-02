const { test, expect } = require("@playwright/test");

test("test mode plays both teams without contacting Supabase", async ({ page }) => {
  const supabaseRequests = [];
  page.on("request", (request) => {
    if (request.url().startsWith("http://127.0.0.1:54321")) {
      supabaseRequests.push(request.url());
    }
  });

  await page.goto("/game/new");
  await expect(page.getByRole("heading", { name: "Start a game" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create game" })).toBeDisabled();
  await page.getByRole("button", { name: "Test mode" }).click();

  await expect(page.getByRole("heading", { name: "Solo test game" })).toBeVisible();
  await expect(page.getByRole("status"))
    .toHaveText("Purple turn — you control both teams");
  const purplePanel = page.getByRole("complementary", { name: "purple player" });
  await expect(purplePanel).toContainText("Local Purple");
  await purplePanel.getByRole("button", { name: "End turn" }).click();

  await expect(page.getByRole("status"))
    .toHaveText("Orange turn — you control both teams");
  const orangePanel = page.getByRole("complementary", { name: "orange player" });
  await expect(orangePanel).toContainText("Local Orange");
  await expect(orangePanel.getByRole("button", { name: "End turn" })).toBeVisible();
  await expect(page.getByText("Revision").locator("xpath=following-sibling::*[1]"))
    .toHaveText("1");
  expect(supabaseRequests).toEqual([]);

  await page.reload();
  await expect(page.getByRole("heading", { name: "No solo test game is active" })).toBeVisible();
  expect(supabaseRequests).toEqual([]);
});
