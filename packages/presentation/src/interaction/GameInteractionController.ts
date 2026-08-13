import type {
  BuildingUnitOption,
  Coords,
  GameAction,
  MapItem,
  SpawnableUnitOption,
} from "@TBS/common";
import { axialToLegacyOffset, hexKey, legacyOffsetToAxial } from "@TBS/game-core";

import { entityIdForMapItem } from "../animation/cues";
import type { BoardInteractionView } from "../board/contracts";
import type { GameInteractionContext, GameInteractionState, GameMenuActionId } from "./contracts";
import {
  buildAttackAction,
  buildBoostAction,
  buildConstructAction,
  buildHealAction,
  buildLoadAction,
  buildMoveAction,
  buildSpawnAction,
  buildUnloadAction,
  gameInteractionReducer,
  getSelectableUnit,
  getTargetedCellIndexes,
  getTargetType,
} from "./gameInteraction";
import type { BoardIntent } from "./intents";

export type GameInteractionResult = Readonly<{
  state: GameInteractionState;
  command?: GameAction;
  inspectedCell?: Coords | null;
}>;

const sameCoords = (left: Coords | null, right: Coords): boolean =>
  Boolean(left && left.x === right.x && left.y === right.y);

const reduced = (
  state: GameInteractionState,
  action: Parameters<typeof gameInteractionReducer>[1],
): GameInteractionResult => ({ state: gameInteractionReducer(state, action) });

const selectMapItem = (
  state: GameInteractionState,
  mapItem: MapItem,
  context: GameInteractionContext,
): GameInteractionResult => {
  const inspectedCell = !context.active || !state.selectedUnit
    ? { x: mapItem.row, y: mapItem.column }
    : undefined;
  if (!context.active) return { state, inspectedCell };
  const position = context.menuPosition;

  if (state.pendingAction === "attack" && state.availableAttackTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_ATTACK_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (
    (state.pendingAction === "missile" || state.pendingAction === "nuke")
    && state.availableAttackTargets.includes(mapItem.index)
  ) {
    return { ...reduced(state, { type: "SELECT_OBJECT_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (state.pendingAction === "construct" && state.availableConstructTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_CONSTRUCT_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (state.pendingAction === "boost" && state.availableBoostTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_BOOST_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (state.pendingAction === "heal" && state.availableHealTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_HEAL_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (state.pendingAction === "load" && state.availableLoadTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_LOAD_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (state.pendingAction === "spawn" && state.availableSpawnTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_SPAWN_TARGET", cell: mapItem, position }), inspectedCell };
  }
  if (state.pendingAction === "unload" && state.availableUnloadTargets.includes(mapItem.index)) {
    return { ...reduced(state, { type: "SELECT_UNLOAD_TARGET", cell: mapItem, position }), inspectedCell };
  }

  if (getSelectableUnit(mapItem, context.perspective)) {
    if (sameCoords(state.origin, { x: mapItem.row, y: mapItem.column })) {
      return {
        ...reduced(state, {
          type: "OPEN_ORIGIN_MENU",
          availableFunds: context.availableFunds,
          map: context.map,
          perspective: context.perspective,
          position,
        }),
        inspectedCell,
      };
    }
    return {
      ...reduced(state, {
        type: "SELECT_ACTOR",
        availableFunds: context.availableFunds,
        map: context.map,
        position,
        unit: mapItem,
      }),
      inspectedCell,
    };
  }

  if (state.availableMoveTargets.includes(mapItem.index)) {
    return {
      ...reduced(state, {
        type: "CHOOSE_MOVE_TARGET",
        cell: mapItem,
        map: context.map,
        perspective: context.perspective,
        position,
      }),
      inspectedCell,
    };
  }
  if (!state.selectedUnit) return { state, inspectedCell };
  return {
    state: gameInteractionReducer(state, { type: "CANCEL_FLOW" }),
    inspectedCell: null,
  };
};

const commandResult = (
  state: GameInteractionState,
  command: GameAction | null,
): GameInteractionResult => command
  ? {
      state: gameInteractionReducer(state, { type: "CANCEL_FLOW" }),
      command,
      inspectedCell: null,
    }
  : {
      state: gameInteractionReducer(state, { type: "CANCEL_FLOW" }),
      inspectedCell: null,
    };

const chooseAction = (
  state: GameInteractionState,
  action: GameMenuActionId,
  context: GameInteractionContext,
): GameInteractionResult => {
  if (action === "cancel") {
    return { state: gameInteractionReducer(state, { type: "CANCEL_FLOW" }), inspectedCell: null };
  }
  if (action === "chooseAttack") {
    return reduced(state, { type: "CHOOSE_ATTACK_MODE", map: context.map, perspective: context.perspective });
  }
  if (action === "chooseBoost") {
    return reduced(state, { type: "CHOOSE_BOOST_MODE", map: context.map, perspective: context.perspective });
  }
  if (action === "chooseHeal") {
    return reduced(state, { type: "CHOOSE_HEAL_MODE", map: context.map, perspective: context.perspective });
  }
  if (action === "chooseConstruct") {
    return reduced(state, {
      type: "CHOOSE_CONSTRUCT_MODE",
      availableFunds: context.availableFunds,
      map: context.map,
      position: context.menuPosition,
    });
  }
  if (action === "chooseLoad") {
    return reduced(state, { type: "CHOOSE_LOAD_MODE", map: context.map, perspective: context.perspective });
  }
  if (action === "chooseUnload") {
    return reduced(state, { type: "CHOOSE_UNLOAD_MODE", map: context.map });
  }
  if (action.startsWith("construct:")) {
    return reduced(state, {
      type: "CHOOSE_CONSTRUCT_BUILDING",
      building: action.slice("construct:".length) as BuildingUnitOption,
      map: context.map,
    });
  }
  if (action.startsWith("spawn:")) {
    return reduced(state, {
      type: "CHOOSE_SPAWN_UNIT",
      map: context.map,
      unit: action.slice("spawn:".length) as SpawnableUnitOption,
    });
  }
  if (action === "move") {
    return state.previewDestination
      ? commandResult(state, buildMoveAction(state))
      : reduced(state, { type: "CHOOSE_MOVE_MODE", map: context.map });
  }
  if (action === "confirmAttack") return commandResult(state, buildAttackAction(state));
  if (action === "confirmBoost") return commandResult(state, buildBoostAction(state));
  if (action === "confirmHeal") return commandResult(state, buildHealAction(state));
  if (action === "confirmLoad") return commandResult(state, buildLoadAction(state));
  if (action === "confirmConstruct") return commandResult(state, buildConstructAction(state));
  if (action === "confirmSpawn") return commandResult(state, buildSpawnAction(state));
  if (action === "confirmUnload") return commandResult(state, buildUnloadAction(state));
  if (action === "confirmMissileLaunch" || action === "confirmNukeLaunch") {
    const command = buildMoveAction(state);
    return commandResult(
      state,
      command?.action === "move" && command.objectTarget ? command : null,
    );
  }
  return { state };
};

const confirmAction = (state: GameInteractionState): GameMenuActionId | undefined =>
  state.menu?.options.find(({ disabled, id }) => !disabled && (id === "move" || id.startsWith("confirm")))?.id;

export const advanceGameInteraction = (
  state: GameInteractionState,
  intent: BoardIntent,
  context: GameInteractionContext,
): GameInteractionResult => {
  if (intent.type === "cancel") return chooseAction(state, "cancel", context);
  if (intent.type === "choose-action") return chooseAction(state, intent.actionType, context);
  if (intent.type === "confirm") {
    const action = confirmAction(state);
    return action ? chooseAction(state, action, context) : { state };
  }
  if (intent.type === "select-entity") {
    const cell = context.map.flat().find((candidate) => entityIdForMapItem(candidate) === intent.entityId);
    return cell ? selectMapItem(state, cell, context) : { state };
  }
  const width = context.map[0]?.length;
  if (!width) return { state };
  let offset: Readonly<{ row: number; column: number }>;
  try {
    offset = axialToLegacyOffset(intent.cell, width);
  } catch {
    return { state };
  }
  const cell = context.map[offset.row]?.[offset.column];
  return cell ? selectMapItem(state, cell, context) : { state };
};

export const createBoardInteractionView = (
  state: GameInteractionState,
  context: Pick<GameInteractionContext, "active" | "map" | "perspective">,
  focusedCell: Coords | null,
): BoardInteractionView => {
  const width = context.map[0]?.length;
  const targetType = getTargetType(state);
  const selectedEntityId = state.selectedUnit
    ? entityIdForMapItem(state.selectedUnit)
    : undefined;
  const actionableEntityIds = context.active
    ? context.map.flat().flatMap((cell) => {
        const id = getSelectableUnit(cell, context.perspective) ? entityIdForMapItem(cell) : undefined;
        return id ? [id] : [];
      })
    : [];
  return {
    ...(selectedEntityId ? { selectedEntityId } : {}),
    actionableEntityIds,
    legalTargets: targetType
      ? getTargetedCellIndexes(state).map((cellIndex) => ({ cellIndex, type: targetType }))
      : [],
    ...(focusedCell && width
      ? { focusedCellId: hexKey(legacyOffsetToAxial(focusedCell.x, focusedCell.y, width)) }
      : {}),
    ...(selectedEntityId
      ? { focusRequest: { type: "entity", entityId: selectedEntityId } }
      : {}),
  };
};
