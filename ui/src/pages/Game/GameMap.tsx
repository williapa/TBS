import useWindowDimensions from "../../hooks/useWindowDimensions";
import useLocalStorage from "use-local-storage";
import { useRef, useState, useEffect } from "react";
import HexGrid from "../../components/HexGrid/HexGrid";
import { getAllCellsWhichCanBeReached, getAttackableCells, moveMapUnit } from "@TBS/common";
import { moveableOptions } from "../../components/Map/Unit/unitOptions";
import getRowAndColumn from "../../utils/getRowAndColumn";
import { useGameSocket } from "../../hooks/gameSocketContext";

// use game map instead of active turn map?
const GameMap = ({ active, activeTeam, mapData: initialMapData, perspective }: ActiveMapProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<dim>({ width: 100, height: 100 });
  const attackTargets = useState<number[]>([]);
  const windowSize = useWindowDimensions();
  
  useEffect(() => {
    const parent = parentRef.current;
    if (parent) {
      setDimensions({
        width: parent.clientWidth,
        height: parent.clientHeight
      });
    }
  }, [parentRef, windowSize]);

  const [user] = useLocalStorage("user", { user: "", pin: "" });
  const [editing, setEditing] = useState(false);
  const [actor, setActor] = useState<Actor>(false);
  const { map, sendMove, setMap, turn } = useGameSocket();

  const finalMap = map[0].length > 1 ? map : initialMapData;
  const opponent = (perspective === "orange") ? "purple" as TeamType.purple: "orange" as TeamType.orange;
  const currentActive = turn.length < 1 ? active : (turn === user.user);
  const currentActiveTeam = currentActive ? perspective : opponent;

  // "park&bark" refers to staying in place and attacking
  const postGameAction = (row: number, column: number, mapItem: MapItem, gameAction?: gameActions | "park&bark") => {

    console.log("POST GAME ACTION");

    if (actor && actor[2].x === row && actor[2].y === column && actor[0] !== "park&bark") {
      console.log("ACTOR && CLICKED SAME AS ACTOR && NOT PARK AND BARK (yet)");
      const newActor = actor;
      attackTargets[1]([]);
      newActor[0] = "park&bark";
      setActor(newActor);
      return null;
    }

    if (gameAction === "park&bark" && actor) {
      console.log("park & bark game action");
      console.log(actor);
      actor[0] = "attack";
      setActor([...actor]);
      const xyz = finalMap[actor[2].x][actor[2].y];
      // todo: get attackable cells if there is an actor
      attackTargets[1](
        getAttackableCells(/* activeTeam*/ perspective, [xyz.index], finalMap)
      );

      return null;
    }

    if (!gameAction) {
      // if there is no game action then cancel which resets the targets and goes back to starting
      setActor(false);
      setEditing(false);
      console.log("cancelling due to no game action set.");
      attackTargets[1]([]);
      window.localStorage.removeItem("position");
      return null;
    }

    if (gameAction === "move" && actor) { 

      console.log("move");
      // update map
      const coords = actor[2];
      const newMapData = moveMapUnit(finalMap, coords, { x: row, y: column });
      setActor(false);
      setEditing(false);
      setMap([...newMapData]);
      // post to the api
      sendMove({
        action: "move",
        start: coords,
        end: { x: row, y: column } 
      }, user.user, user.pin);

    } else if (gameAction === "attack" && actor) {
      console.log("attack");
      const position = window.localStorage.getItem("position");
      console.log("position from local storage: ", position);
      let attackDestination;
      if (position) {
        // 
        const [a,b] = getRowAndColumn(Number(position), finalMap[0].length);
        attackDestination = {
          x: a,
          y: b
        };
      } else {
        console.log("using attackers existing position which may be wrong when moving and attacking");
        // Fallback: use actor's original position or destination
        attackDestination = actor[2]; 
      }
      // in place of earlier calls to "cancel":
      // stop showing attack targets
      attackTargets[1]([]);
      // remove the tracked position
      window.localStorage.removeItem("position");

      sendMove({
        action: "attack",
        attacker: actor[2],
        defender: { x: row, y: column },
        end: attackDestination
      }, user.user, user.pin);

    }

  }
  
  const unitClick = (row: number, column: number, mapItem: MapItem, gameAction?: gameActions) => {

    console.log("unit click");

    console.log(gameAction);

    if (moveableOptions.includes(mapItem.unit)) {

      console.log("move actor setup");

      setActor(["move", getAllCellsWhichCanBeReached(mapItem.index, finalMap), { x: mapItem.row, y: mapItem.column }]);

    }

  }

  const callback = actor ? postGameAction : unitClick;

  const game = currentActive ?
    <HexGrid 
      activeTeam={currentActiveTeam}
      actor={actor}
      attackTargets={attackTargets}
      callback={callback}
      dimensions={dimensions}
      editing={editing}
      mapData={finalMap}
      setActor={setActor}
      setEdit={setEditing}
    /> : 
    <HexGrid
      attackTargets={attackTargets}
      callback={()=> undefined}
      dimensions={dimensions}
      editing={false}
      mapData={finalMap}
    />;

  return (
    <div className="game special-panel" ref={parentRef} >
      { game }
    </div>
  );
};
 
 export default GameMap;
