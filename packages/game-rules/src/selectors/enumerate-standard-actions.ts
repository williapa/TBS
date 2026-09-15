import {
  entityId,
  getHexNeighbors,
  hexKey,
  type EntityId,
  type GameState,
  type HexCoord,
  type TeamId,
} from "@TBS/game-core";

import type { StandardAction } from "../actions/types";
import {
  getAttackTargetIds,
  getBoostTargetIds,
  getHealTargetIds,
  getLegalConstructionOptions,
  getLegalMoveOptions,
  getLegalProductionOptions,
  getLoadTargetIds,
  getStandardTravelPositions,
  getUnloadPositions,
  type StandardLegalityObserver,
} from "./standard-legality";

export const STANDARD_ACTION_CANDIDATE_VERSION = "standard-actions@1" as const;

export type StandardActionCandidate = Readonly<{
  /** Opaque semantic identity. Bookkeeping IDs are deliberately excluded. */
  key: string;
  action: StandardAction;
}>;

export type StandardActionCandidateSet = Readonly<{
  version: typeof STANDARD_ACTION_CANDIDATE_VERSION;
  stateRevision: number;
  actorTeamId: TeamId;
  candidates: readonly StandardActionCandidate[];
}>;

export type StandardActionEnumerationObserver = StandardLegalityObserver & Readonly<{
  bookkeepingIdAllocation: () => void;
}>;

const coordValue = ({ q, r }: HexCoord): readonly [number, number] => [q, r];

const actionKey = (action: StandardAction): string => {
  switch (action.type) {
    case "end-turn": return JSON.stringify([action.type]);
    case "move": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      action.objectTarget ? coordValue(action.objectTarget) : null,
    ]);
    case "attack": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      action.defenderId,
    ]);
    case "boost":
    case "heal": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      action.targetId,
    ]);
    case "load": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      action.vehicleId,
    ]);
    case "unload": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      coordValue(action.unloadPosition),
    ]);
    case "construct": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      coordValue(action.constructionPosition),
      action.buildingUnitTypeId,
    ]);
    case "spawn": return JSON.stringify([
      action.type,
      action.actorId,
      coordValue(action.destination),
      action.unitTypeId,
    ]);
  }
};

const allocateBookkeepingId = (
  state: GameState,
  kind: "construct" | "spawn",
  actorId: EntityId,
  observer?: StandardActionEnumerationObserver,
): EntityId => {
  observer?.bookkeepingIdAllocation();
  const prefix = `simulation-${kind}-${state.revision}-${actorId}`;
  let suffix = 0;
  let candidate = entityId(prefix);
  while (state.entities[candidate]) {
    suffix += 1;
    candidate = entityId(`${prefix}-${suffix}`);
  }
  return candidate;
};

const sortedPositions = (positions: readonly HexCoord[]): readonly HexCoord[] =>
  [...positions].sort((left, right) => hexKey(left).localeCompare(hexKey(right)));

const boardNeighbors = (state: GameState, position: HexCoord): readonly HexCoord[] =>
  sortedPositions(getHexNeighbors(position).filter((neighbor) => Boolean(state.board.cells[hexKey(neighbor)])));

/**
 * Enumerates each legal semantic command exactly once. Construct/spawn entity IDs
 * are deterministic simulation bookkeeping and are not part of candidate keys.
 */
export const enumerateStandardActions = (
  state: GameState,
  actorTeamId: TeamId,
  observer?: StandardActionEnumerationObserver,
): StandardActionCandidateSet => {
  const actions: StandardAction[] = [];
  if (state.lifecycle.phase === "active" && state.lifecycle.activeTeamId === actorTeamId && state.teams[actorTeamId]) {
    actions.push({ type: "end-turn" });
    const actorIds = Object.values(state.entities)
      .filter((entity) => entity.ownerTeamId === actorTeamId && Boolean(entity.position))
      .map(({ id }) => id)
      .sort((left, right) => left.localeCompare(right));

    for (const actorId of actorIds) {
      let buildingEntityId: EntityId | undefined;
      let spawnedEntityId: EntityId | undefined;
      actions.push(...getLegalMoveOptions(state, actorTeamId, actorId, observer));
      const destinations = sortedPositions(getStandardTravelPositions(state, actorTeamId, actorId, observer));
      for (const destination of destinations) {
        for (const defenderId of [...getAttackTargetIds(state, actorTeamId, actorId, destination, observer)].sort()) {
          actions.push({ type: "attack", actorId, destination, defenderId });
        }
        for (const targetId of [...getBoostTargetIds(state, actorTeamId, actorId, destination, observer)].sort()) {
          actions.push({ type: "boost", actorId, destination, targetId });
        }
        for (const targetId of [...getHealTargetIds(state, actorTeamId, actorId, destination, observer)].sort()) {
          actions.push({ type: "heal", actorId, destination, targetId });
        }
        for (const vehicleId of [...getLoadTargetIds(state, actorTeamId, actorId, destination, observer)].sort()) {
          actions.push({ type: "load", actorId, destination, vehicleId });
        }
        for (const unloadPosition of getUnloadPositions(state, actorTeamId, actorId, destination, observer)) {
          actions.push({ type: "unload", actorId, destination, unloadPosition });
        }
        for (const constructionPosition of boardNeighbors(state, destination)) {
          const options = getLegalConstructionOptions(
            state,
            actorTeamId,
            actorId,
            destination,
            constructionPosition,
            observer,
          );
          if (options.length === 0) continue;
          buildingEntityId ??= allocateBookkeepingId(state, "construct", actorId, observer);
          for (const { unitTypeId: buildingUnitTypeId } of options) {
            actions.push({
              type: "construct",
              actorId,
              destination,
              constructionPosition,
              buildingEntityId,
              buildingUnitTypeId,
            });
          }
        }
      }

      const actor = state.entities[actorId];
      if (!actor?.position) continue;
      for (const destination of boardNeighbors(state, actor.position)) {
        const options = getLegalProductionOptions(state, actorTeamId, actorId, destination, observer);
        if (options.length === 0) continue;
        spawnedEntityId ??= allocateBookkeepingId(state, "spawn", actorId, observer);
        for (const { unitTypeId } of options) {
          actions.push({ type: "spawn", actorId, destination, spawnedEntityId, unitTypeId });
        }
      }
    }
  }

  const candidates = actions
    .map((action): StandardActionCandidate => ({ key: actionKey(action), action }))
    .sort((left, right) => left.key.localeCompare(right.key));
  const keys = new Set(candidates.map(({ key }) => key));
  if (keys.size !== candidates.length) throw new Error("standard action enumeration produced a duplicate semantic choice");
  return {
    version: STANDARD_ACTION_CANDIDATE_VERSION,
    stateRevision: state.revision,
    actorTeamId,
    candidates,
  };
};
