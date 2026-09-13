import {
  createInitialGameInteractionState,
  presentBoard,
  presentUnitDictionary,
  presentUnitTypeDetails,
} from "@TBS/presentation";
import { createActiveGameStateFixture } from "@TBS/test-kit";

import { buildGamePanelState, buildUnitDictionaryRows } from "./gamePanelState";

const fixture = () => {
  const state = createActiveGameStateFixture();
  const board = presentBoard({ state });
  const actor = board.entities[0];
  const emptyCell = board.cells.find((cell) =>
    !board.entities.some((entity) => entity.cellId === cell.id));
  if (!actor || !emptyCell) throw new Error("panel fixture requires an actor and empty cell");
  return { actor, emptyCell, state };
};

describe("buildGamePanelState", () => {
  test("builds only the applicable unit dictionary rows", () => {
    const dictionaryUnits = presentUnitDictionary().flatMap(({ units }) => units);
    const bankTypeId = dictionaryUnits.find(({ unitTypeId }) => unitTypeId === "bank")?.unitTypeId;
    const soldierTypeId = dictionaryUnits
      .find(({ unitTypeId }) => unitTypeId === "soldier")?.unitTypeId;
    if (!bankTypeId || !soldierTypeId) throw new Error("dictionary fixtures must exist");
    const bank = presentUnitTypeDetails(bankTypeId);
    const soldier = presentUnitTypeDetails(soldierTypeId);
    if (!bank || !soldier) throw new Error("dictionary details must exist");

    const bankRows = buildUnitDictionaryRows(bank);
    expect(bankRows).toEqual(expect.arrayContaining([
      { id: "income", label: "Income", type: "text", value: "$1000" },
      { id: "cost", label: "Cost", type: "text", value: "$2000" },
      { id: "stats", label: "Stats", type: "text", value: "Attack 0, Defense 60" },
    ]));
    expect(bankRows.some(({ id }) => id === "energy")).toBe(false);
    expect(bankRows.some(({ id }) => id === "energy-costs")).toBe(false);

    const soldierRows = buildUnitDictionaryRows(soldier);
    expect(soldierRows).toEqual(expect.arrayContaining([
      { id: "cost", label: "Cost", type: "text", value: "$200" },
      { id: "energy", label: "Energy", type: "text", value: "2" },
    ]));
    expect(soldierRows.some(({ id }) => id === "income")).toBe(false);
    expect(soldierRows.some(({ id }) => id === "energy-costs")).toBe(true);
    expect(soldierRows.some(({ id }) => id === "actions")).toBe(true);
  });

  test("returns normalized empty-cell details for passive inspection", () => {
    const { emptyCell, state } = fixture();
    const panel = buildGamePanelState({
      interactionState: createInitialGameInteractionState(),
      lastInspectedCellId: emptyCell.id,
      state,
    });

    expect(panel).toMatchObject({ focus: "cell", coords: emptyCell.coordinate });
    expect(panel?.rows).toEqual([
      { id: "occupant-type", label: "Occupant Type", type: "text", value: "Empty" },
      {
        id: "terrain",
        label: "Terrain",
        terrain: { color: expect.any(String), id: expect.any(String), label: expect.any(String) },
        type: "terrain",
      },
      {
        id: "coordinates",
        label: "Coordinates",
        type: "text",
        value: `(${emptyCell.coordinate.q}, ${emptyCell.coordinate.r})`,
      },
    ]);
  });

  test("uses the presentation unit read model for the selected stable entity", () => {
    const { actor, emptyCell, state } = fixture();
    const panel = buildGamePanelState({
      interactionState: {
        ...createInitialGameInteractionState(),
        mode: "unit-selected",
        selectedEntityId: actor.id,
      },
      lastInspectedCellId: emptyCell.id,
      state,
    });

    expect(panel?.focus).toBe("actor");
    expect(panel?.rows).toEqual(expect.arrayContaining([
      { id: "occupant-type", label: "Occupant Type", type: "text", value: "Soldier" },
      { id: "stats", label: "Stats", type: "text", value: "Attack 30, Defense 15" },
      { id: "energy", label: "Energy", type: "text", value: "2" },
      {
        costs: [
          { cost: 1, terrain: { color: "rgba(255, 240, 0, 1.0)", id: "beach", label: "Beach" } },
          { cost: 1, terrain: { color: "rgba(102, 204, 102, 1.0)", id: "forest", label: "Forest" } },
          { cost: 3, terrain: { color: "rgba(61, 70, 82, 1.0)", id: "mountain", label: "Mountain" } },
          { cost: 1, terrain: { color: "rgba(130, 94, 92, 1.0)", id: "road", label: "Road" } },
          { cost: 1, terrain: { color: "rgba(154, 205, 50, 1.0)", id: "plains", label: "Plains" } },
          { cost: 2, terrain: { color: "rgba(255, 255, 159, 1.0)", id: "desert", label: "Desert" } },
        ],
        id: "energy-costs",
        label: "Energy Costs",
        type: "terrain-costs",
      },
    ]));
    expect(panel?.rows.find(({ id }) => id === "actions")).toMatchObject({
      type: "actions",
      actions: expect.arrayContaining([
        {
          id: "attack",
          label: "Attack",
          description: "Initiate combat with an adjacent unit, dealing damage first. If enemy is not killed, it will deal retaliatory damage.",
          unitList: null,
        },
        {
          id: "move",
          label: "Move",
          description: "Traverse empty map cells based on the unit's available energy and the energy cost of the terrain of cells in its path.",
          unitList: null,
        },
      ]),
    });
  });

  test("shows boosted combat stats and prevents another boost in the details", () => {
    const { actor, state } = fixture();
    const boostedState = {
      ...state,
      entities: {
        ...state.entities,
        [actor.id]: {
          ...state.entities[actor.id],
          statuses: [{ type: "boosted" }],
        },
      },
    };
    const panel = buildGamePanelState({
      interactionState: {
        ...createInitialGameInteractionState(),
        mode: "unit-selected",
        selectedEntityId: actor.id,
      },
      lastInspectedCellId: null,
      state: boostedState,
    });

    expect(panel?.rows).toEqual(expect.arrayContaining([
      { id: "stats", label: "Stats", type: "text", value: "Attack 40, Defense 25" },
      {
        id: "boosted",
        label: "Boosted",
        type: "text",
        value: "Yes — cannot be boosted again",
      },
    ]));
  });

  test("returns null without a selected entity or inspected cell", () => {
    const { state } = fixture();
    expect(buildGamePanelState({
      interactionState: createInitialGameInteractionState(),
      lastInspectedCellId: null,
      state,
    })).toBeNull();
  });
});
