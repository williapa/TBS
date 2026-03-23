import EventsPanel from "./Events/EventsPanel";
import "./Game.css"
import GameMap from "./GameMap";
import GamePanel from "./GamePanel";
import PlayerDetails from "./PlayerDetails";
import useUser from "../../hooks/useUser";
import { useGameSocket } from "../../hooks/gameSocketContext";

const ORANGE = "orange" as TeamType.orange;
const PURPLE = "purple" as TeamType.purple;

const Game = (props: GameProps) => {
  // orange is on left, purple is on right
  const creatorTurn = (props.creator === props.activeTurn);

  const { user } = useUser();
  const { challengerMoney, creatorMoney } = useGameSocket();

  const activeTurn = props.winner ? false : (user === props.activeTurn);
  const isCreatorPerspective = user === props.creator;
  const currentCreatorMoney = creatorMoney ?? props.creatorMoney;
  const currentChallengerMoney = challengerMoney ?? props.challengerMoney;
  return (
    <>
      <div className="r1">
        <PlayerDetails activeTurn={props.winner ? false : creatorTurn} color="orange" email={props.creator} money={currentCreatorMoney} />
        <GameMap active={activeTurn} activeTeam={creatorTurn ? ORANGE : PURPLE } mapData={props.mapData} perspective={isCreatorPerspective ? ORANGE : PURPLE} />
        <PlayerDetails activeTurn={props.winner? false : !creatorTurn} color="purple" email={props.challenger} money={currentChallengerMoney} />
      </div>
      <div className="r2">
        <GamePanel />
        <EventsPanel />
      </div>
    </>
  );
};

export default Game;
