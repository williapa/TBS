import {
  presentTeamPanel,
  presentWinCondition,
  type StandardActionDraft,
} from "@TBS/presentation";
import { useCallback, useState } from "react";

import "../Game/Game.css";
import GameMap from "../Game/GameMap";
import GamePanel from "../Game/GamePanel";
import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import { useGameSession } from "../../multiplayer/GameSessionProvider";
import type { GamePanelState } from "../../types";
import { SessionEventsPanel } from "./SessionEventsPanel";
import { SessionPlayerPanel } from "./SessionPlayerPanel";

export const SessionGamePage = () => {
  const { actions, error, presence, role, snapshot, submitAction, submitState } = useGameSession();
  const [panelState, setPanelState] = useState<GamePanelState | null>(null);
  const send = useCallback((action: StandardActionDraft) => {
    if (!snapshot) return;
    void submitAction(createActionEnvelope(snapshot.state.revision, action));
  }, [snapshot, submitAction]);
  if (!snapshot || !role) return null;
  const { players, spectatorCount, state } = snapshot;
  const orangeTeamId = Object.values(state.teams).find(({ id }) => id === "orange")?.id;
  const purpleTeamId = Object.values(state.teams).find(({ id }) => id === "purple")?.id;
  if (!orangeTeamId || !purpleTeamId) {
    return <p role="alert">The game does not contain the standard player teams.</p>;
  }
  const perspective = role === "spectator" ? orangeTeamId : role;
  const activeTeamId = state.lifecycle.phase === "active"
    ? state.lifecycle.activeTeamId
    : undefined;
  const winnerTeamId = state.lifecycle.phase === "finished"
    ? state.lifecycle.winnerTeamId
    : undefined;
  const canAct = activeTeamId === role && submitState === "idle";
  const onlineMembers = new Set(presence.map((entry) => entry.memberId));
  const onlineSpectators = new Set(
    presence.filter((entry) => entry.role === "spectator").map((entry) => entry.memberId),
  ).size;
  const orangePanel = presentTeamPanel(state, orangeTeamId);
  const purplePanel = presentTeamPanel(state, purpleTeamId);
  if (!orangePanel || !purplePanel) {
    return <p role="alert">The game team state is incomplete.</p>;
  }
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
  const latestEvents = actions.at(-1)?.revision === state.revision
    ? actions.at(-1)?.events ?? []
    : [];
  const winCondition = presentWinCondition(state.objectives);

  return (
    <main className="game-view" aria-labelledby="game-state-title">
      <h1 className="game-view__status" id="game-state-title">{statusLabel}</h1>
      <dl className="game-view__metadata">
        <dt>Orange</dt><dd>{players[orangeTeamId]?.displayName ?? "Open seat"} {players[orangeTeamId] && (onlineMembers.has(players[orangeTeamId].memberId) ? "(online)" : "(offline)")}</dd>
        <dt>Purple</dt><dd>{players[purpleTeamId]?.displayName ?? "Open seat"} {players[purpleTeamId] && (onlineMembers.has(players[purpleTeamId].memberId) ? "(online)" : "(offline)")}</dd>
        <dt>Spectators</dt><dd>{spectatorCount}</dd>
        <dt>Viewers online</dt><dd>{presence.length}</dd>
        <dt>Spectators online</dt><dd>{onlineSpectators}</dd>
        <dt>Revision</dt><dd>{state.revision}</dd>
        {activeTeamId && <><dt>Current turn</dt><dd>{activeTeamId}</dd></>}
        {winnerTeamId && <><dt>Winner</dt><dd>{winnerTeamId}</dd></>}
      </dl>
      {error && <p className="game-view__error" role="alert">{error.message}</p>}
      <div className="r1">
        <SessionPlayerPanel
          activeTurn={orangePanel.active}
          canEndTurn={canAct && role === orangeTeamId}
          color="orange"
          displayName={players[orangeTeamId]?.displayName}
          income={orangePanel.income}
          isLocalPlayer={role === orangeTeamId}
          isOnline={Boolean(players[orangeTeamId] && onlineMembers.has(players[orangeTeamId].memberId))}
          isWinner={orangePanel.winner}
          money={orangePanel.money}
          onEndTurn={() => send({ type: "end-turn" })}
        />
        <GameMap
          active={canAct}
          events={latestEvents}
          onAction={send}
          onPanelStateChange={setPanelState}
          perspective={perspective}
          state={state}
        />
        <SessionPlayerPanel
          activeTurn={purplePanel.active}
          canEndTurn={canAct && role === purpleTeamId}
          color="purple"
          displayName={players[purpleTeamId]?.displayName}
          income={purplePanel.income}
          isLocalPlayer={role === purpleTeamId}
          isOnline={Boolean(players[purpleTeamId] && onlineMembers.has(players[purpleTeamId].memberId))}
          isWinner={purplePanel.winner}
          money={purplePanel.money}
          onEndTurn={() => send({ type: "end-turn" })}
        />
      </div>
      <div className="r2">
        <GamePanel state={panelState} winCondition={winCondition} />
        <SessionEventsPanel actions={actions} />
      </div>
    </main>
  );
};
