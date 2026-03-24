import {
  GameAction,
  MapItem,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
} from "@TBS/common";
import { moveableOptions } from "../../components/Map/Unit/unitOptions";

const emptyState = (): GameInteractionState => ({
  availableAttackTargets: [],
  availableMoveTargets: [],
  menu: null,
  mode: "idle",
  origin: null,
  pendingAction: null,
  previewDestination: null,
  selectedAttackTarget: null,
  selectedUnit: null,
});

const hasAttackTargets = (targets: number[]) => targets.length > 0;

const buildMenuOptions = (
  kind: GameActionMenuState["kind"],
  attackTargets: number[]
): GameMenuOption[] => {
  const options: GameMenuOption[] = [];

  if (kind !== "attack" && hasAttackTargets(attackTargets)) {
    options.push({ id: "chooseAttack", label: "Attack" });
  }

  if (kind === "move") {
    options.push({ id: "move", label: "Move" });
  }

  if (kind === "attack") {
    options.push({ id: "confirmAttack", label: "Confirm attack" });
  }

  options.push({ id: "cancel", label: "Cancel" });

  return options;
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

  return moveableOptions.includes(mapItem.unit);
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

  return state.availableMoveTargets;
};

export const getTargetType = (state: GameInteractionState): GameCellTargetType | null => {
  if (state.pendingAction === "attack" && state.availableAttackTargets.length > 0) {
    return "attack";
  }

  if (state.availableMoveTargets.length > 0) {
    return "move";
  }

  return null;
};

type InteractionReducerAction =
  | { type: "SELECT_UNIT"; unit: MapItem; map: HexMap }
  | { type: "OPEN_ORIGIN_MENU"; position: MenuPosition; map: HexMap; perspective: TeamType }
  | { type: "CHOOSE_MOVE_TARGET"; cell: MapItem; position: MenuPosition; map: HexMap; perspective: TeamType }
  | { type: "CHOOSE_ATTACK_MODE"; map: HexMap; perspective: TeamType }
  | { type: "SELECT_ATTACK_TARGET"; cell: MapItem; position: MenuPosition }
  | { type: "CANCEL_FLOW" }
  | { type: "RESET_AFTER_SERVER_EVENT" };

export const gameInteractionReducer = (
  state: GameInteractionState,
  action: InteractionReducerAction
): GameInteractionState => {
  switch (action.type) {
    case "SELECT_UNIT": {
      const moveTargets = getMoveTargets(action.unit, action.map);

      return {
        availableAttackTargets: [],
        availableMoveTargets: moveTargets,
        menu: null,
        mode: "unitSelected",
        origin: { x: action.unit.row, y: action.unit.column },
        pendingAction: null,
        previewDestination: null,
        selectedAttackTarget: null,
        selectedUnit: action.unit,
      };
    }
    case "OPEN_ORIGIN_MENU": {
      if (!state.selectedUnit || !state.origin) {
        return state;
      }

      const attackTargets = getAttackTargets(action.perspective, action.map, state.origin, null);

      return {
        ...state,
        availableAttackTargets: attackTargets,
        menu: {
          cellIndex: state.selectedUnit.index,
          kind: "origin",
          options: buildMenuOptions("origin", attackTargets),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        previewDestination: null,
        selectedAttackTarget: null,
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
        menu: {
          cellIndex: action.cell.index,
          kind: "move",
          options: buildMenuOptions("move", attackTargets),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: null,
        previewDestination,
        selectedAttackTarget: null,
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
          options: buildMenuOptions("attack", []),
          position: action.position,
        },
        mode: "actionMenu",
        pendingAction: "attack",
        selectedAttackTarget: { x: action.cell.row, y: action.cell.column },
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
