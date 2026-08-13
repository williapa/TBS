import { buildGamePanelState } from "./gamePanelState";
import { createInitialGameInteractionState } from "@TBS/presentation";
import type { MapItem, TerrainType, UnitTypes } from "../../types";

const createCell = (
  index: number,
  unit: UnitTypes,
  terrain: TerrainType,
  overrides: Partial<MapItem> = {}
): MapItem => ({
  column: index,
  index,
  row: 0,
  team: "orange",
  terrain,
  unit,
  ...overrides,
});

describe("buildGamePanelState", () => {
  test("returns clicked empty-cell details for passive inspection", () => {
    const emptyCell = createCell(0, "none", "forest");

    const state = buildGamePanelState({
      active: false,
      interactionState: createInitialGameInteractionState(),
      lastInspectedCoords: { x: 0, y: 0 },
      mapData: [[emptyCell]],
    });

    expect(state?.focus).toBe("cell");
    expect(state?.rows).toEqual([
      { id: "occupant-type", label: "Occupant Type", type: "text", value: "Empty" },
      { id: "terrain", label: "Terrain", type: "text", value: "Forest" },
      { id: "coordinates", label: "Coordinates", type: "text", value: "(0, 0)" },
    ]);
  });

  test("keeps focus on the selected actor instead of the clicked target", () => {
    const actor = createCell(0, "soldier", "plains");
    const target = createCell(1, "lion", "desert", {
      column: 1,
      index: 1,
      team: "purple",
    });

    const interactionState = {
      ...createInitialGameInteractionState(),
      origin: { x: 0, y: 0 },
      pendingAction: "attack" as const,
      selectedAttackTarget: { x: 0, y: 1 },
      selectedUnit: actor,
    };

    const state = buildGamePanelState({
      active: true,
      interactionState,
      lastInspectedCoords: { x: 0, y: 1 },
      mapData: [[actor, target]],
    });

    expect(state?.focus).toBe("actor");
    expect(state?.coords).toEqual({ x: 0, y: 0 });
    expect(state?.rows[0]).toEqual({
      id: "occupant-type",
      label: "Occupant Type",
      type: "text",
      value: "Soldier (person)",
    });
  });

  test("updates actor coordinates and terrain during move preview", () => {
    const actor = createCell(0, "soldier", "plains", {
      neighbors: [1],
    });
    const destination = createCell(1, "none", "beach", {
      column: 1,
      index: 1,
      neighbors: [0],
    });

    const interactionState = {
      ...createInitialGameInteractionState(),
      origin: { x: 0, y: 0 },
      previewDestination: { x: 0, y: 1 },
      selectedUnit: actor,
    };

    const state = buildGamePanelState({
      active: true,
      interactionState,
      lastInspectedCoords: { x: 0, y: 1 },
      mapData: [[actor, destination]],
    });

    expect(state?.focus).toBe("actor");
    expect(state?.coords).toEqual({ x: 0, y: 1 });
    expect(state?.rows).toEqual(
      expect.arrayContaining([
        { id: "terrain", label: "Terrain", type: "text", value: "Beach" },
        { id: "coordinates", label: "Coordinates", type: "text", value: "(0, 1)" },
      ])
    );
  });

  test("builds the reduced transport section for loaded vehicles", () => {
    const truck = createCell(0, "truck", "road", {
      loadedUnit: {
        boosted: true,
        damage: 20,
        moved: true,
        team: "orange",
        unit: "doctor",
      },
    });

    const state = buildGamePanelState({
      active: false,
      interactionState: createInitialGameInteractionState(),
      lastInspectedCoords: { x: 0, y: 0 },
      mapData: [[truck]],
    });

    expect(state?.transportRows).toEqual([
      {
        id: "occupant-type",
        label: "Type",
        type: "text",
        value: "Carrying Doctor (person)",
      },
      {
        color: "orange",
        id: "health",
        label: "Health",
        type: "text",
        value: "80",
      },
      {
        id: "acted",
        label: "Acted",
        type: "text",
        value: "Yes",
      },
      {
        id: "stats",
        label: "Stats",
        type: "text",
        value: "Attack 15, Defense 11",
      },
      {
        id: "boosted",
        label: "Boosted",
        type: "text",
        value: "Yes",
      },
    ]);
  });

  test("returns null when there is no selected actor or inspected cell", () => {
    const state = buildGamePanelState({
      active: true,
      interactionState: createInitialGameInteractionState(),
      lastInspectedCoords: null,
      mapData: [[createCell(0, "none", "plains")]],
    });

    expect(state).toBeNull();
  });
});
