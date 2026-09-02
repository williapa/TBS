import type { SessionRole } from "@TBS/application";
import type { StandardActionDraft } from "@TBS/presentation";
import { useCallback } from "react";

import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import { useGameSession } from "../../multiplayer/GameSessionProvider";
import { GameView } from "./GameView";

type PlayerTeamId = Exclude<SessionRole, "spectator">;

export const SessionGamePage = () => {
  const {
    actions,
    error,
    optimisticTransition,
    presence,
    role,
    snapshot,
    submitAction,
    submitState,
  } = useGameSession();
  const send = useCallback((action: StandardActionDraft) => {
    if (!snapshot) return;
    void submitAction(createActionEnvelope(snapshot.state.revision, action));
  }, [snapshot, submitAction]);
  if (!snapshot || !role) return null;

  const renderedSnapshot = optimisticTransition?.snapshot ?? snapshot;
  const { players, spectatorCount } = snapshot;
  const { state } = renderedSnapshot;
  const orangeTeamId = Object.values(state.teams).find(({ id }) => id === "orange")?.id;
  const purpleTeamId = Object.values(state.teams).find(({ id }) => id === "purple")?.id;
  if (!orangeTeamId || !purpleTeamId) {
    return <p role="alert">The game does not contain the standard player teams.</p>;
  }

  const activeTeamId = state.lifecycle.phase === "active"
    ? state.lifecycle.activeTeamId
    : undefined;
  const winnerTeamId = state.lifecycle.phase === "finished"
    ? state.lifecycle.winnerTeamId
    : undefined;
  const onlineMembers = new Set(presence.map((entry) => entry.memberId));
  const onlineSpectators = new Set(
    presence.filter((entry) => entry.role === "spectator").map((entry) => entry.memberId),
  ).size;
  const winnerTeamName = winnerTeamId === orangeTeamId
    ? "Orange"
    : winnerTeamId === purpleTeamId
      ? "Purple"
      : undefined;
  const winnerDisplayName = winnerTeamId ? players[winnerTeamId]?.displayName : undefined;
  const statusLabel = state.lifecycle.phase === "waiting"
    ? "Waiting for an opponent"
    : state.lifecycle.phase === "active"
      ? "Game in progress"
      : `${winnerTeamName} team wins${winnerDisplayName ? ` — ${winnerDisplayName} is the winner!` : "!"}`;
  const latestAction = actions.at(-1);
  const committedTransition = latestAction?.revision === state.revision
    ? latestAction
    : undefined;
  const events = optimisticTransition?.events ?? committedTransition?.events ?? [];
  const transitionId = optimisticTransition?.actionId ?? committedTransition?.actionId;
  const activePlayerName = activeTeamId === orangeTeamId
    ? players[orangeTeamId]?.displayName ?? "Orange"
    : activeTeamId === purpleTeamId
      ? players[purpleTeamId]?.displayName ?? "Purple"
      : undefined;
  const turnAnnouncement = activeTeamId
    ? activeTeamId === role
      ? "Your turn"
      : `${activePlayerName ?? activeTeamId}'s turn`
    : undefined;
  const controlledTeamId: PlayerTeamId | undefined = role !== "spectator"
    && submitState === "idle"
    ? role
    : undefined;
  const perspective = role === "spectator" ? orangeTeamId : role;

  return (
    <GameView
      actions={actions}
      controlledTeamId={controlledTeamId}
      errorMessage={error?.message}
      events={events}
      metadata={(
        <>
          <dt>Spectators</dt><dd>{spectatorCount}</dd>
          <dt>Viewers online</dt><dd>{presence.length}</dd>
          <dt>Spectators online</dt><dd>{onlineSpectators}</dd>
        </>
      )}
      onAction={send}
      pending={Boolean(optimisticTransition)}
      perspective={perspective}
      players={{
        orange: {
          displayName: players[orangeTeamId]?.displayName,
          isLocalPlayer: role === orangeTeamId,
          isOnline: Boolean(players[orangeTeamId] && onlineMembers.has(players[orangeTeamId].memberId)),
          metadataSuffix: players[orangeTeamId]
            ? onlineMembers.has(players[orangeTeamId].memberId) ? "(online)" : "(offline)"
            : undefined,
        },
        purple: {
          displayName: players[purpleTeamId]?.displayName,
          isLocalPlayer: role === purpleTeamId,
          isOnline: Boolean(players[purpleTeamId] && onlineMembers.has(players[purpleTeamId].memberId)),
          metadataSuffix: players[purpleTeamId]
            ? onlineMembers.has(players[purpleTeamId].memberId) ? "(online)" : "(offline)"
            : undefined,
        },
      }}
      revision={snapshot.state.revision}
      state={state}
      statusLabel={statusLabel}
      transitionId={transitionId}
      turnAnnouncement={turnAnnouncement}
    />
  );
};
