import { createActiveGameSnapshot, GameAction, MapItem } from "@TBS/common";
import { createActionEnvelope } from "./createActionEnvelope";
import { GameSessionGateway } from "./GameSessionGateway";

type ActionGateway = Pick<GameSessionGateway, "createGame" | "joinGame" | "submitAction" | "leave">;
type Harness = { createGateway(): Promise<ActionGateway> | ActionGateway; cleanup?(): Promise<void> | void };

const cell = (row: number, column: number, index: number, neighbors: number[], unit: MapItem["unit"], team: MapItem["team"]): MapItem => ({
  row, column, index, neighbors, terrain: "plains", unit, team,
});

const baseMap = (): MapItem[][] => [[
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

const scenario = (action: GameAction, configure: (map: MapItem[][]) => void = () => {}) => {
  const map = baseMap();
  configure(map);
  return { action, map };
};

const scenarios = () => [
  scenario({ action: "end" }),
  scenario({ action: "move", start: { x: 0, y: 0 }, end: { x: 0, y: 1 } }),
  scenario({ action: "attack", attacker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, defender: { x: 1, y: 1 } }),
  scenario({ action: "boost", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, target: { x: 1, y: 1 } }, (map) => {
    map[0][0].unit = "bluesMusician"; map[1][1].team = "purple";
  }),
  scenario({ action: "heal", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, target: { x: 1, y: 1 } }, (map) => {
    map[0][0].unit = "doctor"; map[1][1].team = "purple"; map[1][1].damage = 10;
  }),
  scenario({ action: "spawn", building: { x: 0, y: 0 }, end: { x: 0, y: 1 }, unit: "soldier" }, (map) => {
    map[0][0].unit = "capital";
  }),
  scenario({ action: "construct", worker: { x: 0, y: 0 }, end: { x: 0, y: 1 }, cell: { x: 1, y: 1 }, building: "office" }, (map) => {
    map[0][0].unit = "constructionWorker"; map[1][1].unit = "none"; map[1][1].team = "gray";
  }),
  scenario({ action: "load", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, vehicle: { x: 1, y: 1 } }, (map) => {
    map[1][1].unit = "truck"; map[1][1].team = "purple";
  }),
  scenario({ action: "unload", start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, cell: { x: 0, y: 1 } }, (map) => {
    map[0][0].unit = "truck"; map[0][0].loadedUnit = { team: "purple", unit: "soldier" };
  }),
];

export const runGameSessionGatewayActionFamiliesContract = (
  name: string,
  createHarness: () => Harness,
  enabled = true
) => {
  (enabled ? describe : describe.skip)(`${name} action families contract`, () => {
    test("accepts all nine UI action families through the gateway", async () => {
      const harness = createHarness();
      const gateways: ActionGateway[] = [];
      try {
        const cases = scenarios();
        for (let index = 0; index < cases.length; index += 1) {
          const { action, map } = cases[index];
          const orange = await harness.createGateway();
          const purple = await harness.createGateway();
          gateways.push(orange, purple);
          const fixture = createActiveGameSnapshot().state;
          const created = await orange.createGame({
            displayName: `Orange ${index}`,
            initialPayload: { map, money: fixture.money },
            winCondition: "combat-elimination",
          });
          await purple.joinGame(created.inviteToken, "player", `Purple ${index}`);
          const result = await purple.submitAction({
            gameId: created.gameId,
            envelope: createActionEnvelope(0, action, `31000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`),
          });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.appliedAction.action.action).toBe(action.action);
            expect(result.snapshot.state.revision).toBe(1);
          }
        }
      } finally {
        await Promise.all(gateways.map((gateway) => gateway.leave()));
        await harness.cleanup?.();
      }
    }, 30_000);
  });
};
