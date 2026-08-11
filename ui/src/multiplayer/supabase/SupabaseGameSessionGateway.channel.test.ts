import { createActiveGameSnapshot } from "@TBS/common";
import { SupabaseGameSessionGateway } from "./SupabaseGameSessionGateway";

class FakeChannel {
  removed = false;
  untracked = 0;
  on() { return this; }
  subscribe(callback: (status: string) => void) { callback("SUBSCRIBED"); return this; }
  async untrack() { this.untracked += 1; return "ok"; }
  presenceState() { return {}; }
}

test("keeps exactly one Realtime channel for a game in one gateway tab", async () => {
  const channels: FakeChannel[] = [];
  const client = {
    realtime: { setAuth: jest.fn().mockResolvedValue(undefined) },
    channel: jest.fn(() => {
      const channel = new FakeChannel();
      channels.push(channel);
      return channel;
    }),
    removeChannel: jest.fn(async (channel: FakeChannel) => { channel.removed = true; return "ok"; }),
  };
  const gateway = new SupabaseGameSessionGateway(
    client as never,
    { getIdentity: async () => ({ userId: "member" }) }
  );
  jest.spyOn(gateway, "getSnapshot").mockResolvedValue({ ...createActiveGameSnapshot(), gameId: "game" });

  const first = await gateway.subscribe("game", jest.fn(), jest.fn());
  expect(channels.filter((channel) => !channel.removed)).toHaveLength(1);
  const second = await gateway.subscribe("game", jest.fn(), jest.fn());
  expect(channels).toHaveLength(2);
  expect(channels[0]).toMatchObject({ removed: true, untracked: 1 });
  expect(channels.filter((channel) => !channel.removed)).toHaveLength(1);

  await first();
  expect(channels.filter((channel) => !channel.removed)).toHaveLength(1);
  await second();
  expect(channels.filter((channel) => !channel.removed)).toHaveLength(0);
});
