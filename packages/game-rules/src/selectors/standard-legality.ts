import {
  entityId,
  getHexNeighbors,
  hexKey,
  unitTypeId,
  type EntityId,
  type GameState,
  type HexCoord,
  type TeamId,
  type UnitTypeId,
} from "@TBS/game-core";

import type { MoveAction, StandardAction, StandardRuleServices } from "../actions/types";
import {
  getConstructionOptions,
  getProductionOptions,
  type ConstructionOption,
  type ProductionOption,
} from "../content/production";
import type { UnitCapability } from "../content/units";
import { getReachablePositions, type MovementPolicy } from "../mechanics/movement";
import { standardRuleServices, validateStandardAction } from "../rulesets/standard";

const moneyCollectionPolicy: MovementPolicy = {
  allowSamePosition: true,
  collectibleObjectTypeIds: [unitTypeId("money")],
};

const moveCollectionPolicy: MovementPolicy = {
  allowSamePosition: false,
  collectibleObjectTypeIds: [unitTypeId("money"), unitTypeId("missile"), unitTypeId("nuke")],
};

const contextFor = (state: GameState, actorTeamId: TeamId) => ({
  state,
  actor: actorTeamId,
  services: standardRuleServices,
});

const isLegal = (state: GameState, actorTeamId: TeamId, action: StandardAction): boolean =>
  validateStandardAction(state, actorTeamId, action).ok;

const canPreviewActor = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  capability?: UnitCapability,
): boolean => {
  const actor = state.entities[actorId];
  const definition = actor ? standardRuleServices.getUnit(actor.unitTypeId) : undefined;
  return state.lifecycle.phase === "active"
    && state.lifecycle.activeTeamId === actorTeamId
    && Boolean(state.teams[actorTeamId])
    && Boolean(actor?.position)
    && actor?.ownerTeamId === actorTeamId
    && !actor.actionBudget?.moved
    && !actor.actionBudget?.acted
    && Boolean(definition)
    && (!capability || Boolean(definition?.capabilities.includes(capability)));
};

const adjacentEntityIds = (
  state: GameState,
  position: HexCoord,
): readonly EntityId[] => getHexNeighbors(position).flatMap((neighbor) => {
  const occupantId = state.board.cells[hexKey(neighbor)]?.occupantEntityId;
  return occupantId ? [occupantId] : [];
});

const adjacentBoardPositions = (
  state: GameState,
  position: HexCoord,
): readonly HexCoord[] => getHexNeighbors(position)
  .filter((neighbor) => Boolean(state.board.cells[hexKey(neighbor)]));

const projectileTargetEntities = (
  state: GameState,
  actorTeamId: TeamId,
) => Object.values(state.entities).filter((candidate) => {
  const definition = standardRuleServices.getUnit(candidate.unitTypeId);
  return Boolean(candidate.position)
    && Boolean(candidate.ownerTeamId)
    && candidate.ownerTeamId !== actorTeamId
    && Boolean(candidate.health)
    && definition?.category !== "object";
});

const previewEntityId = (state: GameState, purpose: string, actorId: EntityId): EntityId => {
  let suffix = 0;
  let candidate = entityId(`preview-${purpose}-${actorId}`);
  while (state.entities[candidate]) {
    suffix += 1;
    candidate = entityId(`preview-${purpose}-${actorId}-${suffix}`);
  }
  return candidate;
};

const travelPositions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  policy: MovementPolicy,
): readonly HexCoord[] => {
  const actor = state.entities[actorId];
  if (!actor?.position || !canPreviewActor(state, actorTeamId, actorId, "move")) return [];
  const reachable = getReachablePositions(contextFor(state, actorTeamId), actor, policy);
  return Object.values(state.board.cells)
    .filter(({ position }) => reachable.has(hexKey(position)))
    .map(({ position }) => position);
};

export const getStandardTravelPositions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): readonly HexCoord[] => {
  const actor = state.entities[actorId];
  if (!actor?.position || !canPreviewActor(state, actorTeamId, actorId, "move")) return [];
  return [actor.position, ...travelPositions(state, actorTeamId, actorId, moneyCollectionPolicy)];
};

export const getLegalMovePositions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): readonly HexCoord[] => [
  ...new Map(
    getLegalMoveOptions(state, actorTeamId, actorId)
      .map(({ destination }) => [hexKey(destination), destination]),
  ).values(),
];

export const getLegalMoveOptions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): readonly MoveAction[] => {
  if (!canPreviewActor(state, actorTeamId, actorId, "move")) return [];
  const projectileTargets = projectileTargetEntities(state, actorTeamId);
  return travelPositions(state, actorTeamId, actorId, moveCollectionPolicy)
    .flatMap((destination): readonly MoveAction[] => {
    const direct: MoveAction = { type: "move", actorId, destination };
    if (isLegal(state, actorTeamId, direct)) return [direct];
    return projectileTargets.flatMap((entity) => {
      if (!entity.position) return [];
      const candidate: MoveAction = {
        type: "move",
        actorId,
        destination,
        objectTarget: entity.position,
      };
      return isLegal(state, actorTeamId, candidate) ? [candidate] : [];
    });
  });
};

const hasLegalMoveOption = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): boolean => {
  if (!canPreviewActor(state, actorTeamId, actorId, "move")) return false;
  const projectileTargets = projectileTargetEntities(state, actorTeamId);
  return travelPositions(state, actorTeamId, actorId, moveCollectionPolicy).some((destination) => {
    const direct: MoveAction = { type: "move", actorId, destination };
    if (isLegal(state, actorTeamId, direct)) return true;
    return projectileTargets.some((target) => target.position && isLegal(state, actorTeamId, {
      ...direct,
      objectTarget: target.position,
    }));
  });
};

export const getProjectileTargetPositions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
): readonly HexCoord[] => {
  const options = getLegalMoveOptions(state, actorTeamId, actorId).filter((action) =>
    action.destination.q === destination.q
    && action.destination.r === destination.r);
  return options
    .flatMap((action) => action.objectTarget ? [action.objectTarget] : [])
    .filter((objectTarget, index, positions) => positions.findIndex((candidate) =>
      candidate.q === objectTarget.q && candidate.r === objectTarget.r) === index);
};

const legalTargetIds = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
  capability: UnitCapability,
  createAction: (targetId: EntityId) => StandardAction,
): readonly EntityId[] => canPreviewActor(state, actorTeamId, actorId, capability)
  ? adjacentEntityIds(state, destination)
    .filter((targetId) => isLegal(state, actorTeamId, createAction(targetId)))
  : [];

export const getAttackTargetIds = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
): readonly EntityId[] => legalTargetIds(state, actorTeamId, actorId, destination, "attack", (defenderId) => ({
  type: "attack",
  actorId,
  destination,
  defenderId,
}));

export const getBoostTargetIds = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
): readonly EntityId[] => legalTargetIds(state, actorTeamId, actorId, destination, "boost", (targetId) => ({
  type: "boost",
  actorId,
  destination,
  targetId,
}));

export const getHealTargetIds = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
): readonly EntityId[] => legalTargetIds(state, actorTeamId, actorId, destination, "heal", (targetId) => ({
  type: "heal",
  actorId,
  destination,
  targetId,
}));

export const getLoadTargetIds = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
): readonly EntityId[] => legalTargetIds(state, actorTeamId, actorId, destination, "loadable", (vehicleId) => ({
  type: "load",
  actorId,
  destination,
  vehicleId,
}));

export const getAffordableConstructionOptions = (
  state: GameState,
  actorTeamId: TeamId,
): readonly ConstructionOption[] => {
  const money = state.teams[actorTeamId]?.money ?? 0;
  return getConstructionOptions().filter(({ cost }) => cost <= money);
};

export const getLegalConstructionOptions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
  constructionPosition: HexCoord,
): readonly ConstructionOption[] => {
  if (!canPreviewActor(state, actorTeamId, actorId, "construct")) return [];
  const buildingEntityId = previewEntityId(state, "construction", actorId);
  return getConstructionOptions().filter(({ unitTypeId: buildingUnitTypeId }) => isLegal(state, actorTeamId, {
    type: "construct",
    actorId,
    destination,
    constructionPosition,
    buildingEntityId,
    buildingUnitTypeId,
  }));
};

export const getConstructablePositions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
  buildingUnitTypeId: UnitTypeId,
): readonly HexCoord[] => {
  if (!canPreviewActor(state, actorTeamId, actorId, "construct")) return [];
  const buildingEntityId = previewEntityId(state, "construction", actorId);
  return adjacentBoardPositions(state, destination)
    .filter((constructionPosition) => isLegal(state, actorTeamId, {
      type: "construct",
      actorId,
      destination,
      constructionPosition,
      buildingEntityId,
      buildingUnitTypeId,
    }));
};

export const getAffordableProductionOptions = (
  state: GameState,
  actorTeamId: TeamId,
  buildingTypeId: UnitTypeId,
): readonly ProductionOption[] => {
  const money = state.teams[actorTeamId]?.money ?? 0;
  return getProductionOptions(buildingTypeId).filter(({ cost }) => cost <= money);
};

export const getLegalProductionOptions = (
  state: GameState,
  actorTeamId: TeamId,
  buildingId: EntityId,
  destination: HexCoord,
): readonly ProductionOption[] => {
  const building = state.entities[buildingId];
  if (!building || !canPreviewActor(state, actorTeamId, buildingId, "spawn")) return [];
  const spawnedEntityId = previewEntityId(state, "spawn", buildingId);
  return getProductionOptions(building.unitTypeId).filter(({ unitTypeId }) => isLegal(state, actorTeamId, {
    type: "spawn",
    actorId: buildingId,
    destination,
    spawnedEntityId,
    unitTypeId,
  }));
};

export const getSpawnablePositions = (
  state: GameState,
  actorTeamId: TeamId,
  buildingId: EntityId,
  unitTypeId: UnitTypeId,
): readonly HexCoord[] => {
  const building = state.entities[buildingId];
  if (!building?.position || !canPreviewActor(state, actorTeamId, buildingId, "spawn")) return [];
  const spawnedEntityId = previewEntityId(state, "spawn", buildingId);
  return adjacentBoardPositions(state, building.position)
    .filter((destination) => isLegal(state, actorTeamId, {
      type: "spawn",
      actorId: buildingId,
      destination,
      spawnedEntityId,
      unitTypeId,
    }));
};

export const getUnloadPositions = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  destination: HexCoord,
): readonly HexCoord[] => {
  const actor = state.entities[actorId];
  const definition = actor ? standardRuleServices.getUnit(actor.unitTypeId) : undefined;
  if (!actor?.cargo?.entityIds.length || definition?.category !== "vehicle"
    || !canPreviewActor(state, actorTeamId, actorId, "transport")) return [];
  return adjacentBoardPositions(state, destination)
    .filter((unloadPosition) => isLegal(state, actorTeamId, {
      type: "unload",
      actorId,
      destination,
      unloadPosition,
    }));
};

export const getEntityCapabilities = (
  state: GameState,
  entityIdValue: EntityId,
  services: StandardRuleServices = standardRuleServices,
): readonly UnitCapability[] => {
  const entity = state.entities[entityIdValue];
  return entity ? services.getUnit(entity.unitTypeId)?.capabilities ?? [] : [];
};

export const getTeamIncome = (
  state: GameState,
  actorTeamId: TeamId,
  services: StandardRuleServices = standardRuleServices,
): number => Object.values(state.entities).reduce((total, entity) =>
  entity.ownerTeamId === actorTeamId && entity.position
    ? total + (services.getUnit(entity.unitTypeId)?.income ?? 0)
    : total, 0);

const collectAvailableActionTypes = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
  stopAfterFirst: boolean,
): readonly StandardAction["type"][] => {
  const actor = state.entities[actorId];
  const definition = actor ? standardRuleServices.getUnit(actor.unitTypeId) : undefined;
  if (!actor?.position || !definition || !canPreviewActor(state, actorTeamId, actorId)) return [];
  const capabilities = new Set(definition.capabilities);
  const available: StandardAction["type"][] = [];
  if (capabilities.has("move") && hasLegalMoveOption(state, actorTeamId, actorId)) available.push("move");
  if (stopAfterFirst && available.length > 0) return available;
  const destinations = getStandardTravelPositions(state, actorTeamId, actorId);
  if (capabilities.has("attack") && destinations.some((destination) =>
    getAttackTargetIds(state, actorTeamId, actorId, destination).length > 0)) {
    available.push("attack");
  }
  if (stopAfterFirst && available.length > 0) return available;
  if (capabilities.has("boost") && destinations.some((destination) =>
    getBoostTargetIds(state, actorTeamId, actorId, destination).length > 0)) {
    available.push("boost");
  }
  if (stopAfterFirst && available.length > 0) return available;
  if (capabilities.has("heal") && destinations.some((destination) =>
    getHealTargetIds(state, actorTeamId, actorId, destination).length > 0)) {
    available.push("heal");
  }
  if (stopAfterFirst && available.length > 0) return available;
  if (definition.category === "person" && destinations.some((destination) =>
    getLoadTargetIds(state, actorTeamId, actorId, destination).length > 0)) {
    available.push("load");
  }
  if (stopAfterFirst && available.length > 0) return available;
  if (capabilities.has("construct") && destinations.some((destination) => getConstructionOptions().some(({ unitTypeId }) =>
    getConstructablePositions(state, actorTeamId, actorId, destination, unitTypeId).length > 0))) {
    available.push("construct");
  }
  if (stopAfterFirst && available.length > 0) return available;
  if (capabilities.has("spawn") && getProductionOptions(actor.unitTypeId).some(({ unitTypeId }) =>
    getSpawnablePositions(state, actorTeamId, actorId, unitTypeId).length > 0)) {
    available.push("spawn");
  }
  if (stopAfterFirst && available.length > 0) return available;
  if (capabilities.has("transport") && actor.cargo?.entityIds.length
    && destinations.some((destination) => getUnloadPositions(state, actorTeamId, actorId, destination).length > 0)) {
    available.push("unload");
  }
  return available;
};

export const getAvailableActionTypes = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): readonly StandardAction["type"][] => collectAvailableActionTypes(
  state,
  actorTeamId,
  actorId,
  false,
);

export const hasAnyLegalAction = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): boolean => collectAvailableActionTypes(state, actorTeamId, actorId, true).length > 0;

export const getActionableEntityIds = (
  state: GameState,
  actorTeamId: TeamId,
): readonly EntityId[] => Object.values(state.entities)
  .filter(({ id }) => hasAnyLegalAction(state, actorTeamId, id))
  .map(({ id }) => id);

export const isSelectableEntity = (
  state: GameState,
  actorTeamId: TeamId,
  actorId: EntityId,
): boolean => hasAnyLegalAction(state, actorTeamId, actorId);
