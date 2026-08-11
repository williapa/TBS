import { getIncomeForTeam } from "../income/getIncomeForTeam";
import getAllCellsWhichCanBeReached from "../movement/getAllCellsWhichCanBeReached";
import moveMapUnit from "../movement/moveMapUnit";
import attackUnit from "../combat/attackUnit";
import getAttackableCells from "../combat/getAttackableCells";
import { canReceiveBoost, canUnitBoost } from "../boost";
import { canReceiveHeal, canUnitHeal, HEAL_AMOUNT } from "../heal";
import getSpawnOptions from "../spawn/getSpawnOptions";
import getSpawnableCells from "../spawn/getSpawnableCells";
import getConstructionOptions from "../construction/getConstructionOptions";
import getConstructableCells from "../construction/getConstructableCells";
import getWinningTeam from "../rules/getWinningTeam";
import isTurnOver from "../rules/isTurnOver";
import {
  canUnitCollectObjects,
  getConsumableObjectAtCell,
  MISSILE_OBJECT_DAMAGE,
  MONEY_OBJECT_REWARD,
  NUKE_OBJECT_SPLASH_DAMAGE,
  NUKE_OBJECT_TARGET_DAMAGE,
} from "../objects";
import { buildingUnitOptions, GameAction, MapItem, moveableOptions, peopleUnitOptions, supportedActions, TeamOption, vehicleUnitOptions, winConditions } from "../types";
import { ApplyGameActionResult, DomainEvent, GameState } from "../contracts/types";

const otherTeam = (team: TeamOption): TeamOption => team === "orange" ? "purple" : "orange";

const cloneCell = (cell: MapItem): MapItem => ({
  ...cell,
  loadedUnit: cell.loadedUnit ? { ...cell.loadedUnit } : undefined,
  neighbors: cell.neighbors ? [...cell.neighbors] : undefined,
});

const cloneState = (state: GameState): GameState => ({
  ...state,
  map: state.map.map((row) => row.map(cloneCell)),
  money: { ...state.money },
});

const clearUnit = (cell: MapItem): MapItem => ({
  ...cell,
  damage: undefined,
  boosted: undefined,
  loadedUnit: undefined,
  moved: undefined,
  team: "gray",
  unit: "none",
});

const isDamageableUnit = (cell?: MapItem) =>
  Boolean(cell && cell.unit !== "none" && !getConsumableObjectAtCell(cell));

const teamHasPriest = (map: MapItem[][], team: string) =>
  map.flat().some((cell) => cell.team === team && cell.unit === "priest");

const sameCoords = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x === b.x && a.y === b.y;

const isAdjacent = (origin: MapItem, target: MapItem) =>
  (origin.neighbors ?? []).includes(target.index);

const applyFlatDamage = (
  map: MapItem[][],
  coords: { x: number; y: number },
  damage: number
) => {
  const cell = map[coords.x]?.[coords.y];
  if (!cell || !isDamageableUnit(cell)) return null;
  const currentDamage = cell.damage ?? 0;
  const killed = currentDamage + damage >= 100;
  const unit = cell.unit;
  map[coords.x][coords.y] = killed
    ? clearUnit(cell)
    : { ...cell, damage: currentDamage + damage };
  return {
    cell: coords,
    damage: killed ? 100 - currentDamage : damage,
    killed,
    unit,
  };
};

const resetMovedState = (map: MapItem[][]) => map.map((row) => row.map((cell) => {
  const { moved: _moved, ...rest } = cell;
  if (!rest.loadedUnit) return rest as MapItem;
  const { moved: _loadedMoved, ...loadedUnit } = rest.loadedUnit;
  return { ...rest, loadedUnit } as MapItem;
}));

const reject = (
  code: Extract<ApplyGameActionResult, { ok: false }>["code"],
  message: string
): ApplyGameActionResult => ({ ok: false, code, message });

const applyGameActionCore = (
  state: GameState,
  actorTeam: TeamOption,
  action: GameAction
): ApplyGameActionResult => {
  if (state.status === "finished") {
    return reject("finished-game", "the game has already finished");
  }
  if (state.status !== "active" || !state.activeTeam) {
    return reject("inactive-game", "the game is not active");
  }
  if (state.activeTeam !== actorTeam) {
    return reject("wrong-team", "it is not this team's turn");
  }
  if (!action || !supportedActions.includes(action.action)) {
    return reject("unsupported-action", "the action type is not supported");
  }
  if (action.action !== "end") {
    if (action.action === "load") {
      const nextState = cloneState(state);
      const start = nextState.map[action.start.x]?.[action.start.y];
      const destination = nextState.map[action.end.x]?.[action.end.y];
      const vehicle = nextState.map[action.vehicle.x]?.[action.vehicle.y];
      if (!start || !destination || !vehicle) return reject("invalid-action", "invalid load coordinates");
      if (start.team !== actorTeam) return reject("invalid-action", "that is not the acting team's piece");
      if (start.moved) return reject("invalid-action", "that piece has already acted");
      if (!peopleUnitOptions.includes(start.unit)) return reject("invalid-action", "only people units can load into vehicles");
      if (vehicle.team !== actorTeam) return reject("invalid-action", "that is not the acting team's vehicle");
      if (!vehicleUnitOptions.includes(vehicle.unit)) return reject("invalid-action", "load destination must be a vehicle");
      if (vehicle.loadedUnit) return reject("invalid-action", "that vehicle is already carrying a unit");
      const moved = !sameCoords(action.start, action.end);
      const destinationObject = getConsumableObjectAtCell(destination);
      if (moved) {
        const canConsume = destinationObject === "money" && canUnitCollectObjects(start.unit);
        if (destination.unit !== "none" && !canConsume) return reject("invalid-action", "destination must be an empty space");
        if (!getAllCellsWhichCanBeReached(start.index, nextState.map).includes(destination.index)) return reject("invalid-action", "destination must be in range");
        nextState.map = moveMapUnit(nextState.map, action.start, action.end);
      }
      const loadingCell = nextState.map[action.end.x]?.[action.end.y];
      const loadingVehicle = nextState.map[action.vehicle.x]?.[action.vehicle.y];
      if (!loadingCell || !loadingVehicle || !isAdjacent(loadingCell, loadingVehicle)) {
        return reject("invalid-action", "vehicle must be adjacent to loading unit");
      }
      if (loadingVehicle.loadedUnit) return reject("invalid-action", "that vehicle is already carrying a unit");
      nextState.map[action.vehicle.x][action.vehicle.y] = {
        ...loadingVehicle,
        loadedUnit: { damage: loadingCell.damage, boosted: loadingCell.boosted, moved: true, team: loadingCell.team, unit: loadingCell.unit },
      };
      nextState.map[action.end.x][action.end.y] = clearUnit(loadingCell);
      if (destinationObject === "money") nextState.money[actorTeam] += MONEY_OBJECT_REWARD;
      nextState.revision += 1;
      return { ok: true, state: nextState, events: [{
        type: "load", actorTeam, start: action.start, end: action.end, vehicle: action.vehicle,
        unit: start.unit, vehicleUnit: loadingVehicle.unit,
        ...(destinationObject === "money" ? { consumedObject: "money", moneyAward: MONEY_OBJECT_REWARD } : {}),
      }] };
    }
    if (action.action === "unload") {
      const nextState = cloneState(state);
      const start = nextState.map[action.start.x]?.[action.start.y];
      const destination = nextState.map[action.end.x]?.[action.end.y];
      const unloadCell = nextState.map[action.cell.x]?.[action.cell.y];
      if (!start || !destination || !unloadCell) return reject("invalid-action", "invalid unload coordinates");
      if (start.team !== actorTeam) return reject("invalid-action", "that is not the acting team's piece");
      if (start.moved) return reject("invalid-action", "that vehicle has already acted");
      if (!vehicleUnitOptions.includes(start.unit)) return reject("invalid-action", "only vehicles can unload units");
      if (!start.loadedUnit) return reject("invalid-action", "that vehicle is not carrying a unit");
      const moved = !sameCoords(action.start, action.end);
      const destinationObject = getConsumableObjectAtCell(destination);
      if (moved) {
        const canConsume = destinationObject === "money" && canUnitCollectObjects(start.unit);
        if (destination.unit !== "none" && !canConsume) return reject("invalid-action", "destination must be an empty space");
        if (!getAllCellsWhichCanBeReached(start.index, nextState.map).includes(destination.index)) return reject("invalid-action", "destination must be in range");
        nextState.map = moveMapUnit(nextState.map, action.start, action.end);
      }
      const vehicle = nextState.map[action.end.x]?.[action.end.y];
      const cell = nextState.map[action.cell.x]?.[action.cell.y];
      if (!vehicle || !cell || !vehicle.loadedUnit) return reject("invalid-action", "that vehicle is not carrying a unit");
      if (!isAdjacent(vehicle, cell)) return reject("invalid-action", "unload destination must be adjacent to the vehicle");
      if (cell.unit !== "none") return reject("invalid-action", "unload destination must be empty");
      if (cell.terrain === "water") return reject("invalid-action", "cannot unload onto water");
      const cargo = vehicle.loadedUnit;
      nextState.map[action.cell.x][action.cell.y] = {
        ...cell, damage: cargo.damage, boosted: cargo.boosted, moved: cargo.moved ? true : undefined,
        team: cargo.team, unit: cargo.unit,
      };
      nextState.map[action.end.x][action.end.y] = { ...vehicle, loadedUnit: undefined, moved: true };
      if (destinationObject === "money") nextState.money[actorTeam] += MONEY_OBJECT_REWARD;
      nextState.revision += 1;
      return { ok: true, state: nextState, events: [{
        type: "unload", actorTeam, start: action.start, end: action.end, cell: action.cell,
        unit: cargo.unit, vehicleUnit: vehicle.unit,
        ...(destinationObject === "money" ? { consumedObject: "money", moneyAward: MONEY_OBJECT_REWARD } : {}),
      }] };
    }
    if (action.action === "spawn") {
      const nextState = cloneState(state);
      const building = nextState.map[action.building.x]?.[action.building.y];
      const destination = nextState.map[action.end.x]?.[action.end.y];
      if (!building || !destination) return reject("invalid-action", "invalid spawn coordinates");
      if (building.team !== actorTeam) return reject("invalid-action", "that is not the acting team's building");
      if (building.moved) return reject("invalid-action", "that building has already acted");
      if (!buildingUnitOptions.includes(building.unit)) return reject("invalid-action", "that piece cannot spawn units");
      const option = getSpawnOptions(building.unit, nextState.money[actorTeam]).find((item) => item.unit === action.unit);
      if (!option) return reject("invalid-action", "that unit cannot be spawned with current funds");
      if (!getSpawnableCells(nextState.map, action.building, action.unit).includes(destination.index)) {
        return reject("invalid-action", "spawn destination must be adjacent, empty, and valid terrain");
      }
      nextState.map[action.building.x][action.building.y] = { ...building, moved: true };
      nextState.map[action.end.x][action.end.y] = { ...destination, damage: undefined, moved: true, team: actorTeam, unit: action.unit };
      nextState.money[actorTeam] -= option.cost;
      nextState.revision += 1;
      return { ok: true, state: nextState, events: [{ type: "spawn", actorTeam, building: action.building, end: action.end, unit: action.unit, cost: option.cost }] };
    }
    if (action.action === "construct") {
      const nextState = cloneState(state);
      const worker = nextState.map[action.worker.x]?.[action.worker.y];
      const destination = nextState.map[action.end.x]?.[action.end.y];
      if (!worker || !destination) return reject("invalid-action", "invalid construction coordinates");
      if (worker.team !== actorTeam) return reject("invalid-action", "that is not the acting team's piece");
      if (worker.moved) return reject("invalid-action", "that worker has already acted");
      if (worker.unit !== "constructionWorker") return reject("invalid-action", "that piece cannot construct buildings");
      const option = getConstructionOptions(nextState.money[actorTeam]).find((item) => item.building === action.building);
      if (!option) return reject("invalid-action", "that building cannot be constructed with current funds");
      const moved = !sameCoords(action.worker, action.end);
      const destinationObject = getConsumableObjectAtCell(destination);
      if (moved) {
        const canConsume = destinationObject === "money" && canUnitCollectObjects(worker.unit);
        if (destination.unit !== "none" && !canConsume) return reject("invalid-action", "worker destination must be empty");
        if (!getAllCellsWhichCanBeReached(worker.index, nextState.map).includes(destination.index)) return reject("invalid-action", "worker destination must be in range");
        nextState.map = moveMapUnit(nextState.map, action.worker, action.end);
      }
      const cell = nextState.map[action.cell.x]?.[action.cell.y];
      if (!cell) return reject("invalid-action", "invalid construction cell");
      if (!getConstructableCells(nextState.map, action.end, action.building).includes(cell.index)) {
        return reject("invalid-action", "construction cell must be adjacent, empty, and valid terrain");
      }
      nextState.map[action.end.x][action.end.y] = { ...nextState.map[action.end.x][action.end.y], moved: true };
      nextState.map[action.cell.x][action.cell.y] = { ...cell, damage: undefined, moved: true, team: actorTeam, unit: action.building };
      nextState.money[actorTeam] -= option.cost;
      if (destinationObject === "money") nextState.money[actorTeam] += MONEY_OBJECT_REWARD;
      nextState.revision += 1;
      return { ok: true, state: nextState, events: [{
        type: "construct", actorTeam, worker: action.end, cell: action.cell, building: action.building, cost: option.cost,
        ...(destinationObject === "money" ? { consumedObject: "money", moneyAward: MONEY_OBJECT_REWARD } : {}),
      }] };
    }
    if (action.action === "boost" || action.action === "heal") {
      const nextState = cloneState(state);
      const start = nextState.map[action.start.x]?.[action.start.y];
      const destination = nextState.map[action.end.x]?.[action.end.y];
      const target = nextState.map[action.target.x]?.[action.target.y];
      if (!start || !destination || !target) {
        return reject("invalid-action", `invalid ${action.action} coordinates`);
      }
      if (start.team !== actorTeam) return reject("invalid-action", "that is not the acting team's piece");
      if (start.moved) return reject("invalid-action", "that piece has already acted");
      if (action.action === "boost" && !canUnitBoost(start.unit)) {
        return reject("invalid-action", "that piece cannot boost other units");
      }
      if (action.action === "heal" && !canUnitHeal(start.unit)) {
        return reject("invalid-action", "that piece cannot heal other units");
      }
      const moved = !sameCoords(action.start, action.end);
      const destinationObject = getConsumableObjectAtCell(destination);
      if (moved) {
        const canConsume = destinationObject === "money" && canUnitCollectObjects(start.unit);
        if (destination.unit !== "none" && !canConsume) {
          return reject("invalid-action", "destination must be an empty space");
        }
        if (!getAllCellsWhichCanBeReached(start.index, nextState.map).includes(destination.index)) {
          return reject("invalid-action", "destination must be in range");
        }
        nextState.map = moveMapUnit(nextState.map, action.start, action.end);
      }
      const actor = nextState.map[action.end.x]?.[action.end.y];
      const activeTarget = nextState.map[action.target.x]?.[action.target.y];
      if (!actor || !activeTarget || !isAdjacent(actor, activeTarget)) {
        return reject("invalid-action", `${action.action} target must be adjacent to the acting unit`);
      }
      if (activeTarget.team !== actorTeam || activeTarget.unit === "none") {
        return reject("invalid-action", `${action.action} target must be a friendly unit`);
      }
      nextState.map[action.end.x][action.end.y] = { ...actor, moved: true };
      if (destinationObject === "money") nextState.money[actorTeam] += MONEY_OBJECT_REWARD;
      nextState.revision += 1;

      if (action.action === "boost") {
        if (activeTarget.boosted) return reject("invalid-action", "that unit has already been boosted");
        if (!canReceiveBoost(actor.unit, activeTarget.unit)) {
          return reject("invalid-action", "that unit cannot boost the selected target");
        }
        nextState.map[action.target.x][action.target.y] = { ...activeTarget, boosted: true };
        const event: DomainEvent = {
          type: "boost", actorTeam, start: action.start, end: action.end, target: action.target,
          unit: start.unit, boostedUnit: activeTarget.unit,
          ...(destinationObject === "money" ? { consumedObject: "money", moneyAward: MONEY_OBJECT_REWARD } : {}),
        };
        return { ok: true, state: nextState, events: [event] };
      }

      if (!canReceiveHeal(actor.unit, activeTarget.unit)) {
        return reject("invalid-action", "that unit cannot heal the selected target");
      }
      const currentDamage = activeTarget.damage ?? 0;
      if (currentDamage <= 0) return reject("invalid-action", "heal target must be damaged");
      const healedDamage = Math.min(HEAL_AMOUNT, currentDamage);
      const remainingDamage = currentDamage - healedDamage;
      nextState.map[action.target.x][action.target.y] = {
        ...activeTarget,
        damage: remainingDamage > 0 ? remainingDamage : undefined,
      };
      const event: DomainEvent = {
        type: "heal", actorTeam, start: action.start, end: action.end, target: action.target,
        unit: start.unit, healedUnit: activeTarget.unit, healedDamage,
        ...(destinationObject === "money" ? { consumedObject: "money", moneyAward: MONEY_OBJECT_REWARD } : {}),
      };
      return { ok: true, state: nextState, events: [event] };
    }
    if (action.action === "attack") {
      const nextState = cloneState(state);
      const attacker = nextState.map[action.attacker.x]?.[action.attacker.y];
      const destination = nextState.map[action.end.x]?.[action.end.y];
      const defender = nextState.map[action.defender.x]?.[action.defender.y];
      if (!attacker || !destination || !defender) {
        return reject("invalid-action", "invalid attack coordinates");
      }
      if (attacker.team !== actorTeam) {
        return reject("invalid-action", "that is not the acting team's piece");
      }
      if (attacker.moved) {
        return reject("invalid-action", "that piece has already acted");
      }
      if (!moveableOptions.includes(attacker.unit)) {
        return reject("invalid-action", "that piece cannot attack");
      }

      const moved = action.attacker.x !== action.end.x || action.attacker.y !== action.end.y;
      const destinationObject = getConsumableObjectAtCell(destination);
      if (moved) {
        const canConsumeObject = Boolean(destinationObject) && canUnitCollectObjects(attacker.unit);
        if (destination.unit !== "none" && !canConsumeObject) {
          return reject("invalid-action", "attack destination must be empty");
        }
        if (destinationObject === "missile" || destinationObject === "nuke") {
          return reject("invalid-action", "projectile objects must be launched with a move action");
        }
        const reachable = getAllCellsWhichCanBeReached(attacker.index, nextState.map);
        if (!reachable.includes(destination.index)) {
          return reject("invalid-action", "attack destination must be in movement range");
        }
      }
      if (
        defender.team === actorTeam ||
        defender.team === "gray" ||
        !isDamageableUnit(defender) ||
        !getAttackableCells(actorTeam, [destination.index], nextState.map).includes(defender.index)
      ) {
        return reject("invalid-action", "attacker is not in range of an enemy unit");
      }

      const attackerUnit = attacker.unit;
      const defenderUnit = defender.unit;
      const attackResult = attackUnit(nextState.map, action.attacker, action.end, action.defender);
      nextState.map = attackResult[0];
      nextState.revision += 1;
      if (destinationObject === "money") nextState.money[actorTeam] += MONEY_OBJECT_REWARD;
      const damageToDefender = attackResult[1][0];
      const counterattackDamage = attackResult[1][1];
      const deaths = [];
      if (nextState.map[action.end.x][action.end.y].unit === "none") deaths.push(action.end);
      if (nextState.map[action.defender.x][action.defender.y].unit === "none") deaths.push(action.defender);
      const event: DomainEvent = {
        type: "attack",
        actorTeam,
        start: action.attacker,
        end: action.end,
        defender: action.defender,
        unit: attackerUnit,
        defendingUnit: defenderUnit,
        attackDamage: damageToDefender,
        defenseDamage: counterattackDamage,
        deaths,
        ...(destinationObject === "money"
          ? { consumedObject: destinationObject, moneyAward: MONEY_OBJECT_REWARD }
          : {}),
      };
      return { ok: true, state: nextState, events: [event] };
    }
    const nextState = cloneState(state);
    const movingUnit = nextState.map[action.start.x]?.[action.start.y];
    const destination = nextState.map[action.end.x]?.[action.end.y];
    if (!movingUnit || !destination) {
      return reject("invalid-action", "invalid movement coordinates");
    }
    if (movingUnit.team !== actorTeam) {
      return reject("invalid-action", "that is not the acting team's piece");
    }
    if (movingUnit.moved) {
      return reject("invalid-action", "that piece has already acted");
    }
    if (!moveableOptions.includes(movingUnit.unit)) {
      return reject("invalid-action", "that piece is not movable");
    }

    const destinationObject = getConsumableObjectAtCell(destination);
    const canConsumeObject = Boolean(destinationObject) && canUnitCollectObjects(movingUnit.unit);
    if (destination.unit !== "none" && !canConsumeObject) {
      return reject("invalid-action", "destination must be an empty space");
    }
    const reachable = getAllCellsWhichCanBeReached(movingUnit.index, nextState.map);
    if (!reachable.includes(destination.index)) {
      return reject("invalid-action", "destination must be in range");
    }

    nextState.map = moveMapUnit(nextState.map, action.start, action.end);
    nextState.revision += 1;
    if (destinationObject === "missile" || destinationObject === "nuke") {
      if (!action.objectTarget) {
        return reject("invalid-action", "projectile object target is required");
      }
      const target = nextState.map[action.objectTarget.x]?.[action.objectTarget.y];
      if (!target) {
        return reject("invalid-action", "projectile target does not exist");
      }
      if (target.team === actorTeam || target.team === "gray" || !isDamageableUnit(target)) {
        return reject("invalid-action", "projectile target must be an enemy unit");
      }

      const prevented = teamHasPriest(nextState.map, target.team);
      const damageCells = destinationObject === "missile"
        ? [{ coords: action.objectTarget, damage: MISSILE_OBJECT_DAMAGE }]
        : [
            { coords: action.objectTarget, damage: NUKE_OBJECT_TARGET_DAMAGE },
            ...(target.neighbors ?? []).map((index) => {
              const cell = nextState.map.flat().find((candidate) => candidate.index === index);
              return cell
                ? { coords: { x: cell.row, y: cell.column }, damage: NUKE_OBJECT_SPLASH_DAMAGE }
                : null;
            }).filter((item): item is { coords: { x: number; y: number }; damage: number } => Boolean(item)),
          ];
      const objectDamage = prevented
        ? []
        : damageCells
            .map(({ coords, damage }) => applyFlatDamage(nextState.map, coords, damage))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
      const event: DomainEvent = {
        type: "move",
        actorTeam,
        start: action.start,
        end: action.end,
        unit: movingUnit.unit,
        consumedObject: destinationObject,
        objectTarget: action.objectTarget,
        objectPreventedByPriest: prevented,
        objectDamage,
      };
      return { ok: true, state: nextState, events: [event] };
    }
    const consumedObject = destinationObject === "money" ? destinationObject : undefined;
    if (consumedObject) nextState.money[actorTeam] += MONEY_OBJECT_REWARD;
    const event: DomainEvent = {
      type: "move",
      actorTeam,
      start: action.start,
      end: action.end,
      unit: movingUnit.unit,
      ...(consumedObject ? { consumedObject, moneyAward: MONEY_OBJECT_REWARD } : {}),
    };
    return { ok: true, state: nextState, events: [event] };
  }

  const nextState = cloneState(state);
  nextState.revision += 1;
  return { ok: true, state: nextState, events: [] };
};

export const applyGameAction = (
  state: GameState,
  actorTeam: TeamOption,
  action: GameAction
): ApplyGameActionResult => {
  const result = applyGameActionCore(state, actorTeam, action);
  if (!result.ok) return result;

  const winner = getWinningTeam(
    result.state.map,
    result.state.winCondition ?? winConditions.ELIMINATION_ONLY
  );
  if (winner) {
    return {
      ok: true,
      state: { ...result.state, status: "finished", activeTeam: undefined, winner },
      events: [...result.events, { type: "gameOver", actorTeam, winner }],
    };
  }

  const turnEnded = action.action === "end" || isTurnOver(
    actorTeam,
    result.state.map,
    action.action,
    result.state.money[actorTeam]
  );
  if (!turnEnded) return result;

  const nextTeam = otherTeam(actorTeam);
  const map = resetMovedState(result.state.map);
  const income = getIncomeForTeam(map, nextTeam);
  const money = { ...result.state.money, [nextTeam]: result.state.money[nextTeam] + income };
  return {
    ok: true,
    state: { ...result.state, activeTeam: nextTeam, map, money },
    events: [...result.events, { type: "endTurn", actorTeam, nextTeam, income, money: { ...money } }],
  };
};

export default applyGameAction;
