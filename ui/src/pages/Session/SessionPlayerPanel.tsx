import type { TeamEconomyHistory } from "@TBS/presentation";
import { useState } from "react";

import { EconomyHistoryChart } from "./EconomyHistoryChart";

type SessionPlayerPanelProps = {
  activeTurn: boolean;
  canEndTurn: boolean;
  color: "orange" | "purple";
  displayName?: string;
  history: TeamEconomyHistory;
  income: number;
  isLocalPlayer: boolean;
  isOnline: boolean;
  isWinner: boolean;
  money: number;
  onEndTurn: () => void;
  presenceLabel?: string;
};

export const SessionPlayerPanel = ({
  activeTurn,
  canEndTurn,
  color,
  displayName,
  history,
  income,
  isLocalPlayer,
  isOnline,
  isWinner,
  money,
  onEndTurn,
  presenceLabel,
}: SessionPlayerPanelProps) => {
  const [metric, setMetric] = useState<"money" | "income">("money");
  const name = displayName ?? "Open seat";
  const accessibleName = `${name}${isLocalPlayer ? ", your player" : ""}${activeTurn ? ", current turn" : ""}`;
  const avatarSeed = encodeURIComponent(displayName ?? color);
  const flip = color === "orange" ? "&flip=true" : "";

  return (
    <aside
      aria-label={`${color} player`}
      aria-current={activeTurn ? "true" : undefined}
      className={`player panel${activeTurn ? " panel--active" : ""}${isWinner ? " panel--winner" : ""}`}
    >
      <div className={`player__identity player__identity--${color}`}>
        <p aria-label={accessibleName} className="player__name">{name}</p>
        {activeTurn && <p className="player__turn-indicator">Current turn</p>}
        <img
          alt="avatar"
          className="player__avatar"
          src={`https://api.dicebear.com/5.x/adventurer/svg?seed=${avatarSeed}${flip}`}
        />
        {isWinner && <p className="player__winner"><span aria-hidden="true">★</span> Winner</p>}
        <p className="player__presence">
          {presenceLabel ?? (displayName ? (isOnline ? "online" : "offline") : "waiting")}
        </p>
      </div>
      <div className="player__actions">
        {canEndTurn && (
          <button className="button" type="button" onClick={onEndTurn}>End turn</button>
        )}
      </div>
      <div className="player__economy">
        <div aria-label="Economy graph" className="player__stats" role="group">
          <button
            aria-pressed={metric === "money"}
            className="player__stat-button"
            onClick={() => setMetric("money")}
            type="button"
          >
            <b>Money:</b> <span>${money}</span>
          </button>
          <button
            aria-pressed={metric === "income"}
            className="player__stat-button"
            onClick={() => setMetric("income")}
            type="button"
          >
            <b>Income:</b> <span>${income}</span>
          </button>
        </div>
        <EconomyHistoryChart color={color} metric={metric} points={history[metric]} />
      </div>
    </aside>
  );
};
