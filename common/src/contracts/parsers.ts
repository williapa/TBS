import {
  buildingUnitOptions,
  BuildingUnitOption,
  GameAction,
  MapItem,
  objectUnitOptions,
  ObjectUnitOption,
  spawnableUnitOptions,
  SpawnableUnitOption,
  supportedActions,
  teamOptions,
  TeamOption,
  TerrainOptions,
  UnitOption,
  WinCondition,
  winConditions,
  animalUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
} from "../types";
import {
  ActionEnvelope,
  AppliedAction,
  CURRENT_GAME_PROTOCOL_VERSION,
  CURRENT_GAME_SCHEMA_VERSION,
  GameSnapshot,
  GameState,
  PersistedGamePayload,
  PlayerSeat,
  DomainEvent,
} from "./types";

export class ContractValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ContractValidationError";
    this.path = path;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const record = (value: unknown, path: string) => {
  if (!isRecord(value)) throw new ContractValidationError(path, "expected an object");
  return value;
};

const string = (value: unknown, path: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContractValidationError(path, "expected a non-empty string");
  }
  return value;
};

const finiteNumber = (value: unknown, path: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ContractValidationError(path, "expected a finite number");
  }
  return value;
};

const nonNegativeInteger = (value: unknown, path: string) => {
  const parsed = finiteNumber(value, path);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ContractValidationError(path, "expected a non-negative integer");
  }
  return parsed;
};

const optionalBoolean = (value: unknown, path: string) => {
  if (value !== undefined && typeof value !== "boolean") {
    throw new ContractValidationError(path, "expected a boolean");
  }
  return value as boolean | undefined;
};

const boolean = (value: unknown, path: string) => {
  if (typeof value !== "boolean") throw new ContractValidationError(path, "expected a boolean");
  return value;
};

const enumValue = <T extends string>(value: unknown, options: readonly string[], path: string) => {
  if (typeof value !== "string" || !options.includes(value)) {
    throw new ContractValidationError(path, `expected one of ${options.join(", ")}`);
  }
  return value as T;
};

export const parseTeamOption = (value: unknown, path = "team") =>
  enumValue<TeamOption>(value, teamOptions, path);

export const parseTerrainOption = (value: unknown, path = "terrain") =>
  enumValue<MapItem["terrain"]>(value, TerrainOptions, path);

const allUnitOptions = [
  ...animalUnitOptions,
  ...buildingUnitOptions,
  ...objectUnitOptions,
  ...peopleUnitOptions,
  ...vehicleUnitOptions,
];

export const parseUnitOption = (value: unknown, path = "unit") =>
  enumValue<UnitOption>(value, allUnitOptions, path);

const parseCoords = (value: unknown, path: string) => {
  const item = record(value, path);
  return {
    x: nonNegativeInteger(item.x, `${path}.x`),
    y: nonNegativeInteger(item.y, `${path}.y`),
  };
};

const parseLoadedUnit = (value: unknown, path: string): NonNullable<MapItem["loadedUnit"]> => {
  const item = record(value, path);
  return {
    damage: item.damage === undefined ? undefined : finiteNumber(item.damage, `${path}.damage`),
    boosted: optionalBoolean(item.boosted, `${path}.boosted`),
    moved: optionalBoolean(item.moved, `${path}.moved`),
    team: enumValue(item.team, [...teamOptions, "gray"], `${path}.team`),
    unit: parseUnitOption(item.unit, `${path}.unit`),
  };
};

export const parseMapItem = (value: unknown, path = "mapItem"): MapItem => {
  const item = record(value, path);
  const damage = item.damage === undefined ? undefined : finiteNumber(item.damage, `${path}.damage`);
  if (damage !== undefined && (damage < 0 || damage >= 100)) {
    throw new ContractValidationError(`${path}.damage`, "expected damage from 0 through 99");
  }
  const neighbors = item.neighbors;
  if (neighbors !== undefined && !Array.isArray(neighbors)) {
    throw new ContractValidationError(`${path}.neighbors`, "expected an array");
  }
  return {
    row: nonNegativeInteger(item.row, `${path}.row`),
    column: nonNegativeInteger(item.column, `${path}.column`),
    index: nonNegativeInteger(item.index, `${path}.index`),
    damage,
    boosted: optionalBoolean(item.boosted, `${path}.boosted`),
    loadedUnit: item.loadedUnit === undefined ? undefined : parseLoadedUnit(item.loadedUnit, `${path}.loadedUnit`),
    moved: optionalBoolean(item.moved, `${path}.moved`),
    neighbors: neighbors === undefined
      ? undefined
      : (neighbors as unknown[]).map((neighbor, index) => nonNegativeInteger(neighbor, `${path}.neighbors[${index}]`)),
    terrain: parseTerrainOption(item.terrain, `${path}.terrain`),
    unit: parseUnitOption(item.unit, `${path}.unit`),
    team: enumValue(item.team, [...teamOptions, "gray"], `${path}.team`),
  };
};

const parseMap = (value: unknown, path: string) => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ContractValidationError(path, "expected a non-empty row array");
  }
  return value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length === 0) {
      throw new ContractValidationError(`${path}[${rowIndex}]`, "expected a non-empty cell array");
    }
    return row.map((item, columnIndex) => parseMapItem(item, `${path}[${rowIndex}][${columnIndex}]`));
  });
};

export const parsePersistedGamePayload = (
  value: unknown,
  schemaVersion: number = CURRENT_GAME_SCHEMA_VERSION
): PersistedGamePayload => {
  if (schemaVersion !== CURRENT_GAME_SCHEMA_VERSION) {
    throw new ContractValidationError("schemaVersion", `unsupported schema version ${schemaVersion}`);
  }
  const payload = record(value, "payload");
  const money = record(payload.money, "payload.money");
  return {
    map: parseMap(payload.map, "payload.map"),
    money: {
      orange: finiteNumber(money.orange, "payload.money.orange"),
      purple: finiteNumber(money.purple, "payload.money.purple"),
    },
  };
};

export const parseGameState = (value: unknown): GameState => {
  const state = record(value, "state");
  const schemaVersion = nonNegativeInteger(state.schemaVersion, "state.schemaVersion");
  if (schemaVersion !== CURRENT_GAME_SCHEMA_VERSION) {
    throw new ContractValidationError("state.schemaVersion", `unsupported schema version ${schemaVersion}`);
  }
  const payload = parsePersistedGamePayload(state, schemaVersion);
  const status = enumValue<GameState["status"]>(state.status, ["waiting", "active", "finished"], "state.status");
  const activeTeam = state.activeTeam === undefined ? undefined : parseTeamOption(state.activeTeam, "state.activeTeam");
  const winner = state.winner === undefined ? undefined : parseTeamOption(state.winner, "state.winner");
  const winCondition = state.winCondition === undefined
    ? undefined
    : enumValue<WinCondition>(state.winCondition, Object.values(winConditions), "state.winCondition");
  if (status === "active" && !activeTeam) {
    throw new ContractValidationError("state.activeTeam", "active games require an active team");
  }
  if (status !== "active" && activeTeam) {
    throw new ContractValidationError("state.activeTeam", "only active games may have an active team");
  }
  if (status === "finished" && !winner) {
    throw new ContractValidationError("state.winner", "finished games require a winner");
  }
  if (status !== "finished" && winner) {
    throw new ContractValidationError("state.winner", "only finished games may have a winner");
  }
  return {
    ...payload,
    schemaVersion: CURRENT_GAME_SCHEMA_VERSION,
    revision: nonNegativeInteger(state.revision, "state.revision"),
    status,
    activeTeam,
    winner,
    winCondition,
  };
};

const parsePlayerSeat = (value: unknown, path: string): PlayerSeat => {
  const seat = record(value, path);
  return {
    memberId: string(seat.memberId, `${path}.memberId`),
    displayName: string(seat.displayName, `${path}.displayName`),
  };
};

export const parseGameSnapshot = (value: unknown): GameSnapshot => {
  const snapshot = record(value, "snapshot");
  const players = record(snapshot.players, "snapshot.players");
  return {
    gameId: string(snapshot.gameId, "snapshot.gameId"),
    players: {
      orange: players.orange === undefined ? undefined : parsePlayerSeat(players.orange, "snapshot.players.orange"),
      purple: players.purple === undefined ? undefined : parsePlayerSeat(players.purple, "snapshot.players.purple"),
    },
    spectatorCount: nonNegativeInteger(snapshot.spectatorCount, "snapshot.spectatorCount"),
    state: parseGameState(snapshot.state),
  };
};

export const parseGameAction = (value: unknown, path = "action"): GameAction => {
  const action = record(value, path);
  const kind = enumValue<GameAction["action"]>(action.action, supportedActions, `${path}.action`);
  switch (kind) {
    case "end": return { action: "end" };
    case "move": return {
      action: "move",
      start: parseCoords(action.start, `${path}.start`),
      end: parseCoords(action.end, `${path}.end`),
      ...(action.objectTarget === undefined
        ? {}
        : { objectTarget: parseCoords(action.objectTarget, `${path}.objectTarget`) }),
    };
    case "attack": return { action: "attack", attacker: parseCoords(action.attacker, `${path}.attacker`), defender: parseCoords(action.defender, `${path}.defender`), end: parseCoords(action.end, `${path}.end`) };
    case "boost": return { action: "boost", start: parseCoords(action.start, `${path}.start`), end: parseCoords(action.end, `${path}.end`), target: parseCoords(action.target, `${path}.target`) };
    case "heal": return { action: "heal", start: parseCoords(action.start, `${path}.start`), end: parseCoords(action.end, `${path}.end`), target: parseCoords(action.target, `${path}.target`) };
    case "construct": return { action: "construct", worker: parseCoords(action.worker, `${path}.worker`), end: parseCoords(action.end, `${path}.end`), cell: parseCoords(action.cell, `${path}.cell`), building: enumValue<BuildingUnitOption>(action.building, buildingUnitOptions, `${path}.building`) };
    case "load": return { action: "load", start: parseCoords(action.start, `${path}.start`), end: parseCoords(action.end, `${path}.end`), vehicle: parseCoords(action.vehicle, `${path}.vehicle`) };
    case "spawn": return { action: "spawn", building: parseCoords(action.building, `${path}.building`), end: parseCoords(action.end, `${path}.end`), unit: enumValue<SpawnableUnitOption>(action.unit, spawnableUnitOptions, `${path}.unit`) };
    case "unload": return { action: "unload", start: parseCoords(action.start, `${path}.start`), end: parseCoords(action.end, `${path}.end`), cell: parseCoords(action.cell, `${path}.cell`) };
  }
};

export const parseActionEnvelope = (value: unknown): ActionEnvelope => {
  const envelope = record(value, "envelope");
  const protocolVersion = nonNegativeInteger(envelope.protocolVersion, "envelope.protocolVersion");
  if (protocolVersion !== CURRENT_GAME_PROTOCOL_VERSION) {
    throw new ContractValidationError("envelope.protocolVersion", `unsupported protocol version ${protocolVersion}`);
  }
  return {
    protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
    actionId: string(envelope.actionId, "envelope.actionId"),
    expectedRevision: nonNegativeInteger(envelope.expectedRevision, "envelope.expectedRevision"),
    action: parseGameAction(envelope.action, "envelope.action"),
  };
};

const parseMoney = (value: unknown, path: string) => {
  const money = record(value, path);
  return {
    orange: finiteNumber(money.orange, `${path}.orange`),
    purple: finiteNumber(money.purple, `${path}.purple`),
  };
};

const parseOptionalConsumedObject = (value: unknown, path: string): ObjectUnitOption | undefined =>
  value === undefined ? undefined : enumValue<ObjectUnitOption>(value, objectUnitOptions, path);

const parseOptionalMoneyAward = (value: unknown, path: string) =>
  value === undefined ? undefined : finiteNumber(value, path);

export const parseDomainEvent = (value: unknown, path = "event"): DomainEvent => {
  const event = record(value, path);
  const type = string(event.type, `${path}.type`);
  const actorTeam = parseTeamOption(event.actorTeam, `${path}.actorTeam`);
  const base = { actorTeam };
  const consumedObject = parseOptionalConsumedObject(event.consumedObject, `${path}.consumedObject`);
  const moneyAward = parseOptionalMoneyAward(event.moneyAward, `${path}.moneyAward`);

  switch (type) {
    case "move": {
      const objectDamage = event.objectDamage;
      if (objectDamage !== undefined && !Array.isArray(objectDamage)) {
        throw new ContractValidationError(`${path}.objectDamage`, "expected an array");
      }
      return {
        ...base,
        type,
        start: parseCoords(event.start, `${path}.start`),
        end: parseCoords(event.end, `${path}.end`),
        unit: parseUnitOption(event.unit, `${path}.unit`),
        consumedObject,
        moneyAward,
        objectTarget: event.objectTarget === undefined ? undefined : parseCoords(event.objectTarget, `${path}.objectTarget`),
        objectPreventedByPriest: optionalBoolean(event.objectPreventedByPriest, `${path}.objectPreventedByPriest`),
        objectDamage: objectDamage === undefined ? undefined : (objectDamage as unknown[]).map((value, index) => {
          const damage = record(value, `${path}.objectDamage[${index}]`);
          return {
            cell: parseCoords(damage.cell, `${path}.objectDamage[${index}].cell`),
            damage: finiteNumber(damage.damage, `${path}.objectDamage[${index}].damage`),
            unit: parseUnitOption(damage.unit, `${path}.objectDamage[${index}].unit`),
            killed: boolean(damage.killed, `${path}.objectDamage[${index}].killed`),
          };
        }),
      };
    }
    case "attack": {
      const deaths = event.deaths;
      if (!Array.isArray(deaths)) throw new ContractValidationError(`${path}.deaths`, "expected an array");
      return {
        ...base,
        type,
        start: parseCoords(event.start, `${path}.start`),
        end: parseCoords(event.end, `${path}.end`),
        defender: parseCoords(event.defender, `${path}.defender`),
        unit: parseUnitOption(event.unit, `${path}.unit`),
        defendingUnit: parseUnitOption(event.defendingUnit, `${path}.defendingUnit`),
        attackDamage: finiteNumber(event.attackDamage, `${path}.attackDamage`),
        defenseDamage: finiteNumber(event.defenseDamage, `${path}.defenseDamage`),
        deaths: deaths.map((death, index) => parseCoords(death, `${path}.deaths[${index}]`)),
        consumedObject,
        moneyAward,
      };
    }
    case "boost": return {
      ...base,
      type,
      start: parseCoords(event.start, `${path}.start`),
      end: parseCoords(event.end, `${path}.end`),
      target: parseCoords(event.target, `${path}.target`),
      unit: parseUnitOption(event.unit, `${path}.unit`),
      boostedUnit: parseUnitOption(event.boostedUnit, `${path}.boostedUnit`),
      consumedObject,
      moneyAward,
    };
    case "heal": return {
      ...base,
      type,
      start: parseCoords(event.start, `${path}.start`),
      end: parseCoords(event.end, `${path}.end`),
      target: parseCoords(event.target, `${path}.target`),
      unit: parseUnitOption(event.unit, `${path}.unit`),
      healedUnit: parseUnitOption(event.healedUnit, `${path}.healedUnit`),
      healedDamage: finiteNumber(event.healedDamage, `${path}.healedDamage`),
      consumedObject,
      moneyAward,
    };
    case "construct": return {
      ...base,
      type,
      worker: parseCoords(event.worker, `${path}.worker`),
      cell: parseCoords(event.cell, `${path}.cell`),
      building: enumValue<BuildingUnitOption>(event.building, buildingUnitOptions, `${path}.building`),
      cost: finiteNumber(event.cost, `${path}.cost`),
      consumedObject,
      moneyAward,
    };
    case "spawn": return {
      ...base,
      type,
      building: parseCoords(event.building, `${path}.building`),
      end: parseCoords(event.end, `${path}.end`),
      unit: enumValue<SpawnableUnitOption>(event.unit, spawnableUnitOptions, `${path}.unit`),
      cost: finiteNumber(event.cost, `${path}.cost`),
    };
    case "load": return {
      ...base,
      type,
      start: parseCoords(event.start, `${path}.start`),
      end: parseCoords(event.end, `${path}.end`),
      vehicle: parseCoords(event.vehicle, `${path}.vehicle`),
      unit: parseUnitOption(event.unit, `${path}.unit`),
      vehicleUnit: parseUnitOption(event.vehicleUnit, `${path}.vehicleUnit`),
      consumedObject,
      moneyAward,
    };
    case "unload": return {
      ...base,
      type,
      start: parseCoords(event.start, `${path}.start`),
      end: parseCoords(event.end, `${path}.end`),
      cell: parseCoords(event.cell, `${path}.cell`),
      unit: parseUnitOption(event.unit, `${path}.unit`),
      vehicleUnit: parseUnitOption(event.vehicleUnit, `${path}.vehicleUnit`),
      consumedObject,
      moneyAward,
    };
    case "endTurn": return {
      ...base,
      type,
      nextTeam: parseTeamOption(event.nextTeam, `${path}.nextTeam`),
      income: finiteNumber(event.income, `${path}.income`),
      money: parseMoney(event.money, `${path}.money`),
    };
    case "gameOver": return {
      ...base,
      type,
      winner: parseTeamOption(event.winner, `${path}.winner`),
    };
    default: throw new ContractValidationError(`${path}.type`, "expected a supported domain event");
  }
};

export const parseAppliedAction = (value: unknown): AppliedAction => {
  const applied = record(value, "appliedAction");
  const protocolVersion = nonNegativeInteger(applied.protocolVersion, "appliedAction.protocolVersion");
  if (protocolVersion !== CURRENT_GAME_PROTOCOL_VERSION) {
    throw new ContractValidationError("appliedAction.protocolVersion", `unsupported protocol version ${protocolVersion}`);
  }
  if (!Array.isArray(applied.events)) {
    throw new ContractValidationError("appliedAction.events", "expected an array");
  }
  return {
    protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
    actionId: string(applied.actionId, "appliedAction.actionId"),
    revision: nonNegativeInteger(applied.revision, "appliedAction.revision"),
    actorTeam: parseTeamOption(applied.actorTeam, "appliedAction.actorTeam"),
    action: parseGameAction(applied.action, "appliedAction.action"),
    events: applied.events.map((event, index) => parseDomainEvent(event, `appliedAction.events[${index}]`)),
  };
};
