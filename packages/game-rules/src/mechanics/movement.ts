import {
  getHexNeighbors,
  hexKey,
  type BoardCellState,
  type EntityId,
  type EntityState,
  type GameState,
  type HexCoord,
  type RuleContext,
  type RuleViolation,
  type TeamId,
  type UnitTypeId,
} from "@TBS/game-core";

import type { StandardRuleServices } from "../actions/types";
import { MONEY_OBJECT_REWARD } from "../content/objects";
import { getMovementCost } from "../content/terrain";

export type MovementPolicy = Readonly<{
  allowSamePosition: boolean;
  collectibleObjectTypeIds: readonly UnitTypeId[];
}>;

export type MovementPlan = Readonly<{
  state: GameState;
  actorBefore: EntityState;
  actorAfter: EntityState;
  start: HexCoord;
  end: HexCoord;
  consumedObject?: EntityState;
  moneyAward?: number;
}>;

export type MovementPlanResult =
  | Readonly<{ ok: true; plan: MovementPlan }>
  | Readonly<{ ok: false; violation: RuleViolation }>;

const invalid = (code: string, message: string): MovementPlanResult => ({
  ok: false,
  violation: { code, message },
});

export const getEntityAt = (state: GameState, position: HexCoord): EntityState | undefined => {
  const occupantId = state.board.cells[hexKey(position)]?.occupantEntityId;
  return occupantId ? state.entities[occupantId] : undefined;
};

export const areAdjacent = (left: HexCoord, right: HexCoord): boolean =>
  getHexNeighbors(left).some((neighbor) => hexKey(neighbor) === hexKey(right));

const withoutEntity = (entities: GameState["entities"], removedId: EntityId) =>
  Object.fromEntries(Object.entries(entities).filter(([id]) => id !== removedId));

const isCollectible = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  actor: EntityState,
  occupant: EntityState,
  policy: MovementPolicy,
) => Boolean(
  context.services.getUnit(actor.unitTypeId)?.capabilities.includes("collect-object") &&
  policy.collectibleObjectTypeIds.includes(occupant.unitTypeId),
);

export const getReachablePositions = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  actor: EntityState,
  policy: MovementPolicy,
): ReadonlySet<string> => {
  if (!actor.position) return new Set();
  const definition = context.services.getUnit(actor.unitTypeId);
  if (!definition || definition.base.movement <= 0) return new Set();

  const remainingEnergy = new Map<string, number>([[hexKey(actor.position), definition.base.movement]]);
  const queue: HexCoord[] = [actor.position];
  const reachable = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const currentEnergy = remainingEnergy.get(hexKey(current));
    if (currentEnergy === undefined) continue;

    for (const neighbor of getHexNeighbors(current)) {
      const neighborKey = hexKey(neighbor);
      const cell = context.state.board.cells[neighborKey];
      if (!cell) continue;
      const occupant = cell.occupantEntityId ? context.state.entities[cell.occupantEntityId] : undefined;
      if (occupant && !isCollectible(context, actor, occupant, policy)) continue;
      const energy = currentEnergy - getMovementCost(definition, cell.terrainTypeId);
      if (energy < 0 || energy <= (remainingEnergy.get(neighborKey) ?? Number.NEGATIVE_INFINITY)) continue;
      remainingEnergy.set(neighborKey, energy);
      reachable.add(neighborKey);
      if (!occupant) queue.push(neighbor);
    }
  }
  return reachable;
};

export const planActorMovement = (
  context: RuleContext<GameState, TeamId, StandardRuleServices>,
  actorId: EntityId,
  destination: HexCoord,
  policy: MovementPolicy,
): MovementPlanResult => {
  const actor = context.state.entities[actorId];
  if (!actor) return invalid("missing-actor", "acting entity does not exist");
  if (actor.ownerTeamId !== context.actor) return invalid("wrong-owner", "entity is not owned by the acting team");
  if (!actor.position) return invalid("actor-not-on-board", "acting entity is not on the board");
  if (actor.actionBudget?.moved || actor.actionBudget?.acted) {
    return invalid("action-budget-spent", "entity has already acted");
  }
  const definition = context.services.getUnit(actor.unitTypeId);
  if (!definition?.capabilities.includes("move")) return invalid("not-movable", "entity cannot move");

  const start = actor.position;
  if (hexKey(start) === hexKey(destination)) {
    if (!policy.allowSamePosition) return invalid("same-destination", "destination must differ from the actor position");
    return { ok: true, plan: { state: context.state, actorBefore: actor, actorAfter: actor, start, end: destination } };
  }

  const destinationKey = hexKey(destination);
  const destinationCell = context.state.board.cells[destinationKey];
  if (!destinationCell) return invalid("missing-destination", "destination is not on the board");
  const occupant = destinationCell.occupantEntityId
    ? context.state.entities[destinationCell.occupantEntityId]
    : undefined;
  if (occupant && !isCollectible(context, actor, occupant, policy)) {
    return invalid("occupied-destination", "destination must be empty or contain an allowed collectible object");
  }
  if (!getReachablePositions(context, actor, policy).has(destinationKey)) {
    return invalid("destination-out-of-range", "destination is outside movement range");
  }

  const actorAfter: EntityState = { ...actor, position: destination };
  const entities = occupant
    ? withoutEntity(context.state.entities, occupant.id)
    : { ...context.state.entities };
  entities[actor.id] = actorAfter;
  const cells: Record<string, BoardCellState> = {
    ...context.state.board.cells,
    [hexKey(start)]: { ...context.state.board.cells[hexKey(start)], occupantEntityId: undefined },
    [destinationKey]: { ...destinationCell, occupantEntityId: actor.id },
  };
  let teams = context.state.teams;
  const moneyAward = occupant?.unitTypeId === "money" ? MONEY_OBJECT_REWARD : undefined;
  if (moneyAward) {
    const team = context.state.teams[context.actor];
    if (!team) throw new Error("validated actor team is missing");
    teams = { ...teams, [context.actor]: { ...team, money: team.money + moneyAward } };
  }
  return {
    ok: true,
    plan: {
      state: { ...context.state, board: { cells }, entities, teams },
      actorBefore: actor,
      actorAfter,
      start,
      end: destination,
      ...(occupant ? { consumedObject: occupant } : {}),
      ...(moneyAward ? { moneyAward } : {}),
    },
  };
};

export const markEntityActed = (state: GameState, actorId: EntityId): GameState => {
  const actor = state.entities[actorId];
  if (!actor) throw new Error(`Cannot mark missing entity as acted: ${actorId}`);
  return {
    ...state,
    entities: {
      ...state.entities,
      [actorId]: { ...actor, actionBudget: { moved: true, acted: true } },
    },
  };
};
