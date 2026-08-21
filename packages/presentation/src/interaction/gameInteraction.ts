import {
  hexKey,
  parseHexKey,
  unitTypeId,
  type EntityId,
  type HexCoord,
  type HexKey,
} from "@TBS/game-core";
import {
  getActionableEntityIds,
  getAffordableConstructionOptions,
  getAffordableProductionOptions,
  getAttackTargetIds,
  getBoostTargetIds,
  getConstructablePositions,
  getHealTargetIds,
  getLegalMoveOptions,
  getLoadTargetIds,
  getProductionOptions,
  getSpawnablePositions,
  getUnloadPositions,
  isSelectableEntity,
} from "@TBS/game-rules";

import type { BoardInteractionView, BoardTargetType } from "../board/contracts";
import type {
  GameActionMenuState,
  GameInteractionContext,
  GameInteractionPreview,
  GameInteractionState,
  GameInteractionTarget,
  GameMenuActionId,
  GameMenuOption,
  InteractiveActionType,
  StandardActionDraft,
} from "./contracts";
import type { BoardIntent } from "./intents";

export type GameInteractionResult = Readonly<{
  state: GameInteractionState;
  command?: StandardActionDraft;
  inspectedCellId?: HexKey | null;
}>;

const emptyState = (): GameInteractionState => ({
  mode: "idle",
  selectedEntityId: null,
  destination: null,
  pendingAction: null,
  selectedTargetEntityId: null,
  selectedTargetCellId: null,
  selectedUnitTypeId: null,
  legalTargets: [],
  menu: null,
});

export const createInitialGameInteractionState = emptyState;

export const createGameInteractionPreview = (
  context: Pick<GameInteractionContext, "active" | "state" | "perspective">,
): GameInteractionPreview => ({
  actionableEntityIds: context.active
    ? getActionableEntityIds(context.state, context.perspective)
    : [],
});

const samePosition = (left: HexCoord, right: HexCoord): boolean =>
  left.q === right.q && left.r === right.r;

const humanize = (value: string): string => value
  .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .replace(/[-_]+/g, " ")
  .replace(/^./, (first) => first.toUpperCase());

const entityPosition = (
  context: GameInteractionContext,
  entityId: EntityId | null,
): HexCoord | undefined => entityId ? context.state.entities[entityId]?.position : undefined;

const currentDestination = (
  state: GameInteractionState,
  context: GameInteractionContext,
): HexCoord | undefined => state.destination ?? entityPosition(context, state.selectedEntityId);

const targetForEntity = (
  context: GameInteractionContext,
  type: InteractiveActionType,
  entityId: EntityId,
): GameInteractionTarget | undefined => {
  const position = context.state.entities[entityId]?.position;
  return position ? { cellId: hexKey(position), type, entityId } : undefined;
};

const entityTargets = (
  context: GameInteractionContext,
  type: InteractiveActionType,
  entityIds: readonly EntityId[],
): readonly GameInteractionTarget[] => entityIds.flatMap((id) => {
  const target = targetForEntity(context, type, id);
  return target ? [target] : [];
});

const cellTargets = (
  type: InteractiveActionType,
  positions: readonly HexCoord[],
): readonly GameInteractionTarget[] => positions.map((position) => ({
  cellId: hexKey(position),
  type,
}));

const moveOptionsAtDestination = (
  state: GameInteractionState,
  context: GameInteractionContext,
) => {
  const destination = state.destination;
  return state.selectedEntityId && destination
    ? getLegalMoveOptions(context.state, context.perspective, state.selectedEntityId)
      .filter((option) => samePosition(option.destination, destination))
    : [];
};

const targetsForAction = (
  state: GameInteractionState,
  context: GameInteractionContext,
  type: InteractiveActionType,
): readonly GameInteractionTarget[] => {
  const actorId = state.selectedEntityId;
  const destination = currentDestination(state, context);
  if (!actorId || !destination) return [];
  switch (type) {
    case "move":
      return moveOptionsAtDestination(state, context).flatMap(({ objectTarget }) => {
        if (!objectTarget) return [];
        const occupantId = context.state.board.cells[hexKey(objectTarget)]?.occupantEntityId;
        return occupantId ? [{ cellId: hexKey(objectTarget), type, entityId: occupantId }] : [];
      });
    case "attack":
      return entityTargets(
        context,
        type,
        getAttackTargetIds(context.state, context.perspective, actorId, destination),
      );
    case "boost":
      return entityTargets(
        context,
        type,
        getBoostTargetIds(context.state, context.perspective, actorId, destination),
      );
    case "heal":
      return entityTargets(
        context,
        type,
        getHealTargetIds(context.state, context.perspective, actorId, destination),
      );
    case "load":
      return entityTargets(
        context,
        type,
        getLoadTargetIds(context.state, context.perspective, actorId, destination),
      );
    case "unload":
      return cellTargets(
        type,
        getUnloadPositions(context.state, context.perspective, actorId, destination),
      );
    case "construct":
      return state.selectedUnitTypeId
        ? cellTargets(
            type,
            getConstructablePositions(
              context.state,
              context.perspective,
              actorId,
              destination,
              state.selectedUnitTypeId,
            ),
          )
        : [];
    case "spawn":
      return state.selectedUnitTypeId
        ? cellTargets(
            type,
            getSpawnablePositions(
              context.state,
              context.perspective,
              actorId,
              state.selectedUnitTypeId,
            ),
          )
        : [];
  }
};

const menuAt = (
  context: GameInteractionContext,
  cellId: HexKey,
  kind: GameActionMenuState["kind"],
  options: readonly GameMenuOption[],
): GameActionMenuState => ({ cellId, kind, options, position: context.menuPosition });

const constructionOptions = (
  state: GameInteractionState,
  context: GameInteractionContext,
): readonly GameMenuOption[] => {
  const actorId = state.selectedEntityId;
  const destination = currentDestination(state, context);
  if (!actorId || !destination) return [];
  return getAffordableConstructionOptions(context.state, context.perspective)
    .filter(({ unitTypeId: id }) => getConstructablePositions(
      context.state,
      context.perspective,
      actorId,
      destination,
      id,
    ).length > 0)
    .map(({ cost, unitTypeId: id }) => ({
      id: `construct:${id}` as const,
      label: `${humanize(id)} ($${cost})`,
      unitTypeId: id,
    }));
};

const spawnOptions = (
  state: GameInteractionState,
  context: GameInteractionContext,
): readonly GameMenuOption[] => {
  const actorId = state.selectedEntityId;
  const actor = actorId ? context.state.entities[actorId] : undefined;
  if (!actorId || !actor) return [];
  const affordableUnitTypeIds = new Set(
    getAffordableProductionOptions(context.state, context.perspective, actor.unitTypeId)
      .map(({ unitTypeId: id }) => id),
  );
  return getProductionOptions(actor.unitTypeId)
    .map(({ cost, unitTypeId: id }) => ({
      disabled: !affordableUnitTypeIds.has(id) || getSpawnablePositions(
        context.state,
        context.perspective,
        actorId,
        id,
      ).length === 0,
      id: `spawn:${id}` as const,
      label: `${humanize(id)} ($${cost})`,
      unitTypeId: id,
    }));
};

const actionOptions = (
  state: GameInteractionState,
  context: GameInteractionContext,
): readonly GameMenuOption[] => {
  const types: readonly InteractiveActionType[] = [
    "move",
    "attack",
    "boost",
    "heal",
    "construct",
    "load",
    "spawn",
    "unload",
  ];
  const options = types.flatMap((type): readonly GameMenuOption[] => {
    if (type === "construct") {
      return constructionOptions(state, context).length > 0
        ? [{ id: type, label: "Construct" }]
        : [];
    }
    if (type === "spawn") {
      return spawnOptions(state, context).length > 0
        ? [{ id: type, label: "Spawn" }]
        : [];
    }
    if (type === "move") {
      return moveOptionsAtDestination(state, context).length > 0
        ? [{ id: type, label: "Move" }]
        : [];
    }
    return targetsForAction(state, context, type).length > 0
      ? [{ id: type, label: humanize(type) }]
      : [];
  });
  return [...options, { id: "cancel", label: "Cancel" }];
};

const openActionMenu = (
  state: GameInteractionState,
  context: GameInteractionContext,
  destination: HexCoord,
): GameInteractionState => ({
  ...state,
  mode: "action-menu",
  destination,
  pendingAction: null,
  selectedTargetEntityId: null,
  selectedTargetCellId: null,
  selectedUnitTypeId: null,
  legalTargets: [],
  menu: menuAt(
    context,
    hexKey(destination),
    state.destination ? "destination" : "origin",
    actionOptions({ ...state, destination }, context),
  ),
});

const selectEntity = (
  state: GameInteractionState,
  entityId: EntityId,
  context: GameInteractionContext,
): GameInteractionResult => {
  const position = entityPosition(context, entityId);
  if (!position) return { state };
  const inspectedCellId = hexKey(position);
  if (!context.active) return { state, inspectedCellId };
  if (state.legalTargets.some(({ cellId }) => cellId === inspectedCellId)) {
    return selectCell(state, position, context);
  }
  if (state.selectedEntityId === entityId && state.mode !== "targeting") {
    return { state: openActionMenu({ ...state, destination: null }, context, position), inspectedCellId };
  }
  const selectable = context.preview
    ? context.preview.actionableEntityIds.includes(entityId)
    : isSelectableEntity(context.state, context.perspective, entityId);
  if (!selectable) {
    if (state.mode === "targeting") return selectCell(state, position, context);
    return { state, inspectedCellId };
  }
  const legalTargets = cellTargets(
    "move",
    getLegalMoveOptions(context.state, context.perspective, entityId)
      .map(({ destination }) => destination),
  );
  const selected: GameInteractionState = {
    ...emptyState(),
    mode: legalTargets.length > 0 ? "unit-selected" : "action-menu",
    selectedEntityId: entityId,
    legalTargets,
  };
  return {
    state: legalTargets.length > 0 ? selected : openActionMenu(selected, context, position),
    inspectedCellId,
  };
};

const selectCell = (
  state: GameInteractionState,
  position: HexCoord,
  context: GameInteractionContext,
): GameInteractionResult => {
  const cellId = hexKey(position);
  if (!context.state.board.cells[cellId]) return { state };
  if (!context.active) return { state, inspectedCellId: cellId };

  if (state.mode === "targeting") {
    const target = state.legalTargets.find(({ cellId: candidate }) => candidate === cellId);
    if (!target || !state.pendingAction) return { state, inspectedCellId: cellId };
    return {
      state: {
        ...state,
        mode: "action-menu",
        selectedTargetEntityId: target.entityId ?? null,
        selectedTargetCellId: target.cellId,
        legalTargets: [],
        menu: menuAt(context, cellId, "confirm", [
          { id: "confirm", label: `Confirm ${humanize(state.pendingAction)}` },
          { id: "cancel", label: "Cancel" },
        ]),
      },
      inspectedCellId: cellId,
    };
  }

  const actorPosition = entityPosition(context, state.selectedEntityId);
  if (actorPosition && samePosition(position, actorPosition)) {
    return { state: openActionMenu({ ...state, destination: null }, context, position), inspectedCellId: cellId };
  }
  if (
    state.mode === "unit-selected"
    && state.legalTargets.some(({ cellId: candidate }) => candidate === cellId)
  ) {
    return { state: openActionMenu(state, context, position), inspectedCellId: cellId };
  }
  const occupantId = context.state.board.cells[cellId]?.occupantEntityId;
  if (occupantId && occupantId !== state.selectedEntityId) {
    return selectEntity(state, occupantId, context);
  }
  return { state: emptyState(), inspectedCellId: cellId };
};

const chooseAction = (
  state: GameInteractionState,
  action: GameMenuActionId,
  context: GameInteractionContext,
): GameInteractionResult => {
  if (action === "cancel") return { state: emptyState(), inspectedCellId: null };
  if (action === "confirm") return confirmAction(state, context);
  const destination = currentDestination(state, context);
  if (!state.selectedEntityId || !destination) return { state };

  if (action === "construct" || action === "spawn") {
    const options = action === "construct"
      ? constructionOptions(state, context)
      : spawnOptions(state, context);
    return {
      state: {
        ...state,
        mode: "action-menu",
        pendingAction: action,
        menu: menuAt(
          context,
          hexKey(destination),
          action === "construct" ? "construct-selection" : "spawn-selection",
          [...options, { id: "cancel", label: "Cancel" }],
        ),
      },
    };
  }

  if (action.startsWith("construct:") || action.startsWith("spawn:")) {
    const pendingAction: InteractiveActionType = action.startsWith("construct:")
      ? "construct"
      : "spawn";
    const selectedUnitTypeId = unitTypeId(action.slice(action.indexOf(":") + 1));
    const nextState = { ...state, pendingAction, selectedUnitTypeId };
    return {
      state: {
        ...nextState,
        mode: "targeting",
        legalTargets: targetsForAction(nextState, context, pendingAction),
        menu: null,
      },
    };
  }

  if (!isInteractiveActionType(action)) return { state };
  const legalTargets = targetsForAction(state, context, action);
  const nextState: GameInteractionState = {
    ...state,
    pendingAction: action,
    selectedTargetEntityId: null,
    selectedTargetCellId: null,
    legalTargets,
    menu: null,
    mode: legalTargets.length > 0 ? "targeting" : "action-menu",
  };
  if (legalTargets.length > 0) return { state: nextState };
  if (action === "move") return confirmAction(nextState, context);
  return {
    state: {
      ...nextState,
      menu: menuAt(context, hexKey(destination), "confirm", [
        { id: "confirm", label: `Confirm ${humanize(action)}` },
        { id: "cancel", label: "Cancel" },
      ]),
    },
  };
};

const interactiveActionTypes: ReadonlySet<string> = new Set([
  "attack",
  "boost",
  "construct",
  "heal",
  "load",
  "move",
  "spawn",
  "unload",
]);

const isInteractiveActionType = (value: string): value is InteractiveActionType =>
  interactiveActionTypes.has(value);

const confirmAction = (
  state: GameInteractionState,
  context: GameInteractionContext,
): GameInteractionResult => {
  const command = buildStandardActionDraft(state, context);
  return command
    ? { state: emptyState(), command, inspectedCellId: null }
    : { state };
};

export const buildStandardActionDraft = (
  state: GameInteractionState,
  context: GameInteractionContext,
): StandardActionDraft | null => {
  const actorId = state.selectedEntityId;
  const destination = currentDestination(state, context);
  const targetCellId = state.selectedTargetCellId;
  if (!actorId || !destination || !state.pendingAction) return null;
  switch (state.pendingAction) {
    case "move": {
      const objectTarget = targetCellId ? parseHexKey(targetCellId) : undefined;
      const option = getLegalMoveOptions(context.state, context.perspective, actorId).find((candidate) =>
        samePosition(candidate.destination, destination)
        && ((!candidate.objectTarget && !objectTarget)
          || Boolean(candidate.objectTarget && objectTarget && samePosition(candidate.objectTarget, objectTarget))));
      return option ?? null;
    }
    case "attack":
      return state.selectedTargetEntityId
        ? { type: "attack", actorId, destination, defenderId: state.selectedTargetEntityId }
        : null;
    case "boost":
      return state.selectedTargetEntityId
        ? { type: "boost", actorId, destination, targetId: state.selectedTargetEntityId }
        : null;
    case "heal":
      return state.selectedTargetEntityId
        ? { type: "heal", actorId, destination, targetId: state.selectedTargetEntityId }
        : null;
    case "load":
      return state.selectedTargetEntityId
        ? { type: "load", actorId, destination, vehicleId: state.selectedTargetEntityId }
        : null;
    case "unload":
      return targetCellId
        ? { type: "unload", actorId, destination, unloadPosition: parseHexKey(targetCellId) }
        : null;
    case "construct":
      return targetCellId && state.selectedUnitTypeId
        ? {
            type: "construct",
            actorId,
            destination,
            constructionPosition: parseHexKey(targetCellId),
            buildingUnitTypeId: state.selectedUnitTypeId,
          }
        : null;
    case "spawn":
      return targetCellId && state.selectedUnitTypeId
        ? {
            type: "spawn",
            actorId,
            destination: parseHexKey(targetCellId),
            unitTypeId: state.selectedUnitTypeId,
          }
        : null;
  }
};

export const advanceGameInteraction = (
  state: GameInteractionState,
  intent: BoardIntent,
  context: GameInteractionContext,
): GameInteractionResult => {
  if (intent.type === "cancel") return chooseAction(state, "cancel", context);
  if (intent.type === "confirm") return chooseAction(state, "confirm", context);
  if (intent.type === "choose-action") return chooseAction(state, intent.actionType, context);
  if (intent.type === "select-entity") return selectEntity(state, intent.entityId, context);
  return selectCell(state, intent.cell, context);
};

export const getTargetedCellIds = (
  state: GameInteractionState,
): readonly HexKey[] => state.legalTargets.map(({ cellId }) => cellId);

export const getTargetType = (
  state: GameInteractionState,
): BoardTargetType | null => state.pendingAction
  ?? (state.mode === "unit-selected" ? "move" : null);

export const createBoardInteractionView = (
  state: GameInteractionState,
  context: Pick<GameInteractionContext, "active" | "state" | "perspective">,
  focusedCellId: HexKey | null,
  preview: GameInteractionPreview = createGameInteractionPreview(context),
): BoardInteractionView => ({
  ...(state.selectedEntityId ? { selectedEntityId: state.selectedEntityId } : {}),
  actionableEntityIds: preview.actionableEntityIds,
  legalTargets: state.legalTargets.map(({ cellId, type }) => ({ cellId, type })),
  ...(focusedCellId ? { focusedCellId } : {}),
  ...(state.selectedEntityId
    ? { focusRequest: { type: "entity" as const, entityId: state.selectedEntityId } }
    : {}),
});
