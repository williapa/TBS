const { test, expect } = require("@playwright/test");
const { actionScenarios } = require("./canonical-game");

const cell = (row, column, index, neighbors, unit, team) => ({
  row, column, index, neighbors, terrain: "plains", unit, team,
});

const baseMap = () => [[
  cell(0, 0, 0, [1, 2], "soldier", "purple"),
  cell(0, 1, 1, [0, 2, 3], "none", "gray"),
], [
  cell(1, 0, 2, [0, 1, 3, 5], "soldier", "orange"),
  cell(1, 1, 3, [1, 2, 4, 5, 6], "soldier", "orange"),
  cell(1, 2, 4, [3, 6], "soldier", "orange"),
], [
  cell(2, 0, 5, [2, 3, 6], "soldier", "purple"),
  cell(2, 1, 6, [3, 4, 5], "none", "gray"),
]];

const gatewayCall = (page, method, ...args) => page.evaluate(async ({ method, args }) => {
  const gateway = window.__TBS_E2E_GATEWAY__;
  if (!gateway) throw new Error("E2E gateway bridge is unavailable");
  return gateway[method](...args);
}, { method, args });

test("creator, challenger, and spectator complete a live game and all action families commit", async ({ browser }, testInfo) => {
  const logs = [];
  const contexts = [];
  const openClient = async (name, storage) => {
    const context = await browser.newContext();
    contexts.push(context);
    if (storage) await context.addInitScript((value) => localStorage.setItem("TBS.maps.v1", JSON.stringify(value)), storage);
    const page = await context.newPage();
    page.on("console", (message) => logs.push(`[${name}] console.${message.type()}: ${message.text()}`));
    page.on("pageerror", (error) => logs.push(`[${name}] pageerror: ${error.stack || error.message}`));
    return page;
  };

  const finishMap = baseMap();
  for (const candidate of finishMap.flat()) {
    candidate.unit = "none";
    candidate.team = "gray";
  }
  finishMap[0][0].unit = "zuckerbird";
  finishMap[0][0].team = "purple";
  finishMap[0][1].unit = "capital";
  finishMap[0][1].team = "orange";
  finishMap[1][0].unit = "soldier";
  finishMap[1][0].team = "orange";
  finishMap[2][1].unit = "capital";
  finishMap[2][1].team = "purple";
  const storage = {
    repositoryVersion: 1,
    maps: [{ schemaVersion: 1, id: "quick-finish", name: "Quick finish", map: finishMap }],
  };

  try {
    const creator = await openClient("creator", storage);
    const challenger = await openClient("challenger");
    const spectator = await openClient("spectator");

    await creator.goto("/");
    await expect(creator.getByRole("heading", { name: "Start a game" })).toBeVisible();
    await creator.getByLabel("Display name").fill("Creator");
    await creator.getByRole("button", { name: /Map.*Default battlefield/ }).click();
    await creator.getByRole("option", { name: /Quick finish/ }).click();
    await creator.getByRole("button", { name: "Create game" }).click();
    const shareUrl = await creator.getByLabel("Share link").inputValue();
    const invitePath = new URL(shareUrl).pathname;
    await creator.getByRole("button", { name: "Open game" }).click();
    await expect(creator.getByRole("heading", { name: "Waiting for an opponent" })).toBeVisible();

    await challenger.goto(invitePath);
    await challenger.getByLabel("Display name").fill("Challenger");
    await challenger.getByRole("button", { name: "Join as player" }).click();
    await expect(challenger.getByRole("complementary", { name: "purple player" }))
      .toContainText("Challenger (you)");

    await spectator.goto(invitePath);
    await spectator.getByLabel("Display name").fill("Spectator");
    await spectator.getByRole("button", { name: "Watch as spectator" }).click();
    await expect(spectator.getByRole("heading", { name: "Game in progress" })).toBeVisible();
    await expect(spectator.getByRole("button", { name: "End turn" })).toHaveCount(0);
    await expect(spectator.getByText("Spectators online").locator("xpath=following-sibling::*[1]")).toHaveText("1");

    await challenger.getByRole("button", { name: "Use 3D board" }).click();
    await expect(challenger.getByRole("application", { name: /Three-dimensional game board/ })).toBeVisible();
    const keyboardCell = challenger.getByRole("button", { name: /Current cell:/ });
    await keyboardCell.press("ArrowRight");
    await keyboardCell.press("ArrowRight");
    const purpleAttacker = challenger.getByRole("button", { name: /Select Zuckerbird, purple team/ });
    await purpleAttacker.click();
    await purpleAttacker.click();
    await challenger.getByRole("button", { name: "Attack" }).click();
    await keyboardCell.press("ArrowRight");
    await keyboardCell.press("ArrowRight");
    await keyboardCell.press("ArrowRight");
    await keyboardCell.press("Enter");
    await challenger.getByRole("button", { name: "Confirm attack" }).click();
    await expect(challenger.getByRole("heading", { name: "Game finished" })).toBeVisible();
    await expect(creator.getByRole("heading", { name: "Game finished" })).toBeVisible();
    await expect(spectator.getByRole("heading", { name: "Game finished" })).toBeVisible();
    await expect(spectator.getByText("Winner").locator("xpath=following-sibling::*[1]")).toHaveText("purple");
    for (const page of [creator, challenger, spectator]) {
      const committedEvents = page.locator('[data-revision="1"]');
      await expect(committedEvents).toHaveCount(2);
      await expect(committedEvents.filter({ hasText: "Purple won the game!" })).toHaveCount(1);
    }
    const eventTableLayout = await spectator.locator("#events").evaluate((container) => {
      const table = container.querySelector("table");
      const header = container.querySelector("thead");
      if (!table || !header) throw new Error("events table is missing");
      const containerRect = container.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      return {
        containerWidth: containerRect.width,
        tableWidth: tableRect.width,
        headerWidth: headerRect.width,
        hasHorizontalOverflow: container.scrollWidth > container.clientWidth,
      };
    });
    expect(eventTableLayout.hasHorizontalOverflow).toBe(false);
    expect(eventTableLayout.tableWidth).toBeLessThanOrEqual(eventTableLayout.containerWidth);
    expect(eventTableLayout.headerWidth).toBeLessThanOrEqual(eventTableLayout.containerWidth);

    await gatewayCall(creator, "leave");
    await gatewayCall(challenger, "leave");
    await gatewayCall(spectator, "leave");

    const committed = [];
    const cases = actionScenarios();
    for (let index = 0; index < cases.length; index += 1) {
      const entry = cases[index];
      const created = await gatewayCall(creator, "createGame", {
        displayName: `Creator ${index}`,
        initialState: entry.state,
      });
      await gatewayCall(challenger, "joinGame", created.inviteToken, "player", `Challenger ${index}`);
      const result = await gatewayCall(challenger, "submitAction", {
        gameId: created.gameId,
        envelope: {
          protocolVersion: 2,
          actionId: `39000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
          expectedRevision: 0,
          rulesetVersion: "standard@1",
          action: entry.action,
        },
      });
      expect(result.ok).toBe(true);
      expect(result.snapshot.state.revision).toBe(1);
      committed.push(result.appliedAction.action.type);
      await gatewayCall(creator, "leave");
      await gatewayCall(challenger, "leave");
    }
    expect(committed).toEqual(["end-turn", "move", "attack", "boost", "heal", "spawn", "construct", "load", "unload"]);
  } finally {
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach("browser-logs", { body: logs.join("\n"), contentType: "text/plain" });
    }
    for (const context of contexts) await context.close().catch(() => undefined);
  }
});
