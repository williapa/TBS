import type { SessionRole } from "@TBS/application";
import type { StandardActionDraft } from "@TBS/presentation";
import { useCallback } from "react";
import { Link } from "react-router-dom";

import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import { useSoloGame } from "../../solo";
import { GameView } from "./GameView";

type PlayerTeamId = Exclude<SessionRole, "spectator">;

const teamName = (teamId: PlayerTeamId | undefined): string | undefined => {
  if (teamId === "orange") return "Orange";
  if (teamId === "purple") return "Purple";
  return teamId;
};

export const SoloGamePage = () => {
  const { actions, error, game, submitAction } = useSoloGame();
  const send = useCallback((action: StandardActionDraft) => {
    if (!game) return;
    submitAction(createActionEnvelope(game.state.revision, action));
  }, [game, submitAction]);

  if (!game) {
    return (
      <main className="cloudscape-form-page">
        <h1>No solo test game is active</h1>
        <p>Solo test games stay in this browser tab and end when the page is refreshed.</p>
        <Link to="/game/new">Start a game</Link>
      </main>
    );
  }

  const { state } = game;
  const activeTeamId = state.lifecycle.phase === "active"
    ? state.lifecycle.activeTeamId
    : undefined;
  const winnerTeamId = state.lifecycle.phase === "finished"
    ? state.lifecycle.winnerTeamId
    : undefined;
  const orangeTeamId = Object.values(state.teams).find(({ id }) => id === "orange")?.id;
  if (!orangeTeamId) {
    return <p role="alert">The game does not contain the standard orange team.</p>;
  }
  const latestAction = actions.at(-1);
  const latestTransition = latestAction?.revision === state.revision ? latestAction : undefined;
  const statusLabel = winnerTeamId
    ? `${teamName(winnerTeamId)} team wins!`
    : "Solo test game";
  const turnAnnouncement = activeTeamId
    ? `${teamName(activeTeamId)} turn — you control both teams`
    : undefined;

  return (
    <GameView
      actions={actions}
      controlledTeamId={activeTeamId}
      errorMessage={error?.message}
      events={latestTransition?.events ?? []}
      metadata={(
        <>
          <dt>Mode</dt><dd>Local solo test</dd>
          <dt>Map</dt><dd>{game.mapName}</dd>
        </>
      )}
      onAction={send}
      perspective={activeTeamId ?? orangeTeamId}
      players={{
        orange: {
          displayName: "Local Orange",
          isLocalPlayer: true,
          isOnline: true,
          metadataSuffix: "(local)",
          presenceLabel: "local",
        },
        purple: {
          displayName: "Local Purple",
          isLocalPlayer: true,
          isOnline: true,
          metadataSuffix: "(local)",
          presenceLabel: "local",
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
