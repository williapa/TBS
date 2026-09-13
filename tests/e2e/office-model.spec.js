const { test, expect } = require("@playwright/test");

const cell = (row, column, index, neighbors, unit, team) => ({
  row, column, index, neighbors, terrain: "plains", unit, team,
});

test("the office remains selectable through its 3D model and after camera rotation", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((maps) => localStorage.setItem("TBS.maps.v1", JSON.stringify(maps)), {
    repositoryVersion: 1,
    maps: [{ schemaVersion: 1, id: "office-model", name: "Office model", map: [
      [cell(0, 0, 0, [1, 2], "soldier", "purple"), cell(0, 1, 1, [0, 2, 3], "soldier", "orange")],
      [cell(1, 0, 2, [0, 1, 3, 5], "office", "orange"), cell(1, 1, 3, [1, 2, 4, 5, 6], "office", "purple"), cell(1, 2, 4, [3, 6], "house", "orange")],
      [cell(2, 0, 5, [2, 3, 6], "none", "gray"), cell(2, 1, 6, [3, 4, 5], "none", "gray")],
    ] }],
  });
  await page.goto("/game/new");
  await page.getByRole("button", { name: /Map.*Default battlefield/ }).click();
  await page.getByRole("option", { name: /Office model/ }).click();
  await page.getByRole("button", { name: "Test mode" }).click();
  const board = page.getByRole("application", { name: /Three-dimensional game board/ });
  const canvas = board.locator("canvas");
  await expect(canvas).toBeVisible();

  const clickOffice = async () => {
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error("The 3D canvas must have a visible area");
    const scale = Math.max(28, Math.min(bounds.width, bounds.height) * 0.075);
    await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 - scale * 0.5 } });
  };
  await expect(async () => {
    await clickOffice();
    await expect(page.locator(".game-panel__value").getByText("Office", { exact: true })).toBeVisible();
  }).toPass();
  await clickOffice();
  await expect(page.getByRole("button", { name: "Spawn", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Rotate camera clockwise" }).click();
  await clickOffice();
  await expect(page.locator(".game-panel__value").getByText("Office", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Spawn", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Zoom camera in" }).click();
  }
  await testInfo.attach("office-model-rotated", { body: await board.screenshot(), contentType: "image/png" });
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Rotate camera clockwise" }).click();
  }
  await testInfo.attach("office-model-front", { body: await board.screenshot(), contentType: "image/png" });
  await page.getByRole("button", { name: "2D Board" }).click();
  await expect(page.getByRole("button", { name: /Office, purple team/ })).toBeVisible();
  await page.getByRole("button", { name: "3D Board" }).click();
  await expect(canvas).toBeVisible();
  await expect(async () => {
    await clickOffice();
    await expect(page.locator(".game-panel__value").getByText("Office", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Spawn", exact: true })).toBeVisible();
  }).toPass();
  expect(errors).toEqual([]);
});
