import {
  getHexNeighbors,
  hexKey,
  type EntityId,
  type EntityState,
  type GameState,
  type HexCoord,
  type TeamId,
  type UnitTypeId,
} from "@TBS/game-core";
import {
  STANDARD_ACTION_CANDIDATE_VERSION,
  STANDARD_CONTENT_VERSION,
  STANDARD_MAX_TURNS,
  STANDARD_RULESET_VERSION,
  getActionableEntityIds,
  getConstructionOption,
  getProductionOptions,
  getTeamIncome,
  getUnitCost,
  standardTeamIds,
  standardTerrainTypeIds,
  standardUnits,
  unitCapabilities,
  unitCategories,
  type StandardAction,
  type StandardActionCandidateSet,
} from "@TBS/game-rules";

export const STANDARD_OBSERVATION_ENCODING_VERSION = "standard-observation@1" as const;

export const standardActionTypes: readonly StandardAction["type"][] = [
  "attack",
  "boost",
  "construct",
  "end-turn",
  "heal",
  "load",
  "move",
  "spawn",
  "unload",
];

export const standardObservationUnitTypeIds: readonly UnitTypeId[] =
  [...standardUnits.keys()].sort((left, right) => left.localeCompare(right));

export const STANDARD_OBSERVATION_NORMALIZATION = {
  attack: 100,
  cargoCapacity: 4,
  cost: 10_000,
  defense: 100,
  health: 100,
  income: 10_000,
  money: 10_000,
  movement: 5,
  productionOptionCount: 4,
  statusCount: 4,
  turn: STANDARD_MAX_TURNS,
} as const;

const oneHotNames = (prefix: string, values: readonly string[]): readonly string[] =>
  values.map((value) => `${prefix}:${value}`);

export const STANDARD_CELL_FEATURE_NAMES: readonly string[] = [
  "geometry:q",
  "geometry:r",
  "geometry:s",
  ...oneHotNames("terrain", standardTerrainTypeIds),
  "occupied",
  "objective:capital",
  "objective:capital:self",
  "objective:capital:opponent",
  "objective:capital:neutral",
];

export const STANDARD_ENTITY_FEATURE_NAMES: readonly string[] = [
  "owner:self",
  "owner:opponent",
  "owner:neutral",
  ...oneHotNames("unit", standardObservationUnitTypeIds),
  ...oneHotNames("category", unitCategories),
  ...oneHotNames("capability", unitCapabilities),
  "health:present",
  "health:fraction",
  "health:maximum",
  "base:movement",
  "base:attack",
  "base:defense",
  "economy:income",
  "economy:unit-cost",
  "action-budget:present",
  "action-budget:moved",
  "action-budget:acted",
  "location:on-board",
  "location:transported",
  "status:count",
  "status:boosted",
  "status:maximum-remaining-turns",
  "cargo:present",
  "cargo:capacity",
  "cargo:load-fraction",
  "production:option-count",
  "production:minimum-cost",
  "production:maximum-cost",
  "construction:cost",
];

export const STANDARD_CANDIDATE_FEATURE_NAMES: readonly string[] = [
  ...oneHotNames("action", standardActionTypes),
  "relation:actor",
  "relation:destination",
  "relation:target-entity",
  "relation:target-cell",
  "production:choice",
  ...oneHotNames("production:unit", standardObservationUnitTypeIds),
  "production:cost",
];

export const STANDARD_GLOBAL_FEATURE_NAMES: readonly string[] = [
  "turn:observer-is-actor",
  "turn:number",
  "turn:remaining",
  "turn:observer-actionable-entities",
  "turn:actor-actionable-entities",
  "economy:self-money",
  "economy:opponent-money",
  "economy:self-income",
  "economy:opponent-income",
  "objective:eliminate-self",
  "objective:eliminate-opponent",
  "objective:self-capital",
  "objective:opponent-capital",
  "map:q-extent",
  "map:r-extent",
  "map:cell-count",
  "map:entity-count",
  "map:candidate-count",
];

export type StandardObservationLimits = Readonly<{
  cellCount: number;
  maxEntities: number;
  maxCandidates: number;
}>;

export type StandardObservationTensors = Readonly<{
  cellFeatures: readonly (readonly number[])[];
  cellMask: readonly number[];
  cellNeighbors: readonly (readonly number[])[];
  entityFeatures: readonly (readonly number[])[];
  entityMask: readonly number[];
  entityCells: readonly number[];
  entityCarriers: readonly number[];
  candidateFeatures: readonly (readonly number[])[];
  candidateMask: readonly number[];
  candidateActors: readonly number[];
  candidateDestinations: readonly number[];
  candidateTargetEntities: readonly number[];
  candidateTargetCells: readonly number[];
  globalFeatures: readonly number[];
}>;

export type EncodedStandardObservation = Readonly<{
  version: typeof STANDARD_OBSERVATION_ENCODING_VERSION;
  candidateVersion: typeof STANDARD_ACTION_CANDIDATE_VERSION;
  stateRevision: number;
  observerTeamId: TeamId;
  actorTeamId: TeamId;
  limits: StandardObservationLimits;
  candidateKeys: readonly string[];
  tensors: StandardObservationTensors;
}>;

export type EncodeStandardObservationInput = Readonly<{
  state: GameState;
  observerTeamId: TeamId;
  candidateSet: StandardActionCandidateSet;
  limits: StandardObservationLimits;
}>;

const ratio = (value: number, scale: number): number => value / scale;

const oneHot = <Value extends string>(values: readonly Value[], selected: Value | undefined): number[] =>
  values.map((value) => Number(value === selected));

const sortedCells = (state: GameState) => Object.values(state.board.cells)
  .sort((left, right) => left.position.q - right.position.q || left.position.r - right.position.r);

const boundsFor = (positions: readonly HexCoord[]) => {
  const q = positions.map(({ q: value }) => value);
  const r = positions.map(({ r: value }) => value);
  const s = positions.map(({ q: qValue, r: rValue }) => -qValue - rValue);
  return {
    q: { minimum: Math.min(...q), maximum: Math.max(...q) },
    r: { minimum: Math.min(...r), maximum: Math.max(...r) },
    s: { minimum: Math.min(...s), maximum: Math.max(...s) },
  };
};

const normalizedCoordinate = (value: number, minimum: number, maximum: number): number =>
  maximum === minimum ? 0 : ((value - minimum) / (maximum - minimum)) * 2 - 1;

const ownerFeatures = (ownerTeamId: TeamId | undefined, observerTeamId: TeamId): readonly number[] => [
  Number(ownerTeamId === observerTeamId),
  Number(Boolean(ownerTeamId) && ownerTeamId !== observerTeamId),
  Number(ownerTeamId === undefined),
];

const orderedEntities = (state: GameState, cells: ReturnType<typeof sortedCells>): readonly EntityState[] => {
  const entities: EntityState[] = [];
  const visited = new Set<EntityId>();
  const visit = (id: EntityId): void => {
    if (visited.has(id)) throw new Error(`entity relationship contains a duplicate or cycle: ${id}`);
    const entity = state.entities[id];
    if (!entity) throw new Error(`entity relationship references missing entity: ${id}`);
    visited.add(id);
    entities.push(entity);
    for (const cargoId of entity.cargo?.entityIds ?? []) visit(cargoId);
  };
  for (const cell of cells) {
    if (cell.occupantEntityId) visit(cell.occupantEntityId);
  }
  if (visited.size !== Object.keys(state.entities).length) {
    throw new Error("observation cannot encode an entity outside the board/cargo graph");
  }
  return entities;
};

const requirePositiveInteger = (value: number, label: string): void => {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${label} must be a positive safe integer`);
};

const validateInput = ({ state, observerTeamId, candidateSet, limits }: EncodeStandardObservationInput): void => {
  requirePositiveInteger(limits.cellCount, "cellCount");
  requirePositiveInteger(limits.maxEntities, "maxEntities");
  requirePositiveInteger(limits.maxCandidates, "maxCandidates");
  if (state.rulesetVersion !== STANDARD_RULESET_VERSION) {
    throw new Error(`observation encoding requires ${STANDARD_RULESET_VERSION}`);
  }
  if (state.contentVersion !== STANDARD_CONTENT_VERSION) {
    throw new Error(`observation encoding requires content ${STANDARD_CONTENT_VERSION}`);
  }
  if (!state.teams[observerTeamId]) throw new Error("observer team is not present in the state");
  if (state.lifecycle.phase !== "active") throw new Error("policy observations require an active game");
  if (candidateSet.version !== STANDARD_ACTION_CANDIDATE_VERSION) {
    throw new Error("candidate encoding version is unsupported");
  }
  if (candidateSet.stateRevision !== state.revision) throw new Error("candidate set revision is stale");
  if (candidateSet.actorTeamId !== state.lifecycle.activeTeamId) throw new Error("candidate actor is not active");
  if (Object.keys(state.board.cells).length !== limits.cellCount) {
    throw new Error(`state cell count does not match model limit: expected ${limits.cellCount}`);
  }
  if (Object.keys(state.entities).length > limits.maxEntities) throw new Error("model entity limit exceeded");
  if (candidateSet.candidates.length > limits.maxCandidates) throw new Error("model candidate limit exceeded");
  if (standardTeamIds.some((teamId) => !state.teams[teamId]) || Object.keys(state.teams).length !== 2) {
    throw new Error("standard observation encoding requires exactly the two standard teams");
  }
};

const targetEntityId = (action: StandardAction): EntityId | undefined => {
  switch (action.type) {
    case "attack": return action.defenderId;
    case "boost":
    case "heal": return action.targetId;
    case "load": return action.vehicleId;
    default: return undefined;
  }
};

const targetCell = (action: StandardAction): HexCoord | undefined => {
  switch (action.type) {
    case "move": return action.objectTarget;
    case "construct": return action.constructionPosition;
    case "unload": return action.unloadPosition;
    default: return undefined;
  }
};

const actorId = (action: StandardAction): EntityId | undefined =>
  action.type === "end-turn" ? undefined : action.actorId;

const destination = (action: StandardAction): HexCoord | undefined =>
  action.type === "end-turn" ? undefined : action.destination;

const productionChoice = (action: StandardAction): UnitTypeId | undefined => {
  switch (action.type) {
    case "construct": return action.buildingUnitTypeId;
    case "spawn": return action.unitTypeId;
    default: return undefined;
  }
};

const requireIndex = <Key>(lookup: ReadonlyMap<Key, number>, key: Key | undefined, label: string): number => {
  if (key === undefined) return -1;
  const index = lookup.get(key);
  if (index === undefined) throw new Error(`${label} is not represented in the observation graph`);
  return index;
};

const entityFeatures = (entity: EntityState, observerTeamId: TeamId): readonly number[] => {
  const definition = standardUnits.get(entity.unitTypeId);
  if (!definition) throw new Error(`missing standard unit definition: ${entity.unitTypeId}`);
  const unsupportedStatus = entity.statuses.find(({ type }) => type !== "boosted");
  if (unsupportedStatus) throw new Error(`unsupported standard status: ${unsupportedStatus.type}`);
  const production = getProductionOptions(entity.unitTypeId);
  const productionCosts = production.map(({ cost }) => cost);
  const unitCost = getUnitCost(entity.unitTypeId) ?? 0;
  const constructionCost = getConstructionOption(entity.unitTypeId)?.cost ?? 0;
  const cargoCount = entity.cargo?.entityIds.length ?? 0;
  const cargoCapacity = entity.cargo?.capacity ?? 0;
  return [
    ...ownerFeatures(entity.ownerTeamId, observerTeamId),
    ...oneHot(standardObservationUnitTypeIds, entity.unitTypeId),
    ...oneHot(unitCategories, definition.category),
    ...unitCapabilities.map((capability) => Number(definition.capabilities.includes(capability))),
    Number(Boolean(entity.health)),
    entity.health ? ratio(entity.health.current, entity.health.maximum) : 0,
    ratio(entity.health?.maximum ?? 0, STANDARD_OBSERVATION_NORMALIZATION.health),
    ratio(definition.base.movement, STANDARD_OBSERVATION_NORMALIZATION.movement),
    ratio(definition.base.attack, STANDARD_OBSERVATION_NORMALIZATION.attack),
    ratio(definition.base.defense, STANDARD_OBSERVATION_NORMALIZATION.defense),
    ratio(definition.income, STANDARD_OBSERVATION_NORMALIZATION.income),
    ratio(unitCost, STANDARD_OBSERVATION_NORMALIZATION.cost),
    Number(Boolean(entity.actionBudget)),
    Number(entity.actionBudget?.moved ?? false),
    Number(entity.actionBudget?.acted ?? false),
    Number(Boolean(entity.position)),
    Number(!entity.position),
    ratio(entity.statuses.length, STANDARD_OBSERVATION_NORMALIZATION.statusCount),
    Number(entity.statuses.some(({ type }) => type === "boosted")),
    ratio(Math.max(0, ...entity.statuses.map(({ remainingTurns }) => remainingTurns ?? 0)), STANDARD_MAX_TURNS),
    Number(Boolean(entity.cargo)),
    ratio(cargoCapacity, STANDARD_OBSERVATION_NORMALIZATION.cargoCapacity),
    cargoCapacity > 0 ? cargoCount / cargoCapacity : 0,
    ratio(production.length, STANDARD_OBSERVATION_NORMALIZATION.productionOptionCount),
    ratio(productionCosts.length > 0 ? Math.min(...productionCosts) : 0, STANDARD_OBSERVATION_NORMALIZATION.cost),
    ratio(productionCosts.length > 0 ? Math.max(...productionCosts) : 0, STANDARD_OBSERVATION_NORMALIZATION.cost),
    ratio(constructionCost, STANDARD_OBSERVATION_NORMALIZATION.cost),
  ];
};

export const encodeStandardObservation = (input: EncodeStandardObservationInput): EncodedStandardObservation => {
  validateInput(input);
  const { state, observerTeamId, candidateSet, limits } = input;
  const cells = sortedCells(state);
  const entities = orderedEntities(state, cells);
  const cellIndexByKey = new Map(cells.map((cell, index) => [hexKey(cell.position), index]));
  const entityIndexById = new Map(entities.map((entity, index) => [entity.id, index]));
  const carrierByCargoId = new Map<EntityId, EntityId>();
  for (const entity of entities) {
    for (const cargoId of entity.cargo?.entityIds ?? []) carrierByCargoId.set(cargoId, entity.id);
  }
  const coordinateBounds = boundsFor(cells.map(({ position }) => position));
  const capitalObjectiveByCell = new Map(state.objectives.flatMap((objective) =>
    objective.type === "capital" ? [[hexKey(objective.position), objective] as const] : []));

  const cellFeatures = cells.map((cell): readonly number[] => {
    const capital = capitalObjectiveByCell.get(hexKey(cell.position));
    const control = capital?.controllingTeamId;
    return [
      normalizedCoordinate(cell.position.q, coordinateBounds.q.minimum, coordinateBounds.q.maximum),
      normalizedCoordinate(cell.position.r, coordinateBounds.r.minimum, coordinateBounds.r.maximum),
      normalizedCoordinate(-cell.position.q - cell.position.r, coordinateBounds.s.minimum, coordinateBounds.s.maximum),
      ...oneHot(standardTerrainTypeIds, cell.terrainTypeId),
      Number(Boolean(cell.occupantEntityId)),
      Number(Boolean(capital)),
      Number(Boolean(capital) && control === observerTeamId),
      Number(Boolean(capital) && Boolean(control) && control !== observerTeamId),
      Number(Boolean(capital) && control === undefined),
    ];
  });
  const cellNeighbors = cells.map(({ position }) => getHexNeighbors(position)
    .map((neighbor) => cellIndexByKey.get(hexKey(neighbor)) ?? -1));

  const encodedEntityFeatures = entities.map((entity) => entityFeatures(entity, observerTeamId));
  const entityCells = entities.map((entity) => requireIndex(
    cellIndexByKey,
    entity.position ? hexKey(entity.position) : undefined,
    "entity cell",
  ));
  const entityCarriers = entities.map((entity) => requireIndex(
    entityIndexById,
    carrierByCargoId.get(entity.id),
    "cargo carrier",
  ));

  const candidateFeatures = candidateSet.candidates.map(({ action }): readonly number[] => {
    const choice = productionChoice(action);
    return [
      ...oneHot(standardActionTypes, action.type),
      Number(Boolean(actorId(action))),
      Number(Boolean(destination(action))),
      Number(Boolean(targetEntityId(action))),
      Number(Boolean(targetCell(action))),
      Number(Boolean(choice)),
      ...oneHot(standardObservationUnitTypeIds, choice),
      ratio(choice ? getUnitCost(choice) ?? 0 : 0, STANDARD_OBSERVATION_NORMALIZATION.cost),
    ];
  });
  const candidateActors = candidateSet.candidates.map(({ action }) => requireIndex(
    entityIndexById,
    actorId(action),
    "candidate actor",
  ));
  const candidateDestinations = candidateSet.candidates.map(({ action }) => {
    const position = destination(action);
    return requireIndex(cellIndexByKey, position ? hexKey(position) : undefined, "candidate destination");
  });
  const candidateTargetEntities = candidateSet.candidates.map(({ action }) => requireIndex(
    entityIndexById,
    targetEntityId(action),
    "candidate target entity",
  ));
  const candidateTargetCells = candidateSet.candidates.map(({ action }) => {
    const position = targetCell(action);
    return requireIndex(cellIndexByKey, position ? hexKey(position) : undefined, "candidate target cell");
  });

  const actorTeamId = candidateSet.actorTeamId;
  const opponentTeamId = standardTeamIds.find((teamId) => teamId !== observerTeamId);
  if (!opponentTeamId) throw new Error("standard opponent team is unavailable");
  const remainingTurns = Math.max(0, STANDARD_MAX_TURNS - state.turn.number + 1);
  const selfCapitalCount = state.objectives.filter((objective) =>
    objective.type === "capital" && objective.controllingTeamId === observerTeamId).length;
  const opponentCapitalCount = state.objectives.filter((objective) =>
    objective.type === "capital" && objective.controllingTeamId === opponentTeamId).length;
  const qExtent = coordinateBounds.q.maximum - coordinateBounds.q.minimum;
  const rExtent = coordinateBounds.r.maximum - coordinateBounds.r.minimum;
  const globalFeatures = [
    Number(observerTeamId === actorTeamId),
    ratio(state.turn.number, STANDARD_MAX_TURNS),
    ratio(remainingTurns, STANDARD_MAX_TURNS),
    ratio(getActionableEntityIds(state, observerTeamId).length, limits.maxEntities),
    ratio(getActionableEntityIds(state, actorTeamId).length, limits.maxEntities),
    ratio(state.teams[observerTeamId]?.money ?? 0, STANDARD_OBSERVATION_NORMALIZATION.money),
    ratio(state.teams[opponentTeamId]?.money ?? 0, STANDARD_OBSERVATION_NORMALIZATION.money),
    ratio(getTeamIncome(state, observerTeamId), STANDARD_OBSERVATION_NORMALIZATION.income),
    ratio(getTeamIncome(state, opponentTeamId), STANDARD_OBSERVATION_NORMALIZATION.income),
    Number(state.objectives.some((objective) => objective.type === "elimination" && objective.teamId === observerTeamId)),
    Number(state.objectives.some((objective) => objective.type === "elimination" && objective.teamId === opponentTeamId)),
    ratio(selfCapitalCount, 2),
    ratio(opponentCapitalCount, 2),
    ratio(qExtent, limits.cellCount),
    ratio(rExtent, limits.cellCount),
    ratio(cells.length, limits.cellCount),
    ratio(entities.length, limits.maxEntities),
    ratio(candidateSet.candidates.length, limits.maxCandidates),
  ];

  return {
    version: STANDARD_OBSERVATION_ENCODING_VERSION,
    candidateVersion: candidateSet.version,
    stateRevision: state.revision,
    observerTeamId,
    actorTeamId,
    limits,
    candidateKeys: candidateSet.candidates.map(({ key }) => key),
    tensors: {
      cellFeatures,
      cellMask: cells.map(() => 1),
      cellNeighbors,
      entityFeatures: encodedEntityFeatures,
      entityMask: entities.map(() => 1),
      entityCells,
      entityCarriers,
      candidateFeatures,
      candidateMask: candidateSet.candidates.map(() => 1),
      candidateActors,
      candidateDestinations,
      candidateTargetEntities,
      candidateTargetCells,
      globalFeatures,
    },
  };
};
