import { useState } from "react";
import EventsPanel from "./Events/EventsPanel";
import "./Game.css"
import GameMap from "./GameMap";
import GamePanel from "./GamePanel";
import PlayerDetails from "./PlayerDetails";
import useActiveGameView from "../../hooks/useActiveGameView";

const Game = (props: GameProps) => {
  const view = useActiveGameView(props);
  const creatorTurn = !view.isGameOver && view.currentTurn === props.creator;
  const [panelState, setPanelState] = useState<GamePanelState | null>(null);

  return (
    <>
      <div className="r1">
        <PlayerDetails
          activeTurn={creatorTurn}
          color="orange"
          email={props.creator}
          income={view.creatorIncome}
          money={view.creatorMoney}
        />
        <GameMap
          active={view.isLocalPlayersTurn}
          availableFunds={
            view.perspectiveTeam === "orange" ? view.creatorMoney : view.challengerMoney
          }
          mapData={view.currentMap}
          onPanelStateChange={setPanelState}
          perspective={view.perspectiveTeam}
        />
        <PlayerDetails
          activeTurn={!view.isGameOver && !creatorTurn}
          color="purple"
          email={props.challenger}
          income={view.challengerIncome}
          money={view.challengerMoney}
        />
      </div>
      <div className="r2">
        <GamePanel state={panelState} />
        <EventsPanel />
      </div>
    </>
  );
};

export default Game;
