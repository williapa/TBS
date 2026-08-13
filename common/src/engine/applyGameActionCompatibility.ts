import {
  axialToLegacyOffset,
  entityId,
  legacyOffsetToAxial,
  teamId,
  unitTypeId,
  type EntityState,
  type GameState as NormalizedGameState,
  type HexCoord,
} from "@TBS/game-core";
import {
  applyStandardAction,
  type StandardAction,
  type StandardEvent,
} from "@TBS/game-rules";
import { migrateV1GameState } from "@TBS/protocol";

import type { ApplyGameActionResult, DomainEvent, GameState } from "../contracts/types";
import getAllCellsWhichCanBeReached from "../movement/getAllCellsWhichCanBeReached";
import {
  animalUnitOptions,
  buildingUnitOptions,
  objectUnitOptions,
  peopleUnitOptions,
  supportedActions,
  vehicleUnitOptions,
  type Coords,
  type GameAction,
  type MapItem,
  type ObjectUnitOption,
  type TeamColor,
  type TeamOption,
  type UnitOption,
} from "../types";

const reject = (
  code: Extract<ApplyGameActionResult, { ok: false }>["code"],
  message: string,
): ApplyGameActionResult => ({ ok: false, code, message });

const legacyUnitIds = new Set<string>([
  ...animalUnitOptions,
  ...buildingUnitOptions,
  ...objectUnitOptions,
  ...peopleUnitOptions,
  ...vehicleUnitOptions,
]);

const legacyUnit = (value: string): UnitOption => {
  if (!legacyUnitIds.has(value)) throw new Error(`Normalized rules returned unknown legacy unit: ${value}`);
  return value as UnitOption;
};

const legacyObject = (value: string | undefined): ObjectUnitOption | undefined =>
  value === "missile" || value === "money" || value === "nuke" ? value : undefined;

const legacyTeam = (value: string | undefined): TeamColor =>
  value === "orange" || value === "purple" ? value : "gray";

const cellAt = (state: GameState, coords: Coords): MapItem | undefined => state.map[coords.x]?.[coords.y];

const axialForCell = (cell: MapItem, width: number): HexCoord =>
  legacyOffsetToAxial(cell.row, cell.column, width);

const entityAtCoords = (
  normalized: NormalizedGameState,
  legacy: GameState,
  coords: Coords,
): EntityState | undefined => {
  const cell = cellAt(legacy, coords);
  if (!cell) return undefined;
  const occupantId = normalized.board.cells[`${axialForCell(cell, legacy.map[0].length).q},${axialForCell(cell, legacy.map[0].length).r}` as keyof typeof normalized.board.cells]?.occupantEntityId;
  return occupantId ? normalized.entities[occupantId] : undefined;
};

const translateAction = (
  state: GameState,
  normalized: NormalizedGameState,
  action: GameAction,
): StandardAction | undefined => {
  const width = state.map[0]?.length;
  if (!width) return undefined;
  const position = (coords: Coords) => {
    const cell = cellAt(state, coords);
    return cell ? axialForCell(cell, width) : undefined;
  };
  const actorId = (coords: Coords) => entityAtCoords(normalized, state, coords)?.id;

  switch (action.action) {
    case "end":
      return { type: "end-turn" };
    case "move": {
      const actor = actorId(action.start);
      const destination = position(action.end);
      const objectTarget = action.objectTarget ? position(action.objectTarget) : undefined;
      return actor && destination && (!action.objectTarget || objectTarget)
        ? { type: "move", actorId: actor, destination, ...(objectTarget ? { objectTarget } : {}) }
        : undefined;
    }
    case "attack": {
      const actor = actorId(action.attacker);
      const destination = position(action.end);
      const defender = actorId(action.defender);
      return actor && destination && defender
        ? { type: "attack", actorId: actor, destination, defenderId: defender }
        : undefined;
    }
    case "boost":
    case "heal": {
      const actor = actorId(action.start);
      const destination = position(action.end);
      const target = actorId(action.target);
      return actor && destination && target
        ? { type: action.action, actorId: actor, destination, targetId: target }
        : undefined;
    }
    case "construct": {
      const actor = actorId(action.worker);
      const destination = position(action.end);
      const constructionPosition = position(action.cell);
      const constructionCell = cellAt(state, action.cell);
      return actor && destination && constructionPosition && constructionCell
        ? {
            type: "construct",
            actorId: actor,
            destination,
            constructionPosition,
            buildingEntityId: entityId(`legacy-constructed-${state.revision + 1}-${constructionCell.index}`),
            buildingUnitTypeId: unitTypeId(action.building),
          }
        : undefined;
    }
    case "spawn": {
      const actor = actorId(action.building);
      const destination = position(action.end);
      const destinationCell = cellAt(state, action.end);
      return actor && destination && destinationCell
        ? {
            type: "spawn",
            actorId: actor,
            destination,
            spawnedEntityId: entityId(`legacy-spawned-${state.revision + 1}-${destinationCell.index}`),
            unitTypeId: unitTypeId(action.unit),
          }
        : undefined;
    }
    case "load": {
      const actor = actorId(action.start);
      const destination = position(action.end);
      const vehicle = actorId(action.vehicle);
      return actor && destination && vehicle
        ? { type: "load", actorId: actor, destination, vehicleId: vehicle }
        : undefined;
    }
    case "unload": {
      const actor = actorId(action.start);
      const destination = position(action.end);
      const unloadPosition = position(action.cell);
      return actor && destination && unloadPosition
        ? { type: "unload", actorId: actor, destination, unloadPosition }
        : undefined;
    }
  }
};

const legacyLoadedUnit = (
  entity: EntityState | undefined,
  includeEntityIds: boolean,
) => entity ? {
  ...(entity.health && entity.health.current < entity.health.maximum
    ? { damage: entity.health.maximum - entity.health.current }
    : {}),
  ...(entity.statuses.some(({ type }) => type === "boosted") ? { boosted: true } : {}),
  ...(entity.actionBudget?.moved || entity.actionBudget?.acted ? { moved: true } : {}),
  ...(includeEntityIds ? { entityId: entity.id } : {}),
  team: legacyTeam(entity.ownerTeamId),
  unit: legacyUnit(entity.unitTypeId),
} : undefined;

const toLegacyState = (original: GameState, normalized: NormalizedGameState): GameState => {
  const width = original.map[0].length;
  const includeEntityIds = original.map.flat().some((cell) => cell.entityId !== undefined);
  const map = original.map.map((row) => row.map((cell): MapItem => {
    const position = axialForCell(cell, width);
    const occupantId = normalized.board.cells[`${position.q},${position.r}` as keyof typeof normalized.board.cells]?.occupantEntityId;
    const entity = occupantId ? normalized.entities[occupantId] : undefined;
    const base = {
      row: cell.row,
      column: cell.column,
      index: cell.index,
      ...(cell.neighbors ? { neighbors: [...cell.neighbors] } : {}),
      terrain: cell.terrain,
    };
    if (!entity) return { ...base, team: "gray", unit: "none" };
    const cargoId = entity.cargo?.entityIds[0];
    const loadedUnit = cargoId
      ? legacyLoadedUnit(normalized.entities[cargoId], includeEntityIds)
      : undefined;
    return {
      ...base,
      ...(entity.health && entity.health.current < entity.health.maximum
        ? { damage: entity.health.maximum - entity.health.current }
        : {}),
      ...(entity.statuses.some(({ type }) => type === "boosted") ? { boosted: true } : {}),
      ...(loadedUnit ? { loadedUnit } : {}),
      ...(entity.actionBudget?.moved || entity.actionBudget?.acted ? { moved: true } : {}),
      ...(includeEntityIds ? { entityId: entity.id } : {}),
      team: legacyTeam(entity.ownerTeamId),
      unit: legacyUnit(entity.unitTypeId),
    };
  }));
  const orange = teamId("orange");
  const purple = teamId("purple");
  return {
    ...original,
    revision: normalized.revision,
    status: normalized.lifecycle.phase === "waiting"
      ? "waiting"
      : normalized.lifecycle.phase === "active"
        ? "active"
        : "finished",
    activeTeam: normalized.lifecycle.phase === "active" ? legacyTeam(normalized.lifecycle.activeTeamId) as TeamOption : undefined,
    winner: normalized.lifecycle.phase === "finished" ? legacyTeam(normalized.lifecycle.winnerTeamId) as TeamOption : undefined,
    map,
    money: {
      orange: normalized.teams[orange]?.money ?? original.money.orange,
      purple: normalized.teams[purple]?.money ?? original.money.purple,
    },
  };
};

const coords = (position: HexCoord, width: number): Coords => {
  const offset = axialToLegacyOffset(position, width);
  return { x: offset.row, y: offset.column };
};

const legacyEvent = (
  event: StandardEvent,
  before: NormalizedGameState,
  after: NormalizedGameState,
  width: number,
): DomainEvent => {
  switch (event.type) {
    case "unit-moved":
      return {
        type: "move",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        start: coords(event.start, width),
        end: coords(event.end, width),
        unit: legacyUnit(event.unitTypeId),
        ...(legacyObject(event.consumedObjectTypeId) ? { consumedObject: legacyObject(event.consumedObjectTypeId) } : {}),
        ...(event.moneyAward ? { moneyAward: event.moneyAward } : {}),
        ...(event.objectTarget ? { objectTarget: coords(event.objectTarget, width) } : {}),
        ...(event.objectPreventedByPriest !== undefined ? { objectPreventedByPriest: event.objectPreventedByPriest } : {}),
        ...(event.objectDamage ? {
          objectDamage: event.objectDamage.map((damage) => ({
            cell: coords(damage.position, width),
            damage: damage.damage,
            unit: legacyUnit(damage.unitTypeId),
            killed: damage.killed,
          })),
        } : {}),
      };
    case "unit-attacked":
      return {
        type: "attack",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        start: coords(event.start, width),
        end: coords(event.end, width),
        defender: coords(event.defenderPosition, width),
        unit: legacyUnit(event.attackerUnitTypeId),
        defendingUnit: legacyUnit(event.defenderUnitTypeId),
        attackDamage: event.attackDamage,
        defenseDamage: event.counterattackDamage,
        deaths: event.deaths.map((id) => {
          const entity = before.entities[id];
          if (!entity?.position) throw new Error(`Missing dead entity position: ${id}`);
          return coords(entity.position, width);
        }),
        ...(legacyObject(event.consumedObjectTypeId) ? { consumedObject: legacyObject(event.consumedObjectTypeId) } : {}),
        ...(event.moneyAward ? { moneyAward: event.moneyAward } : {}),
      };
    case "unit-boosted":
    case "unit-healed": {
      const actor = before.entities[event.actorId];
      const target = before.entities[event.targetId];
      if (!actor || !target) throw new Error(`Missing ${event.type} entities`);
      return {
        type: event.type === "unit-boosted" ? "boost" : "heal",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        start: coords(event.start, width),
        end: coords(event.end, width),
        target: target.position ? coords(target.position, width) : coords(event.end, width),
        unit: legacyUnit(actor.unitTypeId),
        ...(event.type === "unit-boosted"
          ? { boostedUnit: legacyUnit(target.unitTypeId) }
          : { healedUnit: legacyUnit(target.unitTypeId), healedDamage: event.amount ?? 0 }),
        ...(legacyObject(event.consumedObjectTypeId) ? { consumedObject: legacyObject(event.consumedObjectTypeId) } : {}),
        ...(event.moneyAward ? { moneyAward: event.moneyAward } : {}),
      } as DomainEvent;
    }
    case "unit-constructed":
      return {
        type: "construct",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        worker: coords(event.end, width),
        cell: coords(event.position, width),
        building: legacyUnit(event.unitTypeId) as Extract<GameAction, { action: "construct" }>["building"],
        cost: event.cost,
        ...(legacyObject(event.consumedObjectTypeId) ? { consumedObject: legacyObject(event.consumedObjectTypeId) } : {}),
        ...(event.moneyAward ? { moneyAward: event.moneyAward } : {}),
      };
    case "unit-spawned": {
      const building = before.entities[event.buildingId];
      if (!building?.position) throw new Error("Missing spawning building position");
      return {
        type: "spawn",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        building: coords(building.position, width),
        end: coords(event.position, width),
        unit: legacyUnit(event.unitTypeId) as Extract<GameAction, { action: "spawn" }>["unit"],
        cost: event.cost,
      };
    }
    case "unit-loaded": {
      const unit = before.entities[event.entityId];
      const vehicle = before.entities[event.vehicleId];
      if (!unit || !vehicle) throw new Error("Missing load entities");
      return {
        type: "load",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        start: coords(event.start, width),
        end: coords(event.end, width),
        vehicle: vehicle.position ? coords(vehicle.position, width) : coords(event.end, width),
        unit: legacyUnit(unit.unitTypeId),
        vehicleUnit: legacyUnit(vehicle.unitTypeId),
        ...(legacyObject(event.consumedObjectTypeId) ? { consumedObject: legacyObject(event.consumedObjectTypeId) } : {}),
        ...(event.moneyAward ? { moneyAward: event.moneyAward } : {}),
      };
    }
    case "unit-unloaded": {
      const vehicle = before.entities[event.vehicleId];
      const unit = before.entities[event.entityId];
      if (!unit || !vehicle) throw new Error("Missing unload entities");
      return {
        type: "unload",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        start: coords(event.start, width),
        end: coords(event.end, width),
        cell: coords(event.unloadPosition, width),
        unit: legacyUnit(unit.unitTypeId),
        vehicleUnit: legacyUnit(vehicle.unitTypeId),
        ...(legacyObject(event.consumedObjectTypeId) ? { consumedObject: legacyObject(event.consumedObjectTypeId) } : {}),
        ...(event.moneyAward ? { moneyAward: event.moneyAward } : {}),
      };
    }
    case "turn-ended":
      return {
        type: "endTurn",
        actorTeam: legacyTeam(event.actorTeamId) as TeamOption,
        nextTeam: legacyTeam(event.nextTeamId) as TeamOption,
        income: event.income,
        money: {
          orange: event.money[teamId("orange")] ?? 0,
          purple: event.money[teamId("purple")] ?? 0,
        },
      };
    case "game-over":
      return {
        type: "gameOver",
        actorTeam: legacyTeam(event.winnerTeamId) as TeamOption,
        winner: legacyTeam(event.winnerTeamId) as TeamOption,
      };
  }
};

const rejectionMessage = (code: string, fallback: string): string => {
  const messages: Readonly<Record<string, string>> = {
    "finished-game": "the game has already finished",
    "inactive-game": "the game is not active",
    "wrong-team": "it is not this team's turn",
  };
  return messages[code] ?? fallback;
};

const compatibilityMessage = (state: GameState, action: GameAction, code: string, fallback: string): string => {
  const byCode: Readonly<Record<string, string>> = {
    "wrong-owner": "that is not the acting team's piece",
    "action-budget-spent": action.action === "unload" ? "that vehicle has already acted" : "that piece has already acted",
    "not-movable": "that piece is not movable",
    "missing-object-target": "projectile object target is required",
    "invalid-object-target": "projectile target must be an enemy unit",
    "cannot-attack": "that piece cannot attack",
    "invalid-defender": "attacker is not in range of an enemy unit",
    "defender-out-of-range": "attacker is not in range of an enemy unit",
    "cannot-boost": "that piece cannot boost other units",
    "invalid-boost-target": "boost target must be a friendly unit",
    "boost-not-adjacent": "boost target must be adjacent to the acting unit",
    "already-boosted": "that unit has already been boosted",
    "cannot-heal": "that piece cannot heal other units",
    "invalid-heal-target": "heal target must be a friendly unit",
    "heal-not-adjacent": "heal target must be adjacent to the acting unit",
    "target-undamaged": "heal target must be damaged",
    "cannot-spawn": "that piece cannot spawn units",
    "unaffordable-spawn": "that unit cannot be spawned with current funds",
    "invalid-spawn-position": "spawn destination must be adjacent, empty, and valid terrain",
    "spawn-not-adjacent": "spawn destination must be adjacent, empty, and valid terrain",
    "cannot-construct": "that piece cannot construct buildings",
    "unaffordable-construction": "that building cannot be constructed with current funds",
    "invalid-construction-position": "construction cell must be adjacent, empty, and valid terrain",
    "construction-not-adjacent": "construction cell must be adjacent, empty, and valid terrain",
    "cannot-load": "only people units can load into vehicles",
    "invalid-vehicle": "load destination must be a vehicle",
    "vehicle-full": "that vehicle is already carrying a unit",
    "load-not-adjacent": "vehicle must be adjacent to loading unit",
    "cannot-unload": "only vehicles can unload units",
    "missing-cargo": "that vehicle is not carrying a unit",
    "unload-not-adjacent": "unload destination must be adjacent to the vehicle",
  };
  if (code === "occupied-destination") {
    return action.action === "attack" ? "attack destination must be empty" : "destination must be an empty space";
  }
  if (code === "destination-out-of-range") {
    return action.action === "attack" ? "attack destination must be in movement range" : "destination must be in range";
  }
  if (code === "invalid-unload-position" && action.action === "unload") {
    const cell = cellAt(state, action.cell);
    if (cell?.unit !== "none") return "unload destination must be empty";
    if (cell?.terrain === "water") return "cannot unload onto water";
  }
  return byCode[code] ?? rejectionMessage(code, fallback);
};

const sameCoords = (left: Coords, right: Coords) => left.x === right.x && left.y === right.y;

const compatibilityGeometryViolation = (state: GameState, action: GameAction): string | undefined => {
  const canReach = (startCoords: Coords, endCoords: Coords) => {
    if (sameCoords(startCoords, endCoords)) return true;
    const start = cellAt(state, startCoords);
    const end = cellAt(state, endCoords);
    return Boolean(start && end && getAllCellsWhichCanBeReached(start.index, state.map).includes(end.index));
  };
  const adjacent = (originCoords: Coords, targetCoords: Coords) => {
    const origin = cellAt(state, originCoords);
    const target = cellAt(state, targetCoords);
    return Boolean(origin && target && (origin.neighbors ?? []).includes(target.index));
  };

  switch (action.action) {
    case "end":
    case "spawn":
      return action.action === "spawn" && !adjacent(action.building, action.end)
        ? "spawn destination must be adjacent, empty, and valid terrain"
        : undefined;
    case "move":
      return canReach(action.start, action.end) ? undefined : "destination must be in range";
    case "attack":
      if (!canReach(action.attacker, action.end)) return "attack destination must be in movement range";
      return adjacent(action.end, action.defender) ? undefined : "attacker is not in range of an enemy unit";
    case "boost":
      if (!canReach(action.start, action.end)) return "destination must be in range";
      return adjacent(action.end, action.target) ? undefined : "boost target must be adjacent to the acting unit";
    case "heal":
      if (!canReach(action.start, action.end)) return "destination must be in range";
      return adjacent(action.end, action.target) ? undefined : "heal target must be adjacent to the acting unit";
    case "construct":
      if (!canReach(action.worker, action.end)) return "worker destination must be in range";
      return adjacent(action.end, action.cell) ? undefined : "construction cell must be adjacent, empty, and valid terrain";
    case "load":
      if (!canReach(action.start, action.end)) return "destination must be in range";
      return adjacent(action.end, action.vehicle) ? undefined : "vehicle must be adjacent to loading unit";
    case "unload":
      if (!canReach(action.start, action.end)) return "destination must be in range";
      return adjacent(action.end, action.cell) ? undefined : "unload destination must be adjacent to the vehicle";
  }
};

export const applyGameAction = (
  state: GameState,
  actorTeam: TeamOption,
  action: GameAction,
): ApplyGameActionResult => {
  if (state.status === "finished") return reject("finished-game", "the game has already finished");
  if (state.status !== "active" || !state.activeTeam) return reject("inactive-game", "the game is not active");
  if (state.activeTeam !== actorTeam) return reject("wrong-team", "it is not this team's turn");
  if (!action || !supportedActions.includes(action.action)) {
    return reject("unsupported-action", "the action type is not supported");
  }

  let normalized: NormalizedGameState;
  try {
    normalized = migrateV1GameState(state);
  } catch (error) {
    return reject("invalid-action", error instanceof Error ? error.message : "legacy game state migration failed");
  }
  const translated = translateAction(state, normalized, action);
  if (!translated) {
    if (action.action === "move" && action.objectTarget && !cellAt(state, action.objectTarget)) {
      return reject("invalid-action", "projectile target does not exist");
    }
    return reject("invalid-action", `invalid ${action.action} coordinates`);
  }
  const result = applyStandardAction(normalized, teamId(actorTeam), translated);
  if (!result.ok) {
    const first = result.violations[0];
    return reject(
      first?.code === "finished-game" ? "finished-game" : first?.code === "inactive-game" ? "inactive-game" : first?.code === "wrong-team" ? "wrong-team" : "invalid-action",
      compatibilityMessage(state, action, first?.code ?? "invalid-action", first?.message ?? "the action is invalid"),
    );
  }
  const geometryViolation = compatibilityGeometryViolation(state, action);
  if (geometryViolation) return reject("invalid-action", geometryViolation);
  return {
    ok: true,
    state: toLegacyState(state, result.state),
    events: result.events.map((event) => legacyEvent(event, normalized, result.state, state.map[0].length)),
  };
};

export default applyGameAction;
