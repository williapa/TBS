const { test, expect } = require("@playwright/test");

const cell = (row, column, index, neighbors, unit, team) => ({
  row, column, index, neighbors, terrain: "plains", unit, team,
});

test("airplanes remain selectable through their 3D models across camera and renderer changes", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((maps) => localStorage.setItem("TBS.maps.v1", JSON.stringify(maps)), {
    repositoryVersion: 1,
    maps: [{ schemaVersion: 1, id: "airplane-model", name: "Airplane model", map: [
      [cell(0, 0, 0, [1, 2], "none", "gray"), cell(0, 1, 1, [0, 2, 3], "none", "gray")],
      [cell(1, 0, 2, [0, 1, 3, 5], "airplane", "orange"), cell(1, 1, 3, [1, 2, 4, 5, 6], "airplane", "purple"), cell(1, 2, 4, [3, 6], "helicopter", "purple")],
      [cell(2, 0, 5, [2, 3, 6], "none", "gray"), cell(2, 1, 6, [3, 4, 5], "none", "gray")],
    ] }],
  });
  await page.goto("/game/new");
  await page.getByRole("button", { name: /Map.*Default battlefield/ }).click();
  await page.getByRole("option", { name: /Airplane model/ }).click();
  await page.getByRole("button", { name: "Test mode" }).click();
  const board = page.getByRole("application", { name: /Three-dimensional game board/ });
  const canvas = board.locator("canvas");
  await expect(canvas).toBeVisible();

  const clickAirplane = async () => {
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error("The 3D canvas must have a visible area");
    const scale = Math.max(28, Math.min(bounds.width, bounds.height) * 0.075);
    await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 - scale * 0.5 } });
  };
  await expect(async () => {
    await clickAirplane();
    await expect(page.locator(".game-panel__value").getByText("Airplane", { exact: true })).toBeVisible();
  }).toPass();
  await clickAirplane();
  await expect(page.getByRole("button", { name: "Attack", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Rotate camera clockwise" }).click();
  await clickAirplane();
  await expect(page.locator(".game-panel__value").getByText("Airplane", { exact: true })).toBeVisible();
  await clickAirplane();
  await expect(page.getByRole("button", { name: "Attack", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Zoom camera in" }).click();
  }
  await testInfo.attach("airplane-model-rotated", { body: await board.screenshot({ path: testInfo.outputPath("airplane-model-rotated.png") }), contentType: "image/png" });
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Rotate camera clockwise" }).click();
  }
  await testInfo.attach("airplane-model-front", { body: await board.screenshot({ path: testInfo.outputPath("airplane-model-front.png") }), contentType: "image/png" });
  await page.getByRole("button", { name: "Use 2D board" }).click();
  await expect(page.getByRole("button", { name: /^Airplane, purple team/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Airplane, orange team/ })).toBeVisible();
  await page.getByRole("button", { name: "Use 3D board" }).click();
  await expect(canvas).toBeVisible();
  await expect(async () => {
    await clickAirplane();
    await expect(page.locator(".game-panel__value").getByText("Airplane", { exact: true })).toBeVisible();
  }).toPass();
  expect(errors).toEqual([]);
});
