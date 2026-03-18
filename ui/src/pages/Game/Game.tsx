import EventsPanel from "./Events/EventsPanel";
import "./Game.css"
import GameMap from "./GameMap";
import GamePanel from "./GamePanel";
import PlayerDetails from "./PlayerDetails";
import useUser from "../../hooks/useUser";

const ORANGE = "orange" as TeamType.orange;
const PURPLE = "purple" as TeamType.purple;

const Game = (props: GameProps) => {
  // orange is on left, purple is on right
  const creatorTurn = props.creator === props.activeTurn;

  const { user } = useUser();

  const activeTurn = user === props.activeTurn;
  const isCreatorPerspective = user === props.creator;
  return (
    <>
      <div className="r1">
        <PlayerDetails activeTurn={creatorTurn} color="orange" email={props.creator} money={1000} />
        <GameMap active={activeTurn} activeTeam={creatorTurn ? ORANGE : PURPLE } mapData={props.mapData} perspective={isCreatorPerspective ? ORANGE : PURPLE} />
        <PlayerDetails activeTurn={!creatorTurn} color="purple" email={props.challenger} money={1000} />
      </div>
      <div className="r2">
        <GamePanel />
        <EventsPanel />
      </div>
    </>
  );
};

export default Game;
