import {
  createInitialGameInteractionState,
  presentBoard,
} from "@TBS/presentation";
import { createActiveGameStateFixture } from "@TBS/test-kit";

import { buildGamePanelState } from "./gamePanelState";

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
      { id: "terrain", label: "Terrain", type: "text", value: expect.any(String) },
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
        id: "energy-costs",
        label: "Energy Costs",
        type: "text",
        value: "Beach 1, Forest 1, Mountain 3, Road 1, Plains 1, Desert 2",
      },
    ]));
    expect(panel?.rows.find(({ id }) => id === "actions")).toMatchObject({
      type: "actions",
      actions: expect.arrayContaining([
        {
          id: "attack",
          label: "Attack",
          description: "Initiate combat with an adjacent unit, dealing damage first. If enemy is not killed, it will deal retaliatory damage.",
        },
        {
          id: "move",
          label: "Move",
          description: "Traverse empty map cells based on the unit's available energy and the energy cost of the terrain of cells in its path.",
        },
      ]),
    });
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
