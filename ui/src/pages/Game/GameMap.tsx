import { useEffect, useReducer, useRef, useState } from "react";
import { moveMapUnit } from "@TBS/common";
import HexGrid from "../../components/HexGrid/HexGrid";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import useUser from "../../hooks/useUser";
import { useGameSocket } from "../../hooks/gameSocketContext";
import {
  buildAttackAction,
  buildMoveAction,
  buildSpawnAction,
  createInitialGameInteractionState,
  gameInteractionReducer,
  getSelectableUnit,
  getTargetType,
  getTargetedCellIndexes,
} from "./gameInteraction";

const sameCoords = (a: Coords | null, b: Coords) =>
  Boolean(a && a.x === b.x && a.y === b.y);

const GameMap = ({ active = false, availableFunds, mapData, perspective }: ActiveMapProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<dim>({ width: 100, height: 100 });
  const windowSize = useWindowDimensions();
  const { sendMove, setMap } = useGameSocket();
  const { user, pin } = useUser();
  const [interactionState, dispatch] = useReducer(
    gameInteractionReducer,
    undefined,
    createInitialGameInteractionState
  );

  useEffect(() => {
    const parent = parentRef.current;
    if (parent) {
      setDimensions({
        width: parent.clientWidth,
        height: parent.clientHeight
      });
    }
  }, [parentRef, windowSize]);

  useEffect(() => {
    dispatch({ type: "RESET_AFTER_SERVER_EVENT" });
  }, [mapData]);

  const handleCellClick = (mapItem: MapItem, position: MenuPosition) => {
    if (!active) {
      return;
    }

    if (
      interactionState.pendingAction === "attack" &&
      interactionState.availableAttackTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_ATTACK_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "spawn" &&
      interactionState.availableSpawnTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_SPAWN_TARGET", cell: mapItem, position });
      return;
    }

    if (getSelectableUnit(mapItem, perspective)) {
      if (sameCoords(interactionState.origin, { x: mapItem.row, y: mapItem.column })) {
        dispatch({
          type: "OPEN_ORIGIN_MENU",
          availableFunds,
          map: mapData,
          perspective,
          position,
        });
        return;
      }

      dispatch({
        type: "SELECT_ACTOR",
        availableFunds,
        map: mapData,
        position,
        unit: mapItem,
      });
      return;
    }

    if (interactionState.availableMoveTargets.includes(mapItem.index)) {
      dispatch({
        type: "CHOOSE_MOVE_TARGET",
        cell: mapItem,
        map: mapData,
        perspective,
        position,
      });
      return;
    }

    dispatch({ type: "CANCEL_FLOW" });
  };

  const handleMenuAction = (action: GameMenuActionId) => {
    if (action === "cancel") {
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "chooseAttack") {
      dispatch({ type: "CHOOSE_ATTACK_MODE", map: mapData, perspective });
      return;
    }

    if (action.startsWith("spawn:")) {
      dispatch({
        type: "CHOOSE_SPAWN_UNIT",
        map: mapData,
        unit: action.replace("spawn:", "") as SpawnableUnitType,
      });
      return;
    }

    if (action === "move") {
      const moveAction = buildMoveAction(interactionState);

      if (!moveAction || moveAction.action !== "move") {
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      setMap(moveMapUnit(mapData, moveAction.start, moveAction.end));
      sendMove(moveAction, user, pin);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmAttack") {
      const attackAction = buildAttackAction(interactionState);

      if (!attackAction) {
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(attackAction, user, pin);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmSpawn") {
      const spawnAction = buildSpawnAction(interactionState);

      if (!spawnAction) {
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(spawnAction, user, pin);
      dispatch({ type: "CANCEL_FLOW" });
    }
  };

  return (
    <div className="game special-panel" ref={parentRef}>
      <HexGrid
        activeTeam={active ? perspective : ("gray" as TeamType.gray)}
        dimensions={dimensions}
        gameInteraction={{
          interactive: active,
          menu: interactionState.menu,
          onCellClick: handleCellClick,
          onMenuAction: handleMenuAction,
          targetedCellIndexes: getTargetedCellIndexes(interactionState),
          targetType: getTargetType(interactionState),
        }}
        mapData={mapData}
      />
    </div>
  );
};

export default GameMap;
