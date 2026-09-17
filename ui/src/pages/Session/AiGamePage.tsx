import { SoloGameModel, type CreateAiOpponent } from "@TBS/application";
import { createBundledMapPresets, createInitialGameSetup } from "@TBS/game-setup";
import type { StandardActionDraft } from "@TBS/presentation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import { GameView } from "./GameView";

export const AI_MOVE_DELAY_MS = 1000;

const createAiGameModel = (): SoloGameModel => {
  const preset = createBundledMapPresets().find(({ id }) => id === "four-forests");
  if (!preset) throw new Error("The bundled Four Forests map is unavailable");
  const model = new SoloGameModel();
  model.startGame({ initialState: createInitialGameSetup(preset), mapName: preset.name });
  return model;
};

export const AiGamePage = ({ createAiOpponent }: Readonly<{
  createAiOpponent: CreateAiOpponent;
}>) => {
  const model = useMemo(createAiGameModel, []);
  const ai = useMemo(createAiOpponent, [createAiOpponent]);
  const { actions, error, game } = useSyncExternalStore(model.subscribe, model.getState, model.getState);
  const [aiError, setAiError] = useState<string>();
  const [aiThinking, setAiThinking] = useState(false);

  useEffect(() => () => ai.dispose(), [ai]);

  useEffect(() => {
    const state = game?.state;
    if (!state || state.lifecycle.phase !== "active" || state.lifecycle.activeTeamId !== "purple") {
      setAiThinking(false);
      return;
    }
    let active = true;
    let moveTimer: number | undefined;
    setAiError(undefined);
    setAiThinking(true);
    void ai.choose(state).then((selection) => {
      if (!active) return;
      moveTimer = window.setTimeout(() => {
        if (!active) return;
        const current = model.getState().game?.state;
        if (
          !current
          || current.revision !== selection.stateRevision
          || current.lifecycle.phase !== "active"
          || current.lifecycle.activeTeamId !== "purple"
        ) return;
        const result = model.submitAction(createActionEnvelope(current, selection.action));
        if (!result.ok) setAiError(result.error.message);
      }, AI_MOVE_DELAY_MS);
    }).catch((value: unknown) => {
      if (!active) return;
      setAiThinking(false);
      setAiError(value instanceof Error ? value.message : "The AI could not choose a move");
    });
    return () => {
      active = false;
      if (moveTimer !== undefined) window.clearTimeout(moveTimer);
    };
  }, [ai, game?.state, model]);

  const send = useCallback((action: StandardActionDraft) => {
    const state = model.getState().game?.state;
    if (!state || state.lifecycle.phase !== "active" || state.lifecycle.activeTeamId !== "orange") return;
    model.submitAction(createActionEnvelope(state, action));
  }, [model]);

  if (!game) return <p role="alert">The Four Forests AI game could not be started.</p>;

  const { state } = game;
  const orangeTeamId = Object.values(state.teams).find(({ id }) => id === "orange")?.id;
  if (!orangeTeamId) return <p role="alert">The game does not contain the standard Orange team.</p>;
  const activeTeamId = state.lifecycle.phase === "active" ? state.lifecycle.activeTeamId : undefined;
  const winnerTeamId = state.lifecycle.phase === "finished" && "winnerTeamId" in state.lifecycle
    ? state.lifecycle.winnerTeamId
    : undefined;
  const isDraw = state.lifecycle.phase === "finished" && "result" in state.lifecycle;
  const latestAction = actions.at(-1);
  const latestTransition = latestAction?.revision === state.revision ? latestAction : undefined;
  const statusLabel = isDraw
    ? "Game ended in a draw"
    : winnerTeamId
      ? `${winnerTeamId === "orange" ? "Orange" : "Purple"} team wins!`
      : "Player vs AI";
  const turnAnnouncement = activeTeamId === "purple"
    ? aiError ? "AI turn paused" : aiThinking ? "AI is choosing its next move…" : "AI turn"
    : activeTeamId === "orange" ? "Your turn — you are Orange" : undefined;

  return (
    <GameView
      actions={actions}
      controlledTeamId={orangeTeamId}
      errorMessage={aiError ?? error?.message}
      events={latestTransition?.events ?? []}
      metadata={(
        <>
          <dt>Mode</dt><dd>Player vs AI</dd>
          <dt>Map</dt><dd>{game.mapName}</dd>
        </>
      )}
      onAction={send}
      perspective={orangeTeamId}
      players={{
        orange: {
          displayName: "You",
          isLocalPlayer: true,
          isOnline: true,
          metadataSuffix: "(Orange)",
          presenceLabel: "local",
        },
        purple: {
          displayName: "Four Forests AI",
          isLocalPlayer: false,
          isOnline: true,
          metadataSuffix: "(Purple)",
          presenceLabel: "computer",
        },
      }}
      revision={state.revision}
      state={state}
      statusLabel={statusLabel}
      transitionId={latestTransition?.actionId}
      turnAnnouncement={turnAnnouncement}
    />
  );
};
