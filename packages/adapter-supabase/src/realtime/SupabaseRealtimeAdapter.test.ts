import { createActiveGameSnapshot } from "@TBS/common";
import { expect, test, vi } from "vitest";

import { SupabaseGameClient } from "../SupabaseGameClient";

class FakeChannel {
  removed = false;
  untracked = 0;
  on() { return this; }
  subscribe(callback: (status: string) => void) { callback("SUBSCRIBED"); return this; }
  async untrack() { this.untracked += 1; return "ok"; }
  presenceState() { return {}; }
}

test("keeps exactly one Realtime channel for a game in one client", async () => {
  const channels: FakeChannel[] = [];
  const client = {
    realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
    channel: vi.fn(() => {
      const channel = new FakeChannel();
      channels.push(channel);
      return channel;
    }),
    removeChannel: vi.fn(async (channel: FakeChannel) => {
      channel.removed = true;
      return "ok";
    }),
  };
  const gameClient = new SupabaseGameClient(
    client as never,
    { getIdentity: async () => ({ userId: "member" }) },
  );
  vi.spyOn(gameClient.sessions, "getSnapshot")
    .mockResolvedValue({ ...createActiveGameSnapshot(), gameId: "game" });

  const first = await gameClient.subscribe("game", vi.fn(), vi.fn());
  expect(channels.filter(({ removed }) => !removed)).toHaveLength(1);
  const second = await gameClient.subscribe("game", vi.fn(), vi.fn());
  expect(channels).toHaveLength(2);
  expect(channels[0]).toMatchObject({ removed: true, untracked: 1 });
  expect(channels.filter(({ removed }) => !removed)).toHaveLength(1);

  await first();
  expect(channels.filter(({ removed }) => !removed)).toHaveLength(1);
  await second();
  expect(channels.filter(({ removed }) => !removed)).toHaveLength(0);
});
