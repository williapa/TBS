import type {
  SessionRole,
  StandardAppliedAction,
  StandardGameSnapshot,
} from "@TBS/application";
import {
  presentTeamPanel,
  presentWinCondition,
  type StandardActionDraft,
} from "@TBS/presentation";
import type { ReactNode } from "react";
import { useState } from "react";

import type { GamePanelState } from "../../types";
import GameMap from "../Game/GameMap";
import GamePanel from "../Game/GamePanel";
import "../Game/Game.css";
import { SessionEventsPanel } from "./SessionEventsPanel";
import { SessionPlayerPanel } from "./SessionPlayerPanel";

type PlayerTeamId = Exclude<SessionRole, "spectator">;

export type GameViewPlayer = Readonly<{
  displayName?: string;
  isLocalPlayer: boolean;
  isOnline: boolean;
  metadataSuffix?: string;
  presenceLabel?: string;
}>;

type GameViewProps = Readonly<{
  actions: readonly StandardAppliedAction[];
  controlledTeamId?: PlayerTeamId;
  errorMessage?: string;
  events: StandardAppliedAction["events"];
  metadata?: ReactNode;
  onAction: (action: StandardActionDraft) => void;
  pending?: boolean;
  perspective: PlayerTeamId;
  players: Readonly<Record<"orange" | "purple", GameViewPlayer>>;
  revision: number;
  state: StandardGameSnapshot["state"];
  statusLabel: string;
  transitionId?: StandardAppliedAction["actionId"];
  turnAnnouncement?: string;
}>;

export const GameView = ({
  actions,
  controlledTeamId,
  errorMessage,
  events,
  metadata,
  onAction,
  pending = false,
  perspective,
  players,
  revision,
  state,
  statusLabel,
  transitionId,
  turnAnnouncement,
}: GameViewProps) => {
  const [panelState, setPanelState] = useState<GamePanelState | null>(null);
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
  const canAct = Boolean(activeTeamId && activeTeamId === controlledTeamId && !pending);
  const orangePanel = presentTeamPanel(state, orangeTeamId);
  const purplePanel = presentTeamPanel(state, purpleTeamId);
  if (!orangePanel || !purplePanel) {
    return <p role="alert">The game team state is incomplete.</p>;
  }
  const winCondition = presentWinCondition(state.objectives);

  return (
    <main className="game-view" aria-labelledby="game-state-title">
      <h1 className="game-view__status" id="game-state-title">{statusLabel}</h1>
      {turnAnnouncement && (
        <p className="game-view__turn-status" role="status">{turnAnnouncement}</p>
      )}
      <dl className="game-view__metadata">
        <dt>Orange</dt>
        <dd>{players.orange.displayName ?? "Open seat"}{players.orange.metadataSuffix ? ` ${players.orange.metadataSuffix}` : ""}</dd>
        <dt>Purple</dt>
        <dd>{players.purple.displayName ?? "Open seat"}{players.purple.metadataSuffix ? ` ${players.purple.metadataSuffix}` : ""}</dd>
        {metadata}
        <dt>Revision</dt><dd>{revision}{pending ? " (action pending)" : ""}</dd>
        {activeTeamId && <><dt>Current turn</dt><dd>{activeTeamId}</dd></>}
        {winnerTeamId && <><dt>Winner</dt><dd>{winnerTeamId}</dd></>}
      </dl>
      {errorMessage && <p className="game-view__error" role="alert">{errorMessage}</p>}
      <div className="r1">
        <SessionPlayerPanel
          activeTurn={orangePanel.active}
          canEndTurn={canAct && controlledTeamId === orangeTeamId}
          color="orange"
          displayName={players.orange.displayName}
          income={orangePanel.income}
          isLocalPlayer={players.orange.isLocalPlayer}
          isOnline={players.orange.isOnline}
          isWinner={orangePanel.winner}
          money={orangePanel.money}
          onEndTurn={() => onAction({ type: "end-turn" })}
          presenceLabel={players.orange.presenceLabel}
        />
        <GameMap
          active={canAct}
          events={events}
          onAction={onAction}
          onPanelStateChange={setPanelState}
          perspective={perspective}
          state={state}
          transitionId={transitionId}
        />
        <SessionPlayerPanel
          activeTurn={purplePanel.active}
          canEndTurn={canAct && controlledTeamId === purpleTeamId}
          color="purple"
          displayName={players.purple.displayName}
          income={purplePanel.income}
          isLocalPlayer={players.purple.isLocalPlayer}
          isOnline={players.purple.isOnline}
          isWinner={purplePanel.winner}
          money={purplePanel.money}
          onEndTurn={() => onAction({ type: "end-turn" })}
          presenceLabel={players.purple.presenceLabel}
        />
      </div>
      <div className="r2">
        <GamePanel state={panelState} winCondition={winCondition} />
        <SessionEventsPanel actions={actions} />
      </div>
    </main>
  );
};
