import { getIncomeForTeam } from "@TBS/common";
import useUser from "./useUser";
import { useGameSocket } from "./gameSocketContext";

const ORANGE = "orange" as TeamType.orange;
const PURPLE = "purple" as TeamType.purple;

const hasSocketMap = (map: MapItem[][]) => map.length > 0 && map[0].length > 0;

const useActiveGameView = (game: GameProps): ActiveGameView => {
  const { challengerMoney, creatorMoney, map, turn } = useGameSocket();
  const { user } = useUser();

  const isCreatorPerspective = user === game.creator;
  const perspectiveTeam = isCreatorPerspective ? ORANGE : PURPLE;
  const opponentTeam = perspectiveTeam === ORANGE ? PURPLE : ORANGE;
  const currentMap = hasSocketMap(map) ? map : game.mapData;
  const currentTurn = turn.length > 0 && turn !== "gameOver" ? turn : game.activeTurn;
  const isGameOver = Boolean(game.winner) || turn === "gameOver";
  const creatorIncome = getIncomeForTeam(currentMap, ORANGE);
  const challengerIncome = getIncomeForTeam(currentMap, PURPLE);

  return {
    challengerIncome,
    challengerMoney: challengerMoney ?? game.challengerMoney,
    creatorIncome,
    creatorMoney: creatorMoney ?? game.creatorMoney,
    currentMap,
    currentTurn,
    isCreatorPerspective,
    isGameOver,
    isLocalPlayersTurn: !isGameOver && user === currentTurn,
    opponentTeam,
    perspectiveTeam,
  };
};

export default useActiveGameView;
