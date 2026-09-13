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
  await expect(page.getByRole("group", { name: "Board view" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Create game" })).toBeDisabled();
  await page.getByRole("button", { name: "Test mode" }).click();

  await expect(page.getByRole("heading", { name: "Solo test game" })).toBeVisible();
  const detailsPanel = page.getByRole("region", { name: "Game details" });
  const boardViewToggle = detailsPanel.getByRole("group", { name: "Board view" });
  await expect(boardViewToggle).toBeVisible();
  await expect(boardViewToggle.getByRole("button", { name: "Use 2D board" }))
    .toHaveAttribute("aria-pressed", "false");
  await expect(boardViewToggle.getByRole("button", { name: "Use 3D board" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("application", { name: /Three-dimensional game board/ }))
    .toBeVisible();
  await expect(page.locator(".game.special-panel").getByRole("group", { name: "Board view" }))
    .toHaveCount(0);
  await expect(detailsPanel.getByRole("toolbar", { name: "3D camera controls" }))
    .toBeVisible();
  await expect(detailsPanel.getByRole("region", { name: "Keyboard board controls" }))
    .toBeVisible();
  await expect(page.locator(".game.special-panel").getByRole("toolbar", { name: "3D camera controls" }))
    .toHaveCount(0);
  await boardViewToggle.getByRole("button", { name: "Use 2D board" }).click();
  await expect(detailsPanel.getByRole("toolbar", { name: "3D camera controls" }))
    .toHaveCount(0);
  await expect(detailsPanel.getByRole("region", { name: "Keyboard board controls" }))
    .toHaveCount(0);
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
