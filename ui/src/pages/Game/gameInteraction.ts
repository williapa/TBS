import {
  GameAction,
  MapItem,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  getSpawnableCells,
  getSpawnOptions,
} from "@TBS/common";
import units from "../../components/Map/Unit/units";
import { moveableOptions } from "../../components/Map/Unit/unitOptions";
import prettyPrint from "../../utils/prettyPrint";

const emptyState = (): GameInteractionState => ({
  availableAttackTargets: [],
  availableMoveTargets: [],
  availableSpawnTargets: [],
  menu: null,
  mode: "idle",
  origin: null,
  pendingAction: null,
  previewDestination: null,
  selectedAttackTarget: null,
  selectedSpawnUnit: null,
  selectedUnit: null,
});

const hasAttackTargets = (targets: number[]) => targets.length > 0;

const buildMoveMenuOptions = (attackTargets: number[]): GameMenuOption[] => {
  const options: GameMenuOption[] = [];

  if (hasAttackTargets(attackTargets)) {
    options.push({ id: "chooseAttack", label: "Attack" });
  }

  options.push({ id: "move", label: "Move" });
  options.push({ id: "cancel", label: "Cancel" });

  return options;
};

const buildAttackMenuOptions = (): GameMenuOption[] => [
  { id: "confirmAttack", label: "Confirm attack" },
  { id: "cancel", label: "Cancel" },
];

const buildSpawnConfirmMenuOptions = (): GameMenuOption[] => [
  { id: "confirmSpawn", label: "Confirm spawn" },
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

const getCellFromCoords = (map: HexMap, coords: Coords) => map[coords.x]?.[coords.y];

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

export const getTargetedCellIndexes = (state: GameInteractionState) => {
  if (state.pendingAction === "attack") {
    return state.availableAttackTargets;
  }

  if (state.pendingAction === "spawn") {
    return state.availableSpawnTargets;
  }

  return state.availableMoveTargets;
};

export const getTargetType = (state: GameInteractionState): GameCellTargetType | null => {
  if (state.pendingAction === "attack" && state.availableAttackTargets.length > 0) {
    return "attack";
  }

  if (state.pendingAction === "spawn" && state.availableSpawnTargets.length > 0) {
    return "spawn";
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
  | { type: "CHOOSE_MOVE_TARGET"; cell: MapItem; position: MenuPosition; map: HexMap; perspective: TeamType }
  | { type: "CHOOSE_ATTACK_MODE"; map: HexMap; perspective: TeamType }
  | { type: "SELECT_ATTACK_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "CHOOSE_SPAWN_UNIT"; map: HexMap; unit: SpawnableUnitType }
  | { type: "SELECT_SPAWN_TARGET"; cell: MapItem; position: MenuPosition }
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
          availableMoveTargets: [],
          availableSpawnTargets: [],
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
          selectedSpawnUnit: null,
          selectedUnit: action.unit,
        };
      }

      return {
        availableAttackTargets: [],
        availableMoveTargets: getMoveTargets(action.unit, action.map),
        availableSpawnTargets: [],
        menu: null,
        mode: "unitSelected",
        origin: { x: action.unit.row, y: action.unit.column },
        pendingAction: null,
        previewDestination: null,
        selectedAttackTarget: null,
        selectedSpawnUnit: null,
        selectedUnit: action.unit,
      };
    }
    case "OPEN_ORIGIN_MENU": {
      if (!state.selectedUnit || !state.origin) {
        return state;
      }

      const spawnOptions = buildSpawnMenuOptions(state.selectedUnit.unit, action.availableFunds);
      const attackTargets = getAttackTargets(action.perspective, action.map, state.origin, null);

      return {
        ...state,
        availableAttackTargets: attackTargets,
        availableSpawnTargets: [],
        menu: {
          cellIndex: state.selectedUnit.index,
          kind: "origin",
          options: spawnOptions.length > 1 ? spawnOptions : buildMoveMenuOptions(attackTargets),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        previewDestination: null,
        selectedAttackTarget: null,
        selectedSpawnUnit: null,
      };
    }
    case "CHOOSE_MOVE_TARGET": {
      if (!state.selectedUnit || !state.origin) {
        return state;
      }

      const previewDestination = { x: action.cell.row, y: action.cell.column };
      const attackTargets = getAttackTargets(
        action.perspective,
        action.map,
        state.origin,
        previewDestination
      );

      return {
        ...state,
        availableAttackTargets: attackTargets,
        availableSpawnTargets: [],
        menu: {
          cellIndex: action.cell.index,
          kind: "move",
          options: buildMoveMenuOptions(attackTargets),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        previewDestination,
        selectedAttackTarget: null,
        selectedSpawnUnit: null,
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
        availableSpawnTargets: [],
        menu: null,
        mode: "targetingAttack",
        pendingAction: "attack",
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
        availableSpawnTargets: getSpawnableCells(action.map, state.origin, action.unit),
        menu: null,
        mode: "targetingSpawn",
        pendingAction: "spawn",
        previewDestination: null,
        selectedAttackTarget: null,
        selectedSpawnUnit: action.unit,
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
