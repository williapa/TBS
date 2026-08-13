import {
  buildAttackAction,
  buildBoostAction,
  buildConstructAction,
  buildHealAction,
  buildLoadAction,
  buildMoveAction,
  buildSpawnAction,
  buildUnloadAction,
  createInitialGameInteractionState,
  gameInteractionReducer,
} from "@TBS/presentation";
import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import type { GameAction } from "@TBS/common";
import type {
  BuildingType,
  HexMap,
  MapItem,
  SpawnableUnitType,
  TeamType,
  UnitTypes,
} from "../../types";
import type { GameInteractionState } from "@TBS/presentation";

const cell = (
  index: number,
  column: number,
  unit: UnitTypes | string = "none",
  team: TeamType | string = "gray"
): MapItem => ({
  column,
  index,
  neighbors: [],
  row: 0,
  team: team as TeamType,
  terrain: "plains",
  unit: unit as UnitTypes,
});

const map: HexMap = [
  [cell(0, 0, "soldier", "orange"), cell(1, 1), cell(2, 2, "soldier", "purple")],
];
const position = { left: 10, top: 20 };

const actionOrThrow = (action: GameAction | null): GameAction => {
  if (!action) throw new Error("expected action builder to return an action");
  return action;
};

const stateWith = (values: Partial<GameInteractionState>): GameInteractionState => ({
  ...createInitialGameInteractionState(),
  ...values,
});

describe("game interaction characterization", () => {
  test("select, target, and confirm flow builds an ordinary move", () => {
    const selected = gameInteractionReducer(createInitialGameInteractionState(), {
      type: "SELECT_ACTOR",
      unit: map[0][0],
      position,
      map,
      availableFunds: 0,
    });
    const targeted = gameInteractionReducer(selected, {
      type: "CHOOSE_MOVE_TARGET",
      cell: map[0][1],
      position,
      map,
      perspective: "orange",
    });

    expect(selected.mode).toBe("unitSelected");
    expect(targeted.mode).toBe("actionMenu");
    expect(buildMoveAction(targeted)).toEqual({
      action: "move",
      end: { x: 0, y: 1 },
      start: { x: 0, y: 0 },
    });
  });

  test("target and confirm flow builds an attack after movement", () => {
    const selectedTarget = gameInteractionReducer(
      stateWith({
        origin: { x: 0, y: 0 },
        previewDestination: { x: 0, y: 1 },
        selectedUnit: map[0][0],
        pendingAction: "attack",
        mode: "targetingAttack",
      }),
      { type: "SELECT_ATTACK_TARGET", cell: map[0][2], position }
    );

    expect(selectedTarget.menu?.options[0].id).toBe("confirmAttack");
    expect(buildAttackAction(selectedTarget)).toEqual({
      action: "attack",
      attacker: { x: 0, y: 0 },
      defender: { x: 0, y: 2 },
      end: { x: 0, y: 1 },
    });
  });

  test("action builders preserve every legacy action family", () => {
    const origin = { x: 1, y: 1 };
    const end = { x: 1, y: 2 };
    const target = { x: 1, y: 3 };
    const base = stateWith({ origin, previewDestination: end });

    const actions: GameAction[] = [
      { action: "end" },
      actionOrThrow(buildMoveAction(base)),
      actionOrThrow(buildAttackAction({ ...base, selectedAttackTarget: target })),
      actionOrThrow(buildBoostAction({ ...base, selectedBoostTarget: target })),
      actionOrThrow(buildHealAction({ ...base, selectedHealTarget: target })),
      actionOrThrow(buildConstructAction({
        ...base,
        selectedConstructBuilding: "office" as BuildingType,
        selectedConstructTarget: target,
      })),
      actionOrThrow(buildLoadAction({ ...base, selectedLoadVehicle: target })),
      actionOrThrow(buildSpawnAction({ ...base, selectedSpawnUnit: "soldier" as SpawnableUnitType })),
      actionOrThrow(buildUnloadAction({ ...base, selectedUnloadTarget: target })),
    ];

    expect(actions).toEqual([
      { action: "end" },
      { action: "move", start: origin, end },
      { action: "attack", attacker: origin, defender: target, end },
      { action: "boost", start: origin, end, target },
      { action: "heal", start: origin, end, target },
      { action: "construct", worker: origin, end, cell: target, building: "office" },
      { action: "load", start: origin, end, vehicle: target },
      { action: "spawn", building: origin, end, unit: "soldier" },
      { action: "unload", start: origin, end, cell: target },
    ]);
    expect(actions.map((action, index) => createActionEnvelope(7, action, `action-${index}`))).toEqual(
      actions.map((action, index) => ({
        protocolVersion: 1,
        actionId: `action-${index}`,
        expectedRevision: 7,
        action,
      }))
    );
  });

  test("projectile confirmation keeps its object target on the move action", () => {
    const state = stateWith({
      origin: { x: 0, y: 0 },
      pendingAction: "missile",
      previewDestination: { x: 0, y: 1 },
      selectedAttackTarget: { x: 0, y: 2 },
    });

    expect(buildMoveAction(state)).toEqual({
      action: "move",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      objectTarget: { x: 0, y: 2 },
    });
  });

  test("cancel and reset-after-server-event clear the entire interaction", () => {
    const active = stateWith({
      mode: "actionMenu",
      origin: { x: 0, y: 0 },
      pendingAction: "move",
      previewDestination: { x: 0, y: 1 },
      selectedUnit: map[0][0],
    });

    expect(gameInteractionReducer(active, { type: "CANCEL_FLOW" })).toEqual(
      createInitialGameInteractionState()
    );
    expect(gameInteractionReducer(active, { type: "RESET_AFTER_SERVER_EVENT" })).toEqual(
      createInitialGameInteractionState()
    );
  });
});
