import type { GameAction } from "@TBS/common";
import { getIncomeForTeam } from "@TBS/common";
import { useState } from "react";
import "../Game/Game.css";
import GameMap from "../Game/GameMap";
import GamePanel from "../Game/GamePanel";
import { createActionEnvelope } from "../../multiplayer/createActionEnvelope";
import { useGameSession } from "../../multiplayer/GameSessionProvider";
import { SessionEventsPanel } from "./SessionEventsPanel";
import { SessionPlayerPanel } from "./SessionPlayerPanel";
import type { GamePanelState } from "../../types";

export const SessionGamePage = () => {
  const { actions, error, presence, role, snapshot, submitAction, submitState } = useGameSession();
  const [panelState, setPanelState] = useState<GamePanelState | null>(null);
  if (!snapshot || !role) return null;
  const { players, spectatorCount, state } = snapshot;
  const perspective = role === "orange" || role === "purple" ? role : "orange";
  const canAct = state.status === "active" && role === state.activeTeam && submitState === "idle";
  const onlineMembers = new Set(presence.map((entry) => entry.memberId));
  const onlineSpectators = new Set(presence.filter((entry) => entry.role === "spectator").map((entry) => entry.memberId)).size;
  const orangeIncome = getIncomeForTeam(state.map, "orange");
  const purpleIncome = getIncomeForTeam(state.map, "purple");
  const statusLabel = state.status === "waiting"
    ? "Waiting for an opponent"
    : state.status === "active"
      ? "Game in progress"
      : "Game finished";
  const send = (action: GameAction) => {
    void submitAction(createActionEnvelope(state.revision, action));
  };
  const latestEvents = actions.at(-1)?.revision === state.revision
    ? actions.at(-1)?.events ?? []
    : [];

  return (
    <main className="game-view" aria-labelledby="game-state-title">
      <h1 className="game-view__status" id="game-state-title">{statusLabel}</h1>
      <dl className="game-view__metadata">
        <dt>Orange</dt><dd>{players.orange?.displayName ?? "Open seat"} {players.orange && (onlineMembers.has(players.orange.memberId) ? "(online)" : "(offline)")}</dd>
        <dt>Purple</dt><dd>{players.purple?.displayName ?? "Open seat"} {players.purple && (onlineMembers.has(players.purple.memberId) ? "(online)" : "(offline)")}</dd>
        <dt>Spectators</dt><dd>{spectatorCount}</dd>
        <dt>Viewers online</dt><dd>{presence.length}</dd>
        <dt>Spectators online</dt><dd>{onlineSpectators}</dd>
        <dt>Revision</dt><dd>{state.revision}</dd>
        {state.activeTeam && <><dt>Current turn</dt><dd>{state.activeTeam}</dd></>}
        {state.winner && <><dt>Winner</dt><dd>{state.winner}</dd></>}
      </dl>
      {error && <p className="game-view__error" role="alert">{error.message}</p>}
      <div className="r1">
        <SessionPlayerPanel
          activeTurn={state.status === "active" && state.activeTeam === "orange"}
          canEndTurn={canAct && role === "orange"}
          color="orange"
          displayName={players.orange?.displayName}
          income={orangeIncome}
          isLocalPlayer={role === "orange"}
          isOnline={Boolean(players.orange && onlineMembers.has(players.orange.memberId))}
          money={state.money.orange}
          onEndTurn={() => send({ action: "end" })}
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
          activeTurn={state.status === "active" && state.activeTeam === "purple"}
          canEndTurn={canAct && role === "purple"}
          color="purple"
          displayName={players.purple?.displayName}
          income={purpleIncome}
          isLocalPlayer={role === "purple"}
          isOnline={Boolean(players.purple && onlineMembers.has(players.purple.memberId))}
          money={state.money.purple}
          onEndTurn={() => send({ action: "end" })}
        />
      </div>
      <div className="r2">
        <GamePanel state={panelState} />
        <SessionEventsPanel actions={actions} />
      </div>
    </main>
  );
};
