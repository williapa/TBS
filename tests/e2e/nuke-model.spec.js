const { test, expect } = require("@playwright/test");

const cell = (row, column, index, neighbors, unit, team) => ({
  row, column, index, neighbors, terrain: "plains", unit, team,
});

test("the neutral nuke remains selectable across camera and renderer changes", async ({ page }, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((maps) => localStorage.setItem("TBS.maps.v1", JSON.stringify(maps)), {
    repositoryVersion: 1,
    maps: [{ schemaVersion: 1, id: "nuke-model", name: "Nuke model", map: [
      [cell(0, 0, 0, [1, 2], "soldier", "purple"), cell(0, 1, 1, [0, 2, 3], "soldier", "orange")],
      [cell(1, 0, 2, [0, 1, 3, 5], "missile", "gray"), cell(1, 1, 3, [1, 2, 4, 5, 6], "nuke", "gray"), cell(1, 2, 4, [3, 6], "money", "gray")],
      [cell(2, 0, 5, [2, 3, 6], "none", "gray"), cell(2, 1, 6, [3, 4, 5], "none", "gray")],
    ] }],
  });
  await page.goto("/game/new");
  await page.getByRole("button", { name: /Map.*Default battlefield/ }).click();
  await page.getByRole("option", { name: /Nuke model/ }).click();
  await page.getByRole("button", { name: "Test mode" }).click();
  const board = page.getByRole("application", { name: /Three-dimensional game board/ });
  const canvas = board.locator("canvas");
  await expect(canvas).toBeVisible();

  const selectNuke = async () => {
    // Select another entity first so an old nuke selection cannot mask a missed mesh hit.
    await page.getByRole("button", { name: "Select Missile, neutral", exact: true }).click();
    await expect(page.locator(".game-panel__value").getByText("Missile", { exact: true })).toBeVisible();
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error("The 3D canvas must have a visible area");
    const scale = Math.max(28, Math.min(bounds.width, bounds.height) * 0.075);
    await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 - scale * 0.5 } });
    await expect(page.locator(".game-panel__value").getByText("Nuke", { exact: true })).toBeVisible();
  };
  await expect(selectNuke).toPass();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Rotate camera clockwise" }).click();
  await selectNuke();
  await page.keyboard.press("Escape");
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Zoom camera in" }).click();
  }
  await testInfo.attach("nuke-model-rotated", { body: await board.screenshot({ path: testInfo.outputPath("nuke-model-rotated.png") }), contentType: "image/png" });
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: "Rotate camera clockwise" }).click();
  }
  await testInfo.attach("nuke-model-front", { body: await board.screenshot({ path: testInfo.outputPath("nuke-model-front.png") }), contentType: "image/png" });
  await page.getByRole("button", { name: "Use 2D board" }).click();
  await expect(page.getByRole("button", { name: "Nuke, neutral", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Use 3D board" }).click();
  await expect(canvas).toBeVisible();
  await expect(selectNuke).toPass();
  expect(errors).toEqual([]);
});
