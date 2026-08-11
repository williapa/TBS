import {
  TerrainOptions,
  animalUnitOptions,
  buildingUnitOptions,
  getActionDetailsForUnit,
  getActionsForUnit,
  getCombatStats,
  getDefaultUnitEnergy,
  getTerrainUnitMovementCost,
  getUnitIncome,
  moveMapUnit,
  objectUnitOptions,
  peopleUnitOptions,
  vehicleUnitOptions,
} from "@TBS/common";
import prettyPrint from "../../utils/prettyPrint";

const cloneMap = (map: HexMap) => map.map((row) => row.map((cell) => ({ ...cell })));

const getCellFromCoords = (map: HexMap, coords: Coords | null) =>
  coords ? map[coords.x]?.[coords.y] ?? null : null;

const getPreviewMap = (interactionState: GameInteractionState, map: HexMap) => {
  if (!interactionState.origin || !interactionState.previewDestination) {
    return map;
  }

  return moveMapUnit(
    cloneMap(map),
    interactionState.origin,
    interactionState.previewDestination
  ) as unknown as HexMap;
};

const getCurrentActorCoords = (interactionState: GameInteractionState) =>
  interactionState.previewDestination ?? interactionState.origin;

const isEmptyCell = (cell: MapItem) => cell.unit === "none";

const isObjectUnit = (unit: UnitTypes) => objectUnitOptions.includes(unit as ObjectType);

const isBuildingUnit = (unit: UnitTypes) => buildingUnitOptions.includes(unit as BuildingType);

const isAnimalUnit = (unit: UnitTypes) => animalUnitOptions.includes(unit);

const isPeopleUnit = (unit: UnitTypes) => peopleUnitOptions.includes(unit);

const isVehicleUnit = (unit: UnitTypes) => vehicleUnitOptions.includes(unit);

const getSubtype = (unit: UnitTypes) => {
  if (isVehicleUnit(unit)) {
    return unit === "airplane" || unit === "helicopter" ? "flying vehicle" : "ground vehicle";
  }

  if (isBuildingUnit(unit)) {
    return "building";
  }

  if (isPeopleUnit(unit)) {
    return "person";
  }

  if (isAnimalUnit(unit)) {
    return "animal";
  }

  if (isObjectUnit(unit)) {
    return "object";
  }

  return "unit";
};

const formatOccupantType = (unit: UnitTypes) => `${prettyPrint(unit)} (${getSubtype(unit)})`;

const formatCoordinates = ({ x, y }: Coords) => `(${x}, ${y})`;

const formatStats = (occupant: GamePanelOccupant) => {
  const [attack, defense] = getCombatStats({
    column: 0,
    index: 0,
    row: 0,
    team: occupant.team ?? ("gray" as TeamType.gray),
    terrain: "plains" as TerrainType.plains,
    unit: occupant.unit,
    ...(occupant.boosted ? { boosted: true } : {}),
  });
  const effectiveAttack = occupant.boosted ? attack + 10 : attack;
  const effectiveDefense = occupant.boosted ? defense + 10 : defense;

  return `Attack ${effectiveAttack}, Defense ${effectiveDefense}`;
};

const formatEnergyCosts = (unit: UnitTypes) => TerrainOptions
  .map((terrain) => ({
    cost: getTerrainUnitMovementCost(unit, terrain),
    terrain,
  }))
  .filter(({ cost }) => cost < 1023)
  .map(({ cost, terrain }) => `${prettyPrint(terrain)} ${cost}`)
  .join(", ");

const buildActionRow = (unit: UnitTypes): GamePanelRow | null => {
  const actionDetails = getActionDetailsForUnit(unit);
  const actions = getActionsForUnit(unit)
    .filter((action) => Boolean(actionDetails[action]))
    .map((action) => ({
      description: actionDetails[action],
      id: action,
      label: prettyPrint(action),
    }));

  if (actions.length === 0) {
    return null;
  }

  return {
    actions,
    id: "actions",
    label: "Actions",
    type: "actions",
  };
};

const buildRowsForOccupant = (
  occupant: GamePanelOccupant,
  coords: Coords,
  terrain: TerrainType,
  includeCoordinates = true
): GamePanelRow[] => {
  const rows: GamePanelRow[] = [
    {
      id: "occupant-type",
      label: "Occupant Type",
      type: "text",
      value: formatOccupantType(occupant.unit),
    },
    {
      id: "terrain",
      label: "Terrain",
      type: "text",
      value: prettyPrint(terrain),
    },
  ];

  if (!isObjectUnit(occupant.unit)) {
    rows.push({
      color: occupant.team,
      id: "health",
      label: "Health",
      type: "text",
      value: `${100 - (occupant.damage ?? 0)}`,
    });

    if (occupant.moved) {
      rows.push({
        id: "acted",
        label: "Acted",
        type: "text",
        value: "Yes",
      });
    }

    rows.push({
      id: "stats",
      label: "Stats",
      type: "text",
      value: formatStats(occupant),
    });

    if (!isVehicleUnit(occupant.unit) && occupant.boosted) {
      rows.push({
        id: "boosted",
        label: "Boosted",
        type: "text",
        value: "Yes",
      });
    }
  }

  if (isBuildingUnit(occupant.unit)) {
    rows.push({
      id: "income",
      label: "Income",
      type: "text",
      value: `${getUnitIncome({
        column: 0,
        index: 0,
        row: 0,
        team: occupant.team ?? ("gray" as TeamType.gray),
        terrain,
        unit: occupant.unit,
      })}`,
    });
  }

  if (isAnimalUnit(occupant.unit) || isPeopleUnit(occupant.unit) || isVehicleUnit(occupant.unit)) {
    rows.push({
      id: "energy",
      label: "Energy",
      type: "text",
      value: `${getDefaultUnitEnergy(occupant.unit)}`,
    });
    rows.push({
      id: "energy-costs",
      label: "Energy Costs",
      type: "text",
      value: formatEnergyCosts(occupant.unit),
    });
  }

  const actionRow = buildActionRow(occupant.unit);

  if (actionRow) {
    rows.push(actionRow);
  }

  if (includeCoordinates) {
    rows.push({
      id: "coordinates",
      label: "Coordinates",
      type: "text",
      value: formatCoordinates(coords),
    });
  }

  return rows;
};

const buildRowsForEmptyCell = (cell: MapItem): GamePanelRow[] => [
  {
    id: "occupant-type",
    label: "Occupant Type",
    type: "text",
    value: "Empty",
  },
  {
    id: "terrain",
    label: "Terrain",
    type: "text",
    value: prettyPrint(cell.terrain),
  },
  {
    id: "coordinates",
    label: "Coordinates",
    type: "text",
    value: formatCoordinates({ x: cell.row, y: cell.column }),
  },
];

const toPanelOccupant = (cell: MapItem): GamePanelOccupant | null =>
  isEmptyCell(cell)
    ? null
    : {
        boosted: cell.boosted,
        damage: cell.damage,
        moved: cell.moved,
        team: cell.team,
        unit: cell.unit,
      };

const buildGamePanelStateFromCell = (cell: MapItem, focus: "actor" | "cell"): GamePanelState => {
  const occupant = toPanelOccupant(cell);
  const loadedUnit = cell.loadedUnit;

  if (!occupant) {
    return {
      coords: { x: cell.row, y: cell.column },
      focus,
      occupant: null,
      rows: buildRowsForEmptyCell(cell),
      terrain: cell.terrain,
    };
  }

  return {
    coords: { x: cell.row, y: cell.column },
    focus,
    occupant,
    rows: buildRowsForOccupant(occupant, { x: cell.row, y: cell.column }, cell.terrain),
    terrain: cell.terrain,
    ...(loadedUnit
      ? {
          transportRows: buildRowsForOccupant(
            {
              boosted: loadedUnit.boosted,
              damage: loadedUnit.damage,
              moved: loadedUnit.moved,
              team: loadedUnit.team,
              unit: loadedUnit.unit,
            },
            { x: cell.row, y: cell.column },
            cell.terrain,
            false
          )
            .filter((row) =>
              ["occupant-type", "health", "acted", "stats", "boosted"].includes(row.id)
            )
            .map((row) =>
              row.id === "occupant-type" && row.type === "text"
                ? { ...row, label: "Type", value: `Carrying ${formatOccupantType(loadedUnit.unit)}` }
                : row
            ),
        }
      : {}),
  };
};

type BuildGamePanelStateArgs = {
  active: boolean;
  interactionState: GameInteractionState;
  lastInspectedCoords: Coords | null;
  mapData: HexMap;
};

export const buildGamePanelState = ({
  active,
  interactionState,
  lastInspectedCoords,
  mapData,
}: BuildGamePanelStateArgs): GamePanelState | null => {
  if (active && interactionState.selectedUnit) {
    const previewMap = getPreviewMap(interactionState, mapData);
    const actorCell = getCellFromCoords(previewMap, getCurrentActorCoords(interactionState));

    return actorCell ? buildGamePanelStateFromCell(actorCell, "actor") : null;
  }

  const cell = getCellFromCoords(mapData, lastInspectedCoords);

  return cell ? buildGamePanelStateFromCell(cell, "cell") : null;
};
