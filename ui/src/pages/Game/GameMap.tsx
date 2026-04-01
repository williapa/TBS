import { useEffect, useReducer, useRef, useState } from "react";
import { moveMapUnit } from "@TBS/common";
import HexGrid from "../../components/HexGrid/HexGrid";
import useWindowDimensions from "../../hooks/useWindowDimensions";
import useUser from "../../hooks/useUser";
import { useGameSocket } from "../../hooks/gameSocketContext";
import {
  buildAttackAction,
  buildBoostAction,
  buildConstructAction,
  buildHealAction,
  buildLoadAction,
  buildMoveAction,
  buildSpawnAction,
  buildUnloadAction,
  createInitialGameInteractionState,
  gameInteractionReducer,
  getSelectableUnit,
  getTargetType,
  getTargetedCellIndexes,
} from "./gameInteraction";
import { buildGamePanelState } from "./gamePanelState";

const sameCoords = (a: Coords | null, b: Coords) =>
  Boolean(a && a.x === b.x && a.y === b.y);

const GameMap = ({
  active = false,
  availableFunds,
  mapData,
  onPanelStateChange,
  perspective,
}: ActiveMapProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<dim>({ width: 100, height: 100 });
  const [lastInspectedCoords, setLastInspectedCoords] = useState<Coords | null>(null);
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
    setLastInspectedCoords(null);
  }, [mapData]);

  useEffect(() => {
    const panelState = buildGamePanelState({
      active,
      interactionState,
      lastInspectedCoords,
      mapData,
    });

    onPanelStateChange?.(panelState);
  }, [active, interactionState, lastInspectedCoords, mapData, onPanelStateChange]);

  const handleCellClick = (mapItem: MapItem, position: MenuPosition) => {
    if (!active || !interactionState.selectedUnit) {
      setLastInspectedCoords({ x: mapItem.row, y: mapItem.column });
    }

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
      (interactionState.pendingAction === "missile" ||
        interactionState.pendingAction === "nuke") &&
      interactionState.availableAttackTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_OBJECT_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "construct" &&
      interactionState.availableConstructTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_CONSTRUCT_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "boost" &&
      interactionState.availableBoostTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_BOOST_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "heal" &&
      interactionState.availableHealTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_HEAL_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "load" &&
      interactionState.availableLoadTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_LOAD_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "spawn" &&
      interactionState.availableSpawnTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_SPAWN_TARGET", cell: mapItem, position });
      return;
    }

    if (
      interactionState.pendingAction === "unload" &&
      interactionState.availableUnloadTargets.includes(mapItem.index)
    ) {
      dispatch({ type: "SELECT_UNLOAD_TARGET", cell: mapItem, position });
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

    if (!interactionState.selectedUnit) {
      return;
    }

    setLastInspectedCoords(null);
    dispatch({ type: "CANCEL_FLOW" });
  };

  const handleMenuAction = (action: GameMenuActionId) => {
    if (action === "cancel") {
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "chooseAttack") {
      dispatch({ type: "CHOOSE_ATTACK_MODE", map: mapData, perspective });
      return;
    }

    if (action === "chooseBoost") {
      dispatch({ type: "CHOOSE_BOOST_MODE", map: mapData, perspective });
      return;
    }

    if (action === "chooseHeal") {
      dispatch({ type: "CHOOSE_HEAL_MODE", map: mapData, perspective });
      return;
    }

    if (action === "chooseConstruct") {
      dispatch({
        type: "CHOOSE_CONSTRUCT_MODE",
        availableFunds,
        map: mapData,
        position: interactionState.menu?.position ?? { left: 0, top: 0 },
      });
      return;
    }

    if (action === "chooseLoad") {
      dispatch({ type: "CHOOSE_LOAD_MODE", map: mapData, perspective });
      return;
    }

    if (action === "chooseUnload") {
      dispatch({ type: "CHOOSE_UNLOAD_MODE", map: mapData });
      return;
    }

    if (action.startsWith("construct:")) {
      dispatch({
        type: "CHOOSE_CONSTRUCT_BUILDING",
        building: action.replace("construct:", "") as BuildingType,
        map: mapData,
      });
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
      if (!interactionState.previewDestination) {
        dispatch({ type: "CHOOSE_MOVE_MODE", map: mapData });
        return;
      }

      const moveAction = buildMoveAction(interactionState);

      if (!moveAction || moveAction.action !== "move") {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      setMap(moveMapUnit(mapData, moveAction.start, moveAction.end));
      sendMove(moveAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmAttack") {
      const attackAction = buildAttackAction(interactionState);

      if (!attackAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(attackAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmBoost") {
      const boostAction = buildBoostAction(interactionState);

      if (!boostAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(boostAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmHeal") {
      const healAction = buildHealAction(interactionState);

      if (!healAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(healAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmMissileLaunch" || action === "confirmNukeLaunch") {
      const moveAction = buildMoveAction(interactionState);

      if (!moveAction || moveAction.action !== "move" || !moveAction.objectTarget) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(moveAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmLoad") {
      const loadAction = buildLoadAction(interactionState);

      if (!loadAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(loadAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmConstruct") {
      const constructAction = buildConstructAction(interactionState);

      if (!constructAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(constructAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmSpawn") {
      const spawnAction = buildSpawnAction(interactionState);

      if (!spawnAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(spawnAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
    }

    if (action === "confirmUnload") {
      const unloadAction = buildUnloadAction(interactionState);

      if (!unloadAction) {
        setLastInspectedCoords(null);
        dispatch({ type: "CANCEL_FLOW" });
        return;
      }

      sendMove(unloadAction, user, pin);
      setLastInspectedCoords(null);
      dispatch({ type: "CANCEL_FLOW" });
      return;
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
