import type { StandardGameSnapshot } from "@TBS/application";
import {
  identityAssetManifest,
  presentUnitPanel,
  type BoardCellViewModel,
  type GameInteractionState,
  type UnitPanelViewModel,
} from "@TBS/presentation";

import type { GamePanelRow, GamePanelState } from "../../types";

type CellId = BoardCellViewModel["id"];
type GameCell = StandardGameSnapshot["state"]["board"]["cells"][CellId];

const formatCoordinates = ({ q, r }: Readonly<{ q: number; r: number }>) => `(${q}, ${r})`;

const actionRows = (unit: UnitPanelViewModel): readonly GamePanelRow[] => {
  const actions = unit.actions;
  return actions.length > 0
    ? [{ id: "actions", label: "Actions", type: "actions" as const, actions }]
    : [];
};

const unitRows = (
  unit: UnitPanelViewModel,
  terrainLabel: string,
  coordinates: Readonly<{ q: number; r: number }>,
): readonly GamePanelRow[] => [
  {
    id: "occupant-type",
    label: "Occupant Type",
    type: "text",
    value: unit.label,
  },
  {
    id: "terrain",
    label: "Terrain",
    type: "text",
    value: terrainLabel,
  },
  ...(unit.health ? [{
    color: unit.teamId ?? undefined,
    id: "health",
    label: "Health",
    type: "text" as const,
    value: `${unit.health.current} / ${unit.health.maximum}`,
  }] : []),
  {
    id: "stats",
    label: "Stats",
    type: "text",
    value: `Attack ${unit.attack}, Defense ${unit.defense}`,
  },
  ...(unit.movementCosts.length > 0 ? [{
    id: "energy",
    label: "Energy",
    type: "text" as const,
    value: String(unit.movement),
  }, {
    id: "energy-costs",
    label: "Energy Costs",
    type: "text" as const,
    value: unit.movementCosts
      .map(({ cost, terrainLabel }) => `${terrainLabel} ${cost}`)
      .join(", "),
  }] : []),
  ...(unit.income > 0 ? [{
    id: "income",
    label: "Income",
    type: "text" as const,
    value: String(unit.income),
  }] : []),
  ...actionRows(unit),
  {
    id: "coordinates",
    label: "Coordinates",
    type: "text",
    value: formatCoordinates(coordinates),
  },
];

const panelForCell = (
  state: StandardGameSnapshot["state"],
  cell: GameCell,
  focus: GamePanelState["focus"],
): GamePanelState | null => {
  const terrainLabel = identityAssetManifest.terrain(cell.terrainTypeId).label;
  const entityId = cell.occupantEntityId;
  if (!entityId) {
    return {
      coords: cell.position,
      focus,
      rows: [
        { id: "occupant-type", label: "Occupant Type", type: "text", value: "Empty" },
        { id: "terrain", label: "Terrain", type: "text", value: terrainLabel },
        {
          id: "coordinates",
          label: "Coordinates",
          type: "text",
          value: formatCoordinates(cell.position),
        },
      ],
    };
  }
  const unit = presentUnitPanel(state, entityId);
  if (!unit) return null;
  return {
    coords: cell.position,
    focus,
    rows: unitRows(unit, terrainLabel, cell.position),
    ...(unit.cargo.length > 0
      ? {
          transportRows: unit.cargo.map((cargo) => ({
            id: `cargo:${cargo.entityId}`,
            label: "Type",
            type: "text" as const,
            value: `Carrying ${cargo.label}`,
          })),
        }
      : {}),
  };
};

export const buildGamePanelState = ({
  interactionState,
  lastInspectedCellId,
  state,
}: Readonly<{
  interactionState: GameInteractionState;
  lastInspectedCellId: CellId | null;
  state: StandardGameSnapshot["state"];
}>): GamePanelState | null => {
  const selectedEntity = interactionState.selectedEntityId
    ? state.entities[interactionState.selectedEntityId]
    : undefined;
  if (selectedEntity?.position) {
    const selectedCell = Object.values(state.board.cells).find(({ position }) =>
      position.q === selectedEntity.position?.q && position.r === selectedEntity.position.r);
    return selectedCell ? panelForCell(state, selectedCell, "actor") : null;
  }
  const inspectedCell = lastInspectedCellId ? state.board.cells[lastInspectedCellId] : undefined;
  return inspectedCell ? panelForCell(state, inspectedCell, "cell") : null;
};
