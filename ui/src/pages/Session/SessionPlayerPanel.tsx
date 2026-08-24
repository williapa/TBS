type SessionPlayerPanelProps = {
  activeTurn: boolean;
  canEndTurn: boolean;
  color: "orange" | "purple";
  displayName?: string;
  income: number;
  isLocalPlayer: boolean;
  isOnline: boolean;
  isWinner: boolean;
  money: number;
  onEndTurn: () => void;
};

export const SessionPlayerPanel = ({
  activeTurn,
  canEndTurn,
  color,
  displayName,
  income,
  isLocalPlayer,
  isOnline,
  isWinner,
  money,
  onEndTurn,
}: SessionPlayerPanelProps) => {
  const name = displayName ?? "Open seat";
  const avatarSeed = encodeURIComponent(displayName ?? color);
  const flip = color === "orange" ? "&flip=true" : "";

  return (
    <aside
      aria-label={`${color} player`}
      className={`player panel${activeTurn ? " panel--active" : ""}${isWinner ? " panel--winner" : ""}`}
    >
      <div className={`player__identity player__identity--${color}`}>
        <p className="player__name">
          {name} {isLocalPlayer && "(you)"} {activeTurn && "(acting)"}
        </p>
        {isWinner && <p className="player__winner"><span aria-hidden="true">★</span> Winner</p>}
        <img
          alt="avatar"
          className="player__avatar"
          src={`https://api.dicebear.com/5.x/adventurer/svg?seed=${avatarSeed}${flip}`}
        />
        <p className="player__presence">{displayName ? (isOnline ? "online" : "offline") : "waiting"}</p>
      </div>
      {canEndTurn && (
        <div className="player__actions">
          <button className="button" type="button" onClick={onEndTurn}>End turn</button>
        </div>
      )}
      <div className="player__stats">
        <p><b>Money:</b> <span>{money}</span></p>
        <p><b>Income/turn:</b> <span>{income}</span></p>
      </div>
    </aside>
  );
};
