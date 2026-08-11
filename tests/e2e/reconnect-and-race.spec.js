const { test, expect } = require("@playwright/test");

const gatewayCall = (page, method, ...args) => page.evaluate(async ({ method, args }) => {
  const gateway = window.__TBS_E2E_GATEWAY__;
  if (!gateway) throw new Error("E2E gateway bridge is unavailable");
  return gateway[method](...args);
}, { method, args });

const revision = (page) => page.getByText("Revision", { exact: true }).locator("xpath=following-sibling::*[1]");

test("closed player tabs restore from durable state without clearing browser storage", async ({ browser }) => {
  const creatorContext = await browser.newContext();
  const challengerContext = await browser.newContext();
  let creator = await creatorContext.newPage();
  let challenger = await challengerContext.newPage();
  try {
    await creator.goto("/");
    await creator.getByLabel("Display name").fill("Durable creator");
    await creator.getByRole("button", { name: "Create game" }).click();
    const invitePath = new URL(await creator.getByLabel("Share link").inputValue()).pathname;
    await creator.getByRole("link", { name: "Open game" }).click();
    await expect(creator.getByRole("heading", { name: "Waiting for an opponent" })).toBeVisible();

    await challenger.goto(invitePath);
    await challenger.getByLabel("Display name").fill("Durable challenger");
    await challenger.getByRole("button", { name: "Join as player" }).click();
    await challenger.getByRole("button", { name: "End turn" }).click();
    await expect(revision(challenger)).toHaveText("1");
    await expect(revision(creator)).toHaveText("1");
    await expect(creator.locator('[data-revision="1"]')).toContainText("Purple ended their turn. Orange gained");

    await challenger.close();
    await creator.getByRole("button", { name: "End turn" }).click();
    await expect(revision(creator)).toHaveText("2");

    challenger = await challengerContext.newPage();
    await challenger.goto(invitePath);
    await expect(challenger.getByText("Playing as purple")).toBeVisible();
    await expect(revision(challenger)).toHaveText("2");
    await expect(challenger.locator('[data-revision="1"]')).toContainText("Purple ended their turn. Orange gained");
    await expect(challenger.locator('[data-revision="2"]')).toContainText("Orange ended their turn. Purple gained");

    await creator.close();
    await challenger.close();
    creator = await creatorContext.newPage();
    challenger = await challengerContext.newPage();
    await creator.goto(invitePath);
    await challenger.goto(invitePath);
    await expect(creator.getByText("Playing as orange")).toBeVisible();
    await expect(challenger.getByText("Playing as purple")).toBeVisible();
    await expect(revision(creator)).toHaveText("2");
    await expect(revision(challenger)).toHaveText("2");
  } finally {
    await creatorContext.close().catch(() => undefined);
    await challengerContext.close().catch(() => undefined);
  }
});

test("two same-member stale tabs commit once and exact action-ID retry is idempotent", async ({ browser }) => {
  const orangeContext = await browser.newContext();
  const identityContext = await browser.newContext();
  const orange = await orangeContext.newPage();
  const identityPage = await identityContext.newPage();
  let twinContext;
  try {
    await orange.goto("/");
    await identityPage.goto("/");
    await expect(orange.getByRole("heading", { name: "Start a game" })).toBeVisible();
    await expect(identityPage.getByRole("heading", { name: "Start a game" })).toBeVisible();
    const sharedIdentity = await identityContext.storageState();
    twinContext = await browser.newContext({ storageState: sharedIdentity });
    const twinPage = await twinContext.newPage();
    await twinPage.goto("/");
    await expect(twinPage.getByRole("heading", { name: "Start a game" })).toBeVisible();

    const initialMap = [[
      { row: 0, column: 0, index: 0, neighbors: [1], terrain: "plains", unit: "soldier", team: "orange" },
      { row: 0, column: 1, index: 1, neighbors: [0], terrain: "plains", unit: "soldier", team: "purple" },
    ]];
    const created = await gatewayCall(orange, "createGame", {
      displayName: "Race creator",
      initialPayload: { map: initialMap, money: { orange: 2000, purple: 2000 } },
      winCondition: "combat-elimination",
    });
    await gatewayCall(identityPage, "joinGame", created.inviteToken, "player", "Race challenger");
    await gatewayCall(twinPage, "joinGame", created.inviteToken, "player", "Race challenger");

    const requests = [
      {
        gameId: created.gameId,
        envelope: { protocolVersion: 1, actionId: "40000000-0000-4000-8000-000000000001", expectedRevision: 0, action: { action: "end" } },
      },
      {
        gameId: created.gameId,
        envelope: { protocolVersion: 1, actionId: "40000000-0000-4000-8000-000000000002", expectedRevision: 0, action: { action: "end" } },
      },
    ];
    const [first, second] = await Promise.all([
      gatewayCall(identityPage, "submitAction", requests[0]),
      gatewayCall(twinPage, "submitAction", requests[1]),
    ]);
    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    const rejected = first.ok ? second : first;
    expect(rejected).toMatchObject({ ok: false, error: { code: "stale-revision" } });

    const acceptedRequest = first.ok ? requests[0] : requests[1];
    const retryPage = first.ok ? twinPage : identityPage;
    const retry = await gatewayCall(retryPage, "submitAction", acceptedRequest);
    expect(retry).toMatchObject({ ok: true, snapshot: { state: { revision: 1 } } });
    const firstSnapshot = await gatewayCall(identityPage, "getSnapshot", created.gameId);
    const secondSnapshot = await gatewayCall(twinPage, "getSnapshot", created.gameId);
    const actions = await gatewayCall(identityPage, "getActions", created.gameId, 0);
    expect(firstSnapshot.state.revision).toBe(1);
    expect(secondSnapshot.state.revision).toBe(1);
    expect(actions).toHaveLength(1);
    expect(actions[0].actionId).toBe(acceptedRequest.envelope.actionId);
  } finally {
    await orangeContext.close().catch(() => undefined);
    await identityContext.close().catch(() => undefined);
    await twinContext?.close().catch(() => undefined);
  }
});
