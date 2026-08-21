import {
  advanceGameInteraction,
  createBoardInteractionView,
  createGameInteractionPreview,
  createInitialGameInteractionState,
  presentBoard,
  type BoardCellViewModel,
  type BoardInteractionAnchor,
  type BoardIntent,
} from "@TBS/presentation";
import { Renderer2DBoard } from "@TBS/renderer-2d";
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";

import ActionForm from "../../components/Map/Cell/Action/ActionForm";
import type { ActiveMapProps, MenuPosition } from "../../types";
import { AccessibleBoardNavigator } from "./AccessibleBoardNavigator";
import { buildGamePanelState } from "./gamePanelState";
import { RendererErrorBoundary } from "./RendererErrorBoundary";
import { readRendererPreference, writeRendererPreference } from "./rendererPreference";
import { useReducedMotion } from "./useReducedMotion";

const Renderer3DBoard = lazy(async () => {
  const module = await import("@TBS/renderer-3d");
  return { default: module.Renderer3DBoard };
});

const MENU_GAP = 12;

const menuPositionFor = (
  element: HTMLDivElement | null,
  anchor?: BoardInteractionAnchor,
): MenuPosition => {
  const bounds = element?.getBoundingClientRect();
  if (bounds && anchor) {
    return {
      left: anchor.clientX - bounds.left + MENU_GAP,
      top: anchor.clientY - bounds.top + MENU_GAP,
    };
  }
  return {
    left: (bounds?.width ?? 0) / 2,
    top: (bounds?.height ?? 0) / 2,
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
  const [lastInspectedCellId, setLastInspectedCellId] = useState<BoardCellViewModel["id"] | null>(null);
  const [interactionState, setInteractionState] = useState(createInitialGameInteractionState);
  const [menuPlacement, setMenuPlacement] = useState<"anchored" | "docked">("docked");
  const [renderer, setRenderer] = useState(readRendererPreference);
  const [rendererError, setRendererError] = useState(false);
  const reducedMotion = useReducedMotion();
  latestEvents.current = events;

  useEffect(() => {
    const adjacent = previousRevision.current + 1 === state.revision;
    previousRevision.current = state.revision;
    setAnimationEvents(adjacent ? latestEvents.current : []);
    setInteractionState(createInitialGameInteractionState());
    setLastInspectedCellId(null);
  }, [state.revision]);

  useEffect(() => {
    if (reducedMotion) setAnimationEvents([]);
  }, [reducedMotion]);

  useEffect(() => writeRendererPreference(renderer), [renderer]);

  useEffect(() => {
    onPanelStateChange?.(buildGamePanelState({
      interactionState,
      lastInspectedCellId,
      state,
    }));
  }, [interactionState, lastInspectedCellId, onPanelStateChange, state]);

  const interactionPreview = useMemo(() => createGameInteractionPreview({
    active,
    state,
    perspective,
  }), [active, perspective, state]);
  const interactionView = useMemo(() => createBoardInteractionView(
    interactionState,
    { active, state, perspective },
    lastInspectedCellId,
    interactionPreview,
  ), [active, interactionPreview, interactionState, lastInspectedCellId, perspective, state]);
  const board = useMemo(() => presentBoard({
    state,
    events: animationEvents,
    interaction: interactionView,
  }), [animationEvents, interactionView, state]);

  const handleIntent = useCallback((intent: BoardIntent, anchor?: BoardInteractionAnchor) => {
    const menuPosition = anchor
      ? menuPositionFor(parentRef.current, anchor)
      : interactionState.menu?.position ?? menuPositionFor(parentRef.current);
    const result = advanceGameInteraction(interactionState, intent, {
      active,
      menuPosition,
      perspective,
      preview: interactionPreview,
      state,
    });
    if (result.state.menu) {
      if (anchor) setMenuPlacement("anchored");
      else if (intent.type !== "choose-action") setMenuPlacement("docked");
    }
    setInteractionState(result.state);
    if (result.inspectedCellId !== undefined) {
      setLastInspectedCellId(result.inspectedCellId);
    }
    if (result.command) onAction?.(result.command);
  }, [active, interactionPreview, interactionState, onAction, perspective, state]);
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
            <Renderer3DBoard
              board={board}
              onIntent={handleIntent}
              onViewChange={() => setMenuPlacement("docked")}
              reducedMotion={reducedMotion}
            />
          </Suspense>
        </RendererErrorBoundary>
      )}
      {renderer === "3d" && !rendererError && <AccessibleBoardNavigator board={board} onIntent={handleIntent} />}
      {interactionState.menu && (
        <ActionForm
          left={interactionState.menu.position.left}
          onAction={(actionType) => handleIntent({ type: "choose-action", actionType })}
          options={interactionState.menu.options}
          placement={menuPlacement}
          top={interactionState.menu.position.top}
        />
      )}
    </div>
  );
};

export default memo(GameMap);
