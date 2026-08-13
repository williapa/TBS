import {
  advanceGameInteraction,
  createBoardInteractionView,
  createInitialGameInteractionState,
  presentBoard,
  type BoardIntent,
} from "@TBS/presentation";
import { Renderer2DBoard } from "@TBS/renderer-2d";
import { lazy, Suspense, useEffect, useRef, useState } from "react";

import ActionForm from "../../components/Map/Cell/Action/ActionForm";
import type { ActiveMapProps, Coords, MenuPosition } from "../../types";
import { AccessibleBoardNavigator } from "./AccessibleBoardNavigator";
import { buildGamePanelState } from "./gamePanelState";
import { RendererErrorBoundary } from "./RendererErrorBoundary";
import { readRendererPreference, writeRendererPreference } from "./rendererPreference";
import { useReducedMotion } from "./useReducedMotion";

const Renderer3DBoard = lazy(async () => {
  const module = await import("@TBS/renderer-3d");
  return { default: module.Renderer3DBoard };
});

const menuPositionFor = (element: HTMLDivElement | null): MenuPosition => {
  const bounds = element?.getBoundingClientRect();
  return {
    left: (bounds?.left ?? 0) + window.scrollX + 16,
    top: (bounds?.top ?? 0) + window.scrollY + 48,
  };
};

const GameMap = ({
  active = false,
  events = [],
  onAction,
  onPanelStateChange,
  perspective,
  state,
}: ActiveMapProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const previousRevision = useRef(state.revision);
  const latestEvents = useRef(events);
  const [animationEvents, setAnimationEvents] = useState<NonNullable<ActiveMapProps["events"]>>([]);
  const [lastInspectedCoords, setLastInspectedCoords] = useState<Coords | null>(null);
  const [interactionState, setInteractionState] = useState(createInitialGameInteractionState);
  const [renderer, setRenderer] = useState(readRendererPreference);
  const [rendererError, setRendererError] = useState(false);
  const reducedMotion = useReducedMotion();
  latestEvents.current = events;

  useEffect(() => {
    const adjacent = previousRevision.current + 1 === state.revision;
    previousRevision.current = state.revision;
    setAnimationEvents(adjacent ? latestEvents.current : []);
    setInteractionState(createInitialGameInteractionState());
    setLastInspectedCoords(null);
  }, [state.revision]);

  useEffect(() => {
    if (reducedMotion) setAnimationEvents([]);
  }, [reducedMotion]);

  useEffect(() => writeRendererPreference(renderer), [renderer]);

  useEffect(() => {
    onPanelStateChange?.(buildGamePanelState({
      active,
      interactionState,
      lastInspectedCoords,
      mapData: state.map,
    }));
  }, [active, interactionState, lastInspectedCoords, onPanelStateChange, state.map]);

  const context = {
    active,
    availableFunds: state.money[perspective],
    map: state.map,
    menuPosition: menuPositionFor(parentRef.current),
    perspective,
  };
  const board = presentBoard({
    state,
    events: animationEvents,
    interaction: createBoardInteractionView(
      interactionState,
      context,
      lastInspectedCoords,
    ),
  });

  const handleIntent = (intent: BoardIntent) => {
    const result = advanceGameInteraction(interactionState, intent, {
      ...context,
      menuPosition: menuPositionFor(parentRef.current),
    });
    setInteractionState(result.state);
    if ("inspectedCell" in result) setLastInspectedCoords(result.inspectedCell ?? null);
    if (result.command) onAction?.(result.command);
  };
  const selectRenderer = (nextRenderer: "2d" | "3d") => {
    setAnimationEvents([]);
    setRendererError(false);
    setRenderer(nextRenderer);
  };

  return (
    <div className="game special-panel" ref={parentRef}>
      <div aria-label="Board view" className="game-renderer-toggle" role="group">
        <button aria-pressed={renderer === "2d"} onClick={() => selectRenderer("2d")} type="button">Use 2D board</button>
        <button aria-pressed={renderer === "3d"} onClick={() => selectRenderer("3d")} type="button">Use 3D board</button>
      </div>
      {renderer === "2d" ? (
        <Renderer2DBoard board={board} onIntent={handleIntent} reducedMotion={reducedMotion} />
      ) : (
        <RendererErrorBoundary
          fallback={<p className="game-renderer-error" role="alert">The 3D board is unavailable. The 2D board remains available.</p>}
          onError={() => setRendererError(true)}
        >
          <Suspense fallback={<p className="game-renderer-loading" role="status">Loading 3D board…</p>}>
            <Renderer3DBoard board={board} onIntent={handleIntent} reducedMotion={reducedMotion} />
          </Suspense>
        </RendererErrorBoundary>
      )}
      {renderer === "3d" && !rendererError && <AccessibleBoardNavigator board={board} onIntent={handleIntent} />}
      {interactionState.menu && (
        <ActionForm
          left={interactionState.menu.position.left}
          onAction={(actionType) => handleIntent({ type: "choose-action", actionType })}
          options={interactionState.menu.options}
          top={interactionState.menu.position.top}
        />
      )}
    </div>
  );
};

export default GameMap;
