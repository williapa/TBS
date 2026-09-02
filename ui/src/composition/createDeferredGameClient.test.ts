import type { GameClient } from "@TBS/application";
import { describe, expect, it, vi } from "vitest";

import { createDeferredGameClient, type GameClientLoader } from "./createDeferredGameClient";

const clientWith = (leave: GameClient["leave"]): GameClient => ({
  createGame: vi.fn(),
  getActions: vi.fn(),
  getInvitePreview: vi.fn(),
  getSnapshot: vi.fn(),
  joinGame: vi.fn(),
  leave,
  submitAction: vi.fn(),
  subscribe: vi.fn(),
  updatePresence: vi.fn(),
});

describe("createDeferredGameClient", () => {
  it("does not load multiplayer infrastructure when an unused client is disposed", async () => {
    const load = vi.fn<GameClientLoader>();
    const deferred = createDeferredGameClient(load);

    await deferred.leave();

    expect(load).not.toHaveBeenCalled();
  });

  it("loads once on the first multiplayer operation and then delegates disposal", async () => {
    const leave = vi.fn<GameClient["leave"]>();
    const client = clientWith(leave);
    const load = vi.fn(async () => client);
    const deferred = createDeferredGameClient(load);

    await deferred.getActions("game", 0);
    await deferred.getActions("game", 1);
    await deferred.leave();

    expect(load).toHaveBeenCalledOnce();
    expect(client.getActions).toHaveBeenCalledTimes(2);
    expect(leave).toHaveBeenCalledOnce();
  });
});
