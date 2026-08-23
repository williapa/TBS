// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  BoardCellViewModel,
  BoardEntityViewModel,
  BoardInteractionAnchor,
  BoardIntent,
  BoardViewModel,
} from "@TBS/presentation";
import { describe, expect, test, vi } from "vitest";

import { Renderer2DBoard } from "./index";
import { getEmojiForAsset } from "./assets/emojiManifest";

const cellId = (value: string) => value as BoardCellViewModel["id"];
const entityId = (value: string) => value as BoardEntityViewModel["id"];

const board = (): BoardViewModel => ({
  revision: 1,
  cells: [
    {
      id: cellId("0:0"),
      coordinate: { q: 0, r: 0 },
      neighborIds: [cellId("1:0")],
      terrainAssetId: "terrain:forest",
      selection: "none",
      target: "move",
      accessibleDescription: "Forest cell at q 0, r 0",
    },
    {
      id: cellId("1:0"),
      coordinate: { q: 1, r: 0 },
      neighborIds: [cellId("0:0")],
      terrainAssetId: "terrain:plains",
      selection: "none",
      target: null,
      accessibleDescription: "Plains cell at q 1, r 0",
    },
  ],
  entities: [{
    id: entityId("unit-1"),
    unitTypeId: "soldier" as BoardEntityViewModel["unitTypeId"],
    assetId: "unit:soldier",
    cellId: cellId("1:0"),
    coordinate: { q: 1, r: 0 },
    orientation: 0,
    teamId: "purple" as BoardEntityViewModel["teamId"],
    health: { current: 75, maximum: 100 },
    statuses: ["moved"],
    capabilities: [],
    selected: false,
    actionable: true,
    cargo: [],
    label: "Soldier",
    accessibleDescription: "Soldier, purple team, 75 of 100 health, moved",
  }],
  cameraBounds: {
    minimum: { q: 0, r: 0 },
    maximum: { q: 1, r: 0 },
    center: { q: 0.5, r: 0 },
  },
  focusRequest: null,
  animationCues: [{
    type: "move-entity",
    id: "1:0:unit-1",
    revision: 1,
    entityId: entityId("unit-1"),
    from: { q: 0, r: 0 },
    to: { q: 1, r: 0 },
    durationMs: 260,
  }],
});

describe("Renderer2DBoard", () => {
  test("renders a non-interactive preview without focusable board controls", () => {
    const { container } = render(
      <Renderer2DBoard
        ariaLabel="Selected map preview"
        board={board()}
        interactionMode="static"
        reducedMotion
      />,
    );

    expect(screen.getByRole("img", { name: "Selected map preview" })).toBeTruthy();
    expect(screen.queryByRole("gridcell")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.querySelector("[tabindex]")).toBeNull();
  });

  test("renders an extension unit through the generic asset fallback", () => {
    expect(getEmojiForAsset("unit:pathfinder")).toBe("◉");
  });

  test("shows the loaded unit icon in the top-right badge only while transporting cargo", () => {
    const presented = board();
    const cargoBoard: BoardViewModel = {
      ...presented,
      entities: presented.entities.flatMap((entity) => [
        {
          ...entity,
          id: entityId("empty-transport"),
          cellId: cellId("0:0"),
          coordinate: { q: 0, r: 0 },
        },
        {
          ...entity,
          cargo: [{
            id: entityId("cargo-1"),
            unitTypeId: "soldier" as BoardEntityViewModel["unitTypeId"],
            assetId: "unit:soldier",
            label: "Soldier",
            statuses: [],
          }],
        },
      ]),
    };
    const carrying = render(
      <Renderer2DBoard board={cargoBoard} onIntent={vi.fn()} />,
    );
    try {
      const badge = carrying.container.querySelector(
        "[data-entity-id='unit-1'] [data-cargo-badge]",
      );
      expect(carrying.container.querySelector(
        "[data-entity-id='empty-transport'] [data-cargo-badge]",
      )).toBeNull();
      expect(Array.from(carrying.container.querySelectorAll("text"))
        .some((text) => text.textContent === "P")).toBe(false);
      expect(badge).not.toBeNull();
      expect(badge?.querySelector("circle")?.getAttribute("cx")).toBe("24");
      expect(badge?.querySelector("circle")?.getAttribute("cy")).toBe("-22");
      const cargoIcon = badge?.querySelector("[data-cargo-icon]");
      expect(cargoIcon?.getAttribute("x")).toBe("24");
      expect(cargoIcon?.getAttribute("y")).toBe("-22");
      expect(cargoIcon?.textContent).toBe(
        getEmojiForAsset("unit:soldier"),
      );
    } finally {
      carrying.unmount();
    }
  });

  test("omits health bars for healthless objects without invalid SVG attributes", () => {
    const presented = board();
    const healthlessBoard: BoardViewModel = {
      ...presented,
      entities: presented.entities.map((entity) => ({
        ...entity,
        unitTypeId: "money" as BoardEntityViewModel["unitTypeId"],
        assetId: "unit:money",
        health: null,
        label: "Money",
        accessibleDescription: "Money, neutral",
        teamId: null,
      })),
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { container, unmount } = render(
      <Renderer2DBoard board={healthlessBoard} onIntent={vi.fn()} />,
    );
    try {
      expect(screen.getByRole("button", { name: "Money, neutral" })).toBeTruthy();
      expect(container.querySelector("[data-health-bar]")).toBeNull();
      expect(container.querySelector('[width="NaN"]')).toBeNull();
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      unmount();
      consoleError.mockRestore();
    }
  });

  test("renders the neutral view model and reports pointer anchors separately from semantic intents", () => {
    const emissions: Readonly<{
      anchor?: BoardInteractionAnchor;
      intent: BoardIntent;
    }>[] = [];
    render(<Renderer2DBoard
      board={board()}
      onIntent={(intent, anchor) => {
        emissions.push({ intent, ...(anchor ? { anchor } : {}) });
      }}
    />);

    expect(screen.getByRole("grid", { name: /Two-dimensional game board, revision 1/ })).toBeTruthy();
    const entity = screen.getByRole("button", { name: /Soldier, purple team, 75 of 100 health, moved/ });
    fireEvent.click(entity, { clientX: 80, clientY: 90 });
    const cells = screen.getAllByRole("gridcell");
    fireEvent.keyDown(cells[0], { key: "Enter" });

    expect(emissions).toEqual([
      {
        anchor: { clientX: 80, clientY: 90 },
        intent: { type: "select-entity", entityId: "unit-1" },
      },
      { intent: { type: "select-cell", cell: { q: 0, r: 0 } } },
    ]);
    expect(cells[0].querySelector("polygon")?.getAttribute("stroke-dasharray")).toBeNull();
    const healthBarOutline = entity.querySelector("[data-health-bar-outline]");
    expect(healthBarOutline?.getAttribute("stroke")).toBe("#111");
    expect(healthBarOutline?.getAttribute("stroke-width")).toBe("1");
  });

  test("renders focused cell highlighting above every base cell without a rectangular outline", () => {
    const presented = board();
    const focusedBoard = {
      ...presented,
      cells: presented.cells.map((cell, index) => index === 1
        ? { ...cell, selection: "focused" as const, target: "attack" as const }
        : cell),
    };
    const { container } = render(
      <Renderer2DBoard board={focusedBoard} onIntent={vi.fn()} />,
    );

    const cells = within(container).getAllByRole("gridcell");
    const entity = within(container).getByRole("button", { name: /Soldier, purple team/ });
    const basePolygon = cells[1].querySelector("polygon");
    const targetOverlay = container.querySelector("[data-cell-highlight='0:0']");
    const selectionOverlay = container.querySelector("[data-cell-highlight='1:0']");

    expect(cells[1].getAttribute("style")).toContain("outline: none");
    expect(entity.getAttribute("style")).toContain("outline: none");
    expect(basePolygon?.getAttribute("stroke")).toBe("rgba(8, 12, 18, 0.72)");
    expect(targetOverlay?.getAttribute("data-highlight-kind")).toBe("move");
    expect(targetOverlay?.getAttribute("stroke")).toBe("#ffffff");
    expect(targetOverlay?.getAttribute("stroke-dasharray")).toBe("7 4");
    expect(targetOverlay?.getAttribute("pointer-events")).toBe("none");
    expect(selectionOverlay?.getAttribute("data-highlight-kind")).toBe("selection");
    expect(selectionOverlay?.getAttribute("fill")).toBe("none");
    expect(selectionOverlay?.getAttribute("pointer-events")).toBe("none");
    expect(selectionOverlay?.getAttribute("stroke")).toBe("#ffffff");
    expect(selectionOverlay?.getAttribute("stroke-dasharray")).toBeNull();
    expect(selectionOverlay?.getAttribute("stroke-width")).toBe("5");
    expect((cells.at(-1)?.compareDocumentPosition(selectionOverlay as Node) ?? 0)
      & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("animates accepted movement and skips it for reduced motion", () => {
    const { container, rerender } = render(
      <Renderer2DBoard board={board()} onIntent={vi.fn()} />,
    );
    const animated = container.querySelector('[data-entity-id="unit-1"] > g');
    expect(animated?.getAttribute("style")).toContain("tbs-renderer-2d-move 260ms");

    rerender(<Renderer2DBoard board={board()} onIntent={vi.fn()} reducedMotion />);
    const settled = container.querySelector('[data-entity-id="unit-1"] > g');
    expect(settled?.getAttribute("style") ?? "").not.toContain("tbs-renderer-2d-move");
  });
});
