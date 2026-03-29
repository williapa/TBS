import {
  GameAction,
  MapItem,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  getConstructionOptions,
  getConstructableCells,
  getSpawnableCells,
  getSpawnOptions,
  moveMapUnit,
  peopleUnitOptions,
  vehicleUnitOptions,
} from "@TBS/common";
import units from "../../components/Map/Unit/units";
import { moveableOptions } from "../../components/Map/Unit/unitOptions";
import prettyPrint from "../../utils/prettyPrint";

const emptyState = (): GameInteractionState => ({
  availableAttackTargets: [],
  availableConstructTargets: [],
  availableLoadTargets: [],
  availableMoveTargets: [],
  availableSpawnTargets: [],
  availableUnloadTargets: [],
  menu: null,
  mode: "idle",
  origin: null,
  pendingAction: null,
  previewDestination: null,
  selectedAttackTarget: null,
  selectedConstructBuilding: null,
  selectedConstructTarget: null,
  selectedLoadVehicle: null,
  selectedSpawnUnit: null,
  selectedUnit: null,
  selectedUnloadTarget: null,
});

const hasAttackTargets = (targets: number[]) => targets.length > 0;

const isConstructionWorker = (unit: UnitTypes) => unit === "constructionWorker";

const getCurrentActorCoords = (state: GameInteractionState) =>
  state.previewDestination ?? state.origin;

const getCellFromCoords = (map: HexMap, coords: Coords) => map[coords.x]?.[coords.y];

const getCellFromIndex = (map: HexMap, index: number) =>
  map.flat().find((cell) => cell.index === index);

const getCurrentActorCell = (map: HexMap, state: GameInteractionState) => {
  const coords = getCurrentActorCoords(state);

  return coords ? getCellFromCoords(map, coords) : undefined;
};

const buildUnitMenuOptions = (
  attackTargets: number[],
  allowConstruction: boolean,
  allowLoad: boolean,
  allowUnload: boolean
): GameMenuOption[] => {
  const options: GameMenuOption[] = [];

  options.push({ id: "move", label: "Move" });

  if (allowConstruction) {
    options.push({ id: "chooseConstruct", label: "Construct" });
  }

  if (allowLoad) {
    options.push({ id: "chooseLoad", label: "Load" });
  }

  if (allowUnload) {
    options.push({ id: "chooseUnload", label: "Unload" });
  }

  if (hasAttackTargets(attackTargets)) {
    options.push({ id: "chooseAttack", label: "Attack" });
  }

  options.push({ id: "cancel", label: "Cancel" });

  return options;
};

const buildAttackMenuOptions = (): GameMenuOption[] => [
  { id: "confirmAttack", label: "Confirm attack" },
  { id: "cancel", label: "Cancel" },
];

const buildConstructConfirmMenuOptions = (): GameMenuOption[] => [
  { id: "confirmConstruct", label: "Confirm construction" },
  { id: "cancel", label: "Cancel" },
];

const buildLoadConfirmMenuOptions = (): GameMenuOption[] => [
  { id: "confirmLoad", label: "Confirm load" },
  { id: "cancel", label: "Cancel" },
];

const buildSpawnConfirmMenuOptions = (): GameMenuOption[] => [
  { id: "confirmSpawn", label: "Confirm spawn" },
  { id: "cancel", label: "Cancel" },
];

const buildUnloadConfirmMenuOptions = (): GameMenuOption[] => [
  { id: "confirmUnload", label: "Confirm unload" },
  { id: "cancel", label: "Cancel" },
];

const buildSpawnMenuOptions = (buildingType: UnitTypes, availableFunds: number): GameMenuOption[] => {
  const affordableUnits = new Set(
    getSpawnOptions(buildingType, availableFunds).map(({ unit }) => unit)
  );
  const allOptions = getSpawnOptions(buildingType, Number.MAX_SAFE_INTEGER);

  return [
    ...allOptions.map(({ cost, unit }) => ({
      disabled: !affordableUnits.has(unit),
      id: `spawn:${unit}` as GameMenuActionId,
      label: `${units[unit].symbol} ${prettyPrint(unit)} ($${cost})`,
    })),
    { id: "cancel", label: "Cancel" },
  ];
};

const buildConstructionMenuOptions = (availableFunds: number): GameMenuOption[] => {
  const affordableBuildings = new Set(
    getConstructionOptions(availableFunds).map(({ building }) => building)
  );
  const allOptions = getConstructionOptions(Number.MAX_SAFE_INTEGER);

  return [
    ...allOptions.map(({ building, cost }) => ({
      disabled: !affordableBuildings.has(building),
      id: `construct:${building}` as GameMenuActionId,
      label: `${units[building].symbol} ${prettyPrint(building)} ($${cost})`,
    })),
    { id: "cancel", label: "Cancel" },
  ];
};

const getAttackOriginCell = (
  map: HexMap,
  origin: Coords | null,
  previewDestination: Coords | null
) => {
  if (previewDestination) {
    return getCellFromCoords(map, previewDestination);
  }

  if (origin) {
    return getCellFromCoords(map, origin);
  }

  return undefined;
};

export const getSelectableUnit = (mapItem: MapItem, activeTeam: TeamType) => {
  if (mapItem.team !== activeTeam || mapItem.moved) {
    return false;
  }

  return (
    moveableOptions.includes(mapItem.unit) ||
    getSpawnOptions(mapItem.unit, Number.MAX_SAFE_INTEGER).length > 0
  );
};

export const getMoveTargets = (mapItem: MapItem, map: HexMap) =>
  getAllCellsWhichCanBeReached(mapItem.index, map);

export const getAttackTargets = (
  activeTeam: "orange" | "purple" | "gray",
  map: HexMap,
  origin: Coords | null,
  previewDestination: Coords | null
) => {
  const attackOriginCell = getAttackOriginCell(map, origin, previewDestination);

  if (!attackOriginCell) {
    return [];
  }

  return getAttackableCells(activeTeam, [attackOriginCell.index], map);
};

const getConstructableMap = (state: GameInteractionState, map: HexMap) => {
  if (!state.origin || !state.previewDestination) {
    return map;
  }

  return moveMapUnit(
    map.map((row) => row.map((item) => ({ ...item }))),
    state.origin,
    state.previewDestination
  );
};

const getPreviewMap = (state: GameInteractionState, map: HexMap) => {
  if (!state.origin || !state.previewDestination) {
    return map;
  }

  return moveMapUnit(
    map.map((row) => row.map((item) => ({ ...item }))),
    state.origin,
    state.previewDestination
  );
};

const getLoadableVehicleIndexes = (
  map: HexMap,
  actorCoords: Coords | null,
  perspective: TeamType
) => {
  if (!actorCoords) {
    return [];
  }

  const actorCell = getCellFromCoords(map, actorCoords);

  if (!actorCell || !peopleUnitOptions.includes(actorCell.unit)) {
    return [];
  }

  return (actorCell.neighbors ?? []).filter((neighborIndex) => {
    const neighborCell = getCellFromIndex(map, neighborIndex);

    return Boolean(
      neighborCell &&
      neighborCell.team === perspective &&
      vehicleUnitOptions.includes(neighborCell.unit) &&
      !neighborCell.loadedUnit
    );
  });
};

const getUnloadableCellIndexes = (map: HexMap, actorCoords: Coords | null) => {
  if (!actorCoords) {
    return [];
  }

  const actorCell = getCellFromCoords(map, actorCoords);

  if (!actorCell || !vehicleUnitOptions.includes(actorCell.unit) || !actorCell.loadedUnit) {
    return [];
  }

  return (actorCell.neighbors ?? []).filter((neighborIndex) => {
    const neighborCell = getCellFromIndex(map, neighborIndex);

    return Boolean(
      neighborCell &&
      neighborCell.unit === "none" &&
      neighborCell.terrain !== "water"
    );
  });
};

export const getTargetedCellIndexes = (state: GameInteractionState) => {
  if (state.pendingAction === "attack") {
    return state.availableAttackTargets;
  }

  if (state.pendingAction === "construct") {
    return state.availableConstructTargets;
  }

  if (state.pendingAction === "load") {
    return state.availableLoadTargets;
  }

  if (state.pendingAction === "spawn") {
    return state.availableSpawnTargets;
  }

  if (state.pendingAction === "unload") {
    return state.availableUnloadTargets;
  }

  return state.availableMoveTargets;
};

export const getTargetType = (state: GameInteractionState): GameCellTargetType | null => {
  if (state.pendingAction === "attack" && state.availableAttackTargets.length > 0) {
    return "attack";
  }

  if (state.pendingAction === "construct" && state.availableConstructTargets.length > 0) {
    return "construct";
  }

  if (state.pendingAction === "load" && state.availableLoadTargets.length > 0) {
    return "load";
  }

  if (state.pendingAction === "spawn" && state.availableSpawnTargets.length > 0) {
    return "spawn";
  }

  if (state.pendingAction === "unload" && state.availableUnloadTargets.length > 0) {
    return "unload";
  }

  if (state.availableMoveTargets.length > 0) {
    return "move";
  }

  return null;
};

type InteractionReducerAction =
  | {
      type: "SELECT_ACTOR";
      unit: MapItem;
      map: HexMap;
      position: MenuPosition;
      availableFunds: number;
    }
  | {
      type: "OPEN_ORIGIN_MENU";
      position: MenuPosition;
      map: HexMap;
      perspective: TeamType;
      availableFunds: number;
    }
  | { type: "CHOOSE_MOVE_MODE"; map: HexMap }
  | { type: "CHOOSE_MOVE_TARGET"; cell: MapItem; position: MenuPosition; map: HexMap; perspective: TeamType }
  | { type: "CHOOSE_ATTACK_MODE"; map: HexMap; perspective: TeamType }
  | { type: "CHOOSE_CONSTRUCT_MODE"; availableFunds: number; map: HexMap; position: MenuPosition }
  | { type: "CHOOSE_CONSTRUCT_BUILDING"; building: BuildingType; map: HexMap }
  | { type: "CHOOSE_LOAD_MODE"; map: HexMap; perspective: TeamType }
  | { type: "SELECT_CONSTRUCT_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "SELECT_LOAD_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "SELECT_ATTACK_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "CHOOSE_SPAWN_UNIT"; map: HexMap; unit: SpawnableUnitType }
  | { type: "SELECT_SPAWN_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "CHOOSE_UNLOAD_MODE"; map: HexMap }
  | { type: "SELECT_UNLOAD_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "CANCEL_FLOW" }
  | { type: "RESET_AFTER_SERVER_EVENT" };

export const gameInteractionReducer = (
  state: GameInteractionState,
  action: InteractionReducerAction
): GameInteractionState => {
  switch (action.type) {
    case "SELECT_ACTOR": {
      const spawnOptions = buildSpawnMenuOptions(action.unit.unit, action.availableFunds);

      if (spawnOptions.length > 1) {
        return {
          availableAttackTargets: [],
          availableConstructTargets: [],
          availableLoadTargets: [],
          availableMoveTargets: [],
          availableSpawnTargets: [],
          availableUnloadTargets: [],
          menu: {
            cellIndex: action.unit.index,
            kind: "origin",
            options: spawnOptions,
            position: action.position,
          },
          mode: "actionMenu",
          origin: { x: action.unit.row, y: action.unit.column },
          pendingAction: null,
          previewDestination: null,
          selectedAttackTarget: null,
          selectedConstructBuilding: null,
          selectedConstructTarget: null,
          selectedLoadVehicle: null,
          selectedSpawnUnit: null,
          selectedUnit: action.unit,
          selectedUnloadTarget: null,
        };
      }

      return {
        availableAttackTargets: [],
        availableConstructTargets: [],
        availableLoadTargets: [],
        availableMoveTargets: getMoveTargets(action.unit, action.map),
        availableSpawnTargets: [],
        availableUnloadTargets: [],
        menu: null,
        mode: "unitSelected",
        origin: { x: action.unit.row, y: action.unit.column },
        pendingAction: null,
        previewDestination: null,
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnit: action.unit,
        selectedUnloadTarget: null,
      };
    }
    case "OPEN_ORIGIN_MENU": {
      if (!state.selectedUnit || !state.origin) {
        return state;
      }

      const previewMap = getPreviewMap(state, action.map);
      const spawnOptions = buildSpawnMenuOptions(state.selectedUnit.unit, action.availableFunds);
      const attackTargets = getAttackTargets(
        action.perspective,
        previewMap,
        state.origin,
        state.previewDestination
      );
      const actorCoords = getCurrentActorCoords(state);
      const loadTargets = getLoadableVehicleIndexes(previewMap, actorCoords, action.perspective);
      const unloadTargets = getUnloadableCellIndexes(previewMap, actorCoords);
      const allowConstruction = isConstructionWorker(state.selectedUnit.unit);

      return {
        ...state,
        availableAttackTargets: attackTargets,
        availableConstructTargets: [],
        availableLoadTargets: loadTargets,
        availableSpawnTargets: [],
        availableUnloadTargets: unloadTargets,
        menu: {
          cellIndex: getCurrentActorCell(previewMap, state)?.index ?? state.selectedUnit.index,
          kind: "origin",
          options: spawnOptions.length > 1
            ? spawnOptions
            : buildUnitMenuOptions(
                attackTargets,
                allowConstruction,
                loadTargets.length > 0,
                unloadTargets.length > 0
              ),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "CHOOSE_MOVE_MODE": {
      if (!state.selectedUnit) {
        return state;
      }

      return {
        ...state,
        availableAttackTargets: [],
        availableConstructTargets: [],
        availableLoadTargets: [],
        availableMoveTargets: getMoveTargets(state.selectedUnit, action.map),
        availableSpawnTargets: [],
        availableUnloadTargets: [],
        menu: null,
        mode: "unitSelected",
        pendingAction: null,
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "CHOOSE_MOVE_TARGET": {
      if (!state.selectedUnit || !state.origin) {
        return state;
      }

      const previewDestination = { x: action.cell.row, y: action.cell.column };
      const previewState = {
        ...state,
        previewDestination,
      };
      const previewMap = getPreviewMap(previewState, action.map);
      const attackTargets = getAttackTargets(
        action.perspective,
        previewMap,
        state.origin,
        previewDestination
      );
      const loadTargets = getLoadableVehicleIndexes(previewMap, previewDestination, action.perspective);
      const unloadTargets = getUnloadableCellIndexes(previewMap, previewDestination);

      return {
        ...state,
        availableAttackTargets: attackTargets,
        availableConstructTargets: [],
        availableLoadTargets: loadTargets,
        availableSpawnTargets: [],
        availableUnloadTargets: unloadTargets,
        menu: {
          cellIndex: action.cell.index,
          kind: "move",
          options: buildUnitMenuOptions(
            attackTargets,
            isConstructionWorker(state.selectedUnit.unit),
            loadTargets.length > 0,
            unloadTargets.length > 0
          ),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        previewDestination,
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "CHOOSE_ATTACK_MODE": {
      if (!state.selectedUnit || !state.origin) {
        return state;
      }

      return {
        ...state,
        availableAttackTargets: getAttackTargets(
          action.perspective,
          action.map,
          state.origin,
          state.previewDestination
        ),
        availableConstructTargets: [],
        availableLoadTargets: [],
        availableSpawnTargets: [],
        availableUnloadTargets: [],
        menu: null,
        mode: "targetingAttack",
        pendingAction: "attack",
      };
    }
    case "CHOOSE_CONSTRUCT_MODE": {
      if (!state.selectedUnit) {
        return state;
      }

      const actorCell = getCurrentActorCell(action.map, state);

      if (!actorCell) {
        return state;
      }

      return {
        ...state,
        availableAttackTargets: [],
        availableConstructTargets: [],
        availableLoadTargets: [],
        availableMoveTargets: [],
        availableSpawnTargets: [],
        availableUnloadTargets: [],
        menu: {
          cellIndex: actorCell.index,
          kind: "constructSelection",
          options: buildConstructionMenuOptions(action.availableFunds),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "CHOOSE_CONSTRUCT_BUILDING": {
      const currentCoords = getCurrentActorCoords(state);

      if (!currentCoords) {
        return state;
      }

      return {
        ...state,
        availableAttackTargets: [],
        availableMoveTargets: [],
        availableConstructTargets: getConstructableCells(
          getConstructableMap(state, action.map),
          currentCoords,
          action.building
        ),
        availableLoadTargets: [],
        availableSpawnTargets: [],
        availableUnloadTargets: [],
        menu: null,
        mode: "targetingConstruct",
        pendingAction: "construct",
        selectedAttackTarget: null,
        selectedConstructBuilding: action.building,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "CHOOSE_LOAD_MODE": {
      const currentCoords = getCurrentActorCoords(state);
      const previewMap = getPreviewMap(state, action.map);

      return {
        ...state,
        availableAttackTargets: [],
        availableConstructTargets: [],
        availableLoadTargets: getLoadableVehicleIndexes(previewMap, currentCoords, action.perspective),
        availableMoveTargets: [],
        availableSpawnTargets: [],
        availableUnloadTargets: [],
        menu: null,
        mode: "targetingLoad",
        pendingAction: "load",
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "SELECT_CONSTRUCT_TARGET": {
      return {
        ...state,
        menu: {
          cellIndex: action.cell.index,
          kind: "construct",
          options: buildConstructConfirmMenuOptions(),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: "construct",
        selectedConstructTarget: { x: action.cell.row, y: action.cell.column },
      };
    }
    case "SELECT_LOAD_TARGET": {
      return {
        ...state,
        menu: {
          cellIndex: action.cell.index,
          kind: "load",
          options: buildLoadConfirmMenuOptions(),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: "load",
        selectedLoadVehicle: { x: action.cell.row, y: action.cell.column },
      };
    }
    case "SELECT_ATTACK_TARGET": {
      return {
        ...state,
        menu: {
          cellIndex: action.cell.index,
          kind: "attack",
          options: buildAttackMenuOptions(),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: "attack",
        selectedAttackTarget: { x: action.cell.row, y: action.cell.column },
      };
    }
    case "CHOOSE_SPAWN_UNIT": {
      if (!state.origin) {
        return state;
      }

      return {
        ...state,
        availableAttackTargets: [],
        availableMoveTargets: [],
        availableConstructTargets: [],
        availableLoadTargets: [],
        availableSpawnTargets: getSpawnableCells(action.map, state.origin, action.unit),
        availableUnloadTargets: [],
        menu: null,
        mode: "targetingSpawn",
        pendingAction: "spawn",
        previewDestination: null,
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: action.unit,
        selectedUnloadTarget: null,
      };
    }
    case "SELECT_SPAWN_TARGET": {
      return {
        ...state,
        menu: {
          cellIndex: action.cell.index,
          kind: "spawn",
          options: buildSpawnConfirmMenuOptions(),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: "spawn",
        previewDestination: { x: action.cell.row, y: action.cell.column },
      };
    }
    case "CHOOSE_UNLOAD_MODE": {
      const currentCoords = getCurrentActorCoords(state);
      const previewMap = getPreviewMap(state, action.map);

      return {
        ...state,
        availableAttackTargets: [],
        availableConstructTargets: [],
        availableLoadTargets: [],
        availableMoveTargets: [],
        availableSpawnTargets: [],
        availableUnloadTargets: getUnloadableCellIndexes(previewMap, currentCoords),
        menu: null,
        mode: "targetingUnload",
        pendingAction: "unload",
        selectedAttackTarget: null,
        selectedConstructBuilding: null,
        selectedConstructTarget: null,
        selectedLoadVehicle: null,
        selectedSpawnUnit: null,
        selectedUnloadTarget: null,
      };
    }
    case "SELECT_UNLOAD_TARGET": {
      return {
        ...state,
        menu: {
          cellIndex: action.cell.index,
          kind: "unload",
          options: buildUnloadConfirmMenuOptions(),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: "unload",
        selectedUnloadTarget: { x: action.cell.row, y: action.cell.column },
      };
    }
    case "CANCEL_FLOW":
    case "RESET_AFTER_SERVER_EVENT":
      return emptyState();
    default:
      return state;
  }
};

export const createInitialGameInteractionState = emptyState;

export const buildMoveAction = (state: GameInteractionState): GameAction | null => {
  if (!state.origin || !state.previewDestination) {
    return null;
  }

  return {
    action: "move",
    end: state.previewDestination,
    start: state.origin,
  };
};

export const buildAttackAction = (state: GameInteractionState): GameAction | null => {
  if (!state.origin || !state.selectedAttackTarget) {
    return null;
  }

  return {
    action: "attack",
    attacker: state.origin,
    defender: state.selectedAttackTarget,
    end: state.previewDestination ?? state.origin,
  };
};

export const buildConstructAction = (state: GameInteractionState): GameAction | null => {
  if (!state.origin || !state.selectedConstructBuilding || !state.selectedConstructTarget) {
    return null;
  }

  return {
    action: "construct",
    building: state.selectedConstructBuilding,
    cell: state.selectedConstructTarget,
    end: state.previewDestination ?? state.origin,
    worker: state.origin,
  };
};

export const buildLoadAction = (state: GameInteractionState): GameAction | null => {
  if (!state.origin || !state.selectedLoadVehicle) {
    return null;
  }

  return {
    action: "load",
    end: state.previewDestination ?? state.origin,
    start: state.origin,
    vehicle: state.selectedLoadVehicle,
  };
};

export const buildSpawnAction = (state: GameInteractionState): GameAction | null => {
  if (!state.origin || !state.previewDestination || !state.selectedSpawnUnit) {
    return null;
  }

  return {
    action: "spawn",
    building: state.origin,
    end: state.previewDestination,
    unit: state.selectedSpawnUnit,
  };
};

export const buildUnloadAction = (state: GameInteractionState): GameAction | null => {
  if (!state.origin || !state.selectedUnloadTarget) {
    return null;
  }

  return {
    action: "unload",
    cell: state.selectedUnloadTarget,
    end: state.previewDestination ?? state.origin,
    start: state.origin,
  };
};
