// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { presentBoard } from "@TBS/presentation";
import type { BoardIntent } from "@TBS/presentation";
import type { BoardInteractionAnchor } from "@TBS/presentation";
import { describe, expect, test, vi } from "vitest";

import { Renderer2DBoard } from "./index";
import { getEmojiForAsset } from "./assets/emojiManifest";

const state = () => ({
  schemaVersion: 1 as const,
  revision: 1,
  status: "active" as const,
  activeTeam: "purple" as const,
  money: { orange: 1_000, purple: 1_000 },
  map: [[
    {
      row: 0,
      column: 0,
      index: 0,
      neighbors: [1],
      terrain: "forest" as const,
      unit: "none" as const,
      team: "gray" as const,
    },
    {
      row: 0,
      column: 1,
      index: 1,
      neighbors: [0],
      terrain: "plains" as const,
      unit: "soldier" as const,
      team: "purple" as const,
      damage: 25,
      moved: true,
    },
  ]],
});

const board = () => presentBoard({
  state: state(),
  events: [{
    type: "move",
    actorTeam: "purple",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    unit: "soldier",
  }],
  interaction: { legalTargets: [{ cellIndex: 0, type: "move" }] },
});

describe("Renderer2DBoard", () => {
  test("renders an extension unit through the generic asset fallback", () => {
    expect(getEmojiForAsset("unit:pathfinder")).toBe("◉");
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
    const entity = screen.getByRole("button", { name: /Soldier, purple team, 75 health, moved/ });
    fireEvent.click(entity, { clientX: 80, clientY: 90 });
    const cells = screen.getAllByRole("gridcell");
    fireEvent.keyDown(cells[0], { key: "Enter" });

    expect(emissions).toEqual([
      {
        anchor: { clientX: 80, clientY: 90 },
        intent: { type: "select-entity", entityId: "legacy-cell-1" },
      },
      { intent: { type: "select-cell", cell: { q: 0, r: -1 } } },
    ]);
    expect(cells[0].querySelector("polygon")?.getAttribute("stroke-dasharray")).toBe("7 4");
  });

  test("animates accepted movement and skips it for reduced motion", () => {
    const { container, rerender } = render(
      <Renderer2DBoard board={board()} onIntent={vi.fn()} />,
    );
    const animated = container.querySelector('[data-entity-id="legacy-cell-1"] > g');
    expect(animated?.getAttribute("style")).toContain("tbs-renderer-2d-move 260ms");

    rerender(<Renderer2DBoard board={board()} onIntent={vi.fn()} reducedMotion />);
    const settled = container.querySelector('[data-entity-id="legacy-cell-1"] > g');
    expect(settled?.getAttribute("style") ?? "").not.toContain("tbs-renderer-2d-move");
  });
});
