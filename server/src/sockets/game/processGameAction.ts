import {
  attackUnit,
  buildingUnitOptions,
  checkForDead,
  getConstructionOptions,
  getConstructableCells,
  GameAction,
  GameEvent,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  getIncomeForTeam,
  peopleUnitOptions,
  getSpawnableCells,
  getSpawnOptions,
  getTeamForPlayer,
  getWinningTeam,
  isTurnOver,
  MapItem,
  moveableOptions,
  moveMapUnit,
  supportedActions,
  TeamOption,
  vehicleUnitOptions,
  WinCondition,
  winConditions
} from "@TBS/common";
import ddbDocClient from "../../data/docClient.js";
import TableName from "../../data/tableName.js";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
/**
 * Validates the game action, applies it to the map, and builds the list of game events.
 * Does not persist to DynamoDB; caller is responsible for that and for broadcasting.
 */

type UpdateGameParams = {
  email: string;
  gameId: string;
  gameAction: GameAction;
  pin: string;
};

type ProcessResult =
  | {
      ok: true;
      gameEvents: GameEvent[];
      map: MapItem[][];
      creatorMoney: number;
      challengerMoney: number;
      turnIsOver: boolean;
      newActiveTurn: string | undefined;
      winner: TeamOption | undefined;
      winnerEmail: string | undefined;
      loserEmail: string | undefined;
    }
  | { ok: false; error: string };

const sameCoords = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  a.x === b.x && a.y === b.y;

const isAdjacent = (origin: MapItem, target: MapItem) =>
  (origin.neighbors ?? []).indexOf(target.index) > -1;

const clearUnitFromCell = (cell: MapItem): MapItem => ({
  ...cell,
  damage: undefined,
  loadedUnit: undefined,
  moved: undefined,
  team: "gray",
  unit: "none",
});
  
export const processGameAction = async (
  params: UpdateGameParams
): Promise<ProcessResult> => {
  const { email, gameAction, gameId, pin } = params;
  console.log("checking process game action's received action: ");
  console.log(gameAction);

  if (!email || !gameAction || !gameId || !pin) {
    return { ok: false, error: "invalid" };
  }

  // 1) Validate: game exists and it's the user's turn
  const gameResult = await ddbDocClient.send(
    new GetCommand({
      TableName,
      Key: {
        id: `game#${gameId}`,
        sk: `meta#${gameId}`,
      },
    })
  );

  const gameItem = gameResult.Item;
  if (!gameItem) return { ok: false, error: "no game found" };
  if (gameItem.winner) return { ok: false, error: "game already ended" };
  if (gameItem.activeTurn !== email)
    return { ok: false, error: "not your turn idiot" };

  // Validate user (pin check via DB)
  const userResult = await ddbDocClient.send(
    new GetCommand({
      TableName,
      Key: {
        id: `user#${email}`,
        sk: `meta#${email}`,
      },
    })
  );

  if (!userResult.Item || userResult.Item.pin !== pin) {
    return { ok: false, error: "invalid user" };
  }

  // Validate action type
  if (supportedActions.indexOf(gameAction.action) < 0) {
    return {
      ok: false,
      error:
        "not a valid action. valid actions are - 'move', 'end', 'attack', 'spawn', 'construct', 'load', 'unload'.",
    };
  }

  const activeTeam =
    gameItem.activeTurn === gameItem.challenger ? "purple" : "orange";
  let gameEvents: GameEvent[] = [];
  let Map = (gameItem.mapData as MapItem[][]) ?? [];
  let creatorMoney = Number(gameItem.creatorMoney);
  let challengerMoney = Number(gameItem.challengerMoney);
  const getActiveMoney = () => activeTeam === "orange" ? creatorMoney : challengerMoney;

  if (gameAction.action === "end") {
    // No map change; may still add endTurn below
  } else if (
    gameAction.action === "move" ||
    gameAction.action === "attack"
  ) {
    const { x: startX, y: startY } =
      gameAction.action === "move"
        ? gameAction.start
        : gameAction.attacker;
    const { x: endX, y: endY } = gameAction.end;

    const movingUnit = Map[startX][startY];
    const movingUnitType = movingUnit.unit;

    if (movingUnit.team !== activeTeam)
      return { ok: false, error: "that isn't your piece" };
    if (moveableOptions.indexOf(movingUnitType) < 0)
      return { ok: false, error: "that piece isn't movable" };

    const destinationUnit = Map[endX][endY];

    if (
      gameAction.action === "move" &&
      destinationUnit.unit !== "none"
    ) {
      return { ok: false, error: "destination must be an empty space" };
    }

    const reachableCells = getAllCellsWhichCanBeReached(movingUnit.index, Map);

    if (
      gameAction.action === "move" &&
      reachableCells.indexOf(destinationUnit.index) < 0
    ) {
      return { ok: false, error: "destination must be in range" };
    }

    if (gameAction.action === "attack") {
      const defender = Map[gameAction.defender.x][gameAction.defender.y];
      const defendingUnitType = defender.unit;

      if (
        getAttackableCells(movingUnit.team, [destinationUnit.index], Map)
          .indexOf(defender.index) < 0
      ) {
        return {
          ok: false,
          error: "attacker is not in range of defending unit",
        };
      }

      const attackResult = attackUnit(
        Map,
        gameAction.attacker,
        gameAction.end,
        gameAction.defender
      );

      Map = attackResult[0] as MapItem[][];
      const deadGuys = checkForDead(
        Map,
        gameAction.end,
        gameAction.defender
      );

      gameEvents = [
        {
          id: `${gameId}#${Date.now().toString()}`,
          sk: `game#${gameId}`,
          action: "attack",
          actor: email,
          defender: gameAction.defender,
          start: gameAction.attacker,
          end: gameAction.end,
          unit: movingUnitType,
          defendingUnit: defendingUnitType,
          attackDamage: attackResult[1][1],
          defenseDamage: attackResult[1][0],
          deaths: deadGuys,
        },
      ];
    } else {
      Map = moveMapUnit(Map, gameAction.start, gameAction.end);
      gameEvents = [
        {
          id: `${gameId}#${Date.now().toString()}`,
          sk: `game#${gameId}`,
          action: "move",
          actor: email,
          start: gameAction.start,
          end: gameAction.end,
          unit: movingUnitType,
        },
      ];
    }
  } else if (gameAction.action === "spawn") {
    const building = Map[gameAction.building.x]?.[gameAction.building.y];
    const destination = Map[gameAction.end.x]?.[gameAction.end.y];

    if (!building || !destination) {
      return { ok: false, error: "invalid spawn coordinates" };
    }

    if (building.team !== activeTeam) {
      return { ok: false, error: "that isn't your building" };
    }

    if (building.moved) {
      return { ok: false, error: "that building has already acted" };
    }

    if (buildingUnitOptions.indexOf(building.unit) < 0) {
      return { ok: false, error: "that piece cannot spawn units" };
    }

    const spawnOption = getSpawnOptions(building.unit, getActiveMoney())
      .find((option) => option.unit === gameAction.unit);

    if (!spawnOption) {
      return { ok: false, error: "that unit cannot be spawned by this building" };
    }

    const validSpawnCells = getSpawnableCells(Map, gameAction.building, gameAction.unit);

    if (validSpawnCells.indexOf(destination.index) < 0) {
      return { ok: false, error: "spawn destination must be adjacent, empty, and valid terrain" };
    }

    Map[gameAction.building.x][gameAction.building.y] = {
      ...building,
      moved: true,
    };

    Map[gameAction.end.x][gameAction.end.y] = {
      ...destination,
      damage: undefined,
      moved: true,
      team: activeTeam,
      unit: gameAction.unit,
    };

    if (activeTeam === "orange") {
      creatorMoney -= spawnOption.cost;
    } else {
      challengerMoney -= spawnOption.cost;
    }

    gameEvents = [
      {
        id: `${gameId}#${Date.now().toString()}`,
        sk: `game#${gameId}`,
        action: "spawn",
        actor: email,
        building: gameAction.building,
        cost: spawnOption.cost,
        end: gameAction.end,
        unit: gameAction.unit,
      },
    ];
  } else if (gameAction.action === "construct") {
    const worker = Map[gameAction.worker.x]?.[gameAction.worker.y];
    const workerDestination = Map[gameAction.end.x]?.[gameAction.end.y];
    const activeMoney = getActiveMoney();

    if (!worker || !workerDestination) {
      return { ok: false, error: "invalid construction coordinates" };
    }

    if (worker.team !== activeTeam) {
      return { ok: false, error: "that isn't your piece" };
    }

    if (worker.moved) {
      return { ok: false, error: "that worker has already acted" };
    }

    if (worker.unit !== "constructionWorker") {
      return { ok: false, error: "that piece cannot construct buildings" };
    }

    const constructionOption = getConstructionOptions(activeMoney)
      .find((option) => option.building === gameAction.building);

    if (!constructionOption) {
      return { ok: false, error: "that building cannot be constructed with current funds" };
    }

    const workerMoved =
      gameAction.worker.x !== gameAction.end.x ||
      gameAction.worker.y !== gameAction.end.y;

    let mapForConstruction = Map;

    if (workerMoved) {
      if (workerDestination.unit !== "none") {
        return { ok: false, error: "worker destination must be an empty space" };
      }

      const reachableCells = getAllCellsWhichCanBeReached(worker.index, Map);

      if (reachableCells.indexOf(workerDestination.index) < 0) {
        return { ok: false, error: "worker destination must be in range" };
      }

      mapForConstruction = moveMapUnit(
        Map.map((row) => row.map((item) => ({ ...item }))),
        gameAction.worker,
        gameAction.end
      );
    }

    const constructionCell = mapForConstruction[gameAction.cell.x]?.[gameAction.cell.y];

    if (!constructionCell) {
      return { ok: false, error: "invalid construction cell" };
    }

    const validConstructionCells = getConstructableCells(
      mapForConstruction,
      gameAction.end,
      gameAction.building
    );

    if (validConstructionCells.indexOf(constructionCell.index) < 0) {
      return { ok: false, error: "construction cell must be adjacent, empty, and valid terrain" };
    }

    Map = mapForConstruction;
    Map[gameAction.end.x][gameAction.end.y] = {
      ...Map[gameAction.end.x][gameAction.end.y],
      moved: true,
    };
    Map[gameAction.cell.x][gameAction.cell.y] = {
      ...constructionCell,
      damage: undefined,
      moved: true,
      team: activeTeam,
      unit: gameAction.building,
    };

    if (activeTeam === "orange") {
      creatorMoney -= constructionOption.cost;
    } else {
      challengerMoney -= constructionOption.cost;
    }

    gameEvents = [
      {
        id: `${gameId}#${Date.now().toString()}`,
        sk: `game#${gameId}`,
        action: "construct",
        actor: email,
        building: gameAction.building,
        cell: gameAction.cell,
        cost: constructionOption.cost,
        worker: gameAction.end,
      },
    ];
  } else if (gameAction.action === "load") {
    const loadingUnit = Map[gameAction.start.x]?.[gameAction.start.y];
    const destination = Map[gameAction.end.x]?.[gameAction.end.y];
    const vehicle = Map[gameAction.vehicle.x]?.[gameAction.vehicle.y];

    if (!loadingUnit || !destination || !vehicle) {
      return { ok: false, error: "invalid load coordinates" };
    }

    if (loadingUnit.team !== activeTeam) {
      return { ok: false, error: "that isn't your piece" };
    }

    if (loadingUnit.moved) {
      return { ok: false, error: "that piece has already acted" };
    }

    if (peopleUnitOptions.indexOf(loadingUnit.unit) < 0) {
      return { ok: false, error: "only people units can load into vehicles" };
    }

    if (vehicle.team !== activeTeam) {
      return { ok: false, error: "that isn't your vehicle" };
    }

    if (vehicleUnitOptions.indexOf(vehicle.unit) < 0) {
      return { ok: false, error: "load destination must be a vehicle" };
    }

    if (vehicle.loadedUnit) {
      return { ok: false, error: "that vehicle is already carrying a unit" };
    }

    const loadingUnitMoves =
      !sameCoords(gameAction.start, gameAction.end);

    if (loadingUnitMoves) {
      if (destination.unit !== "none") {
        return { ok: false, error: "destination must be an empty space" };
      }

      const reachableCells = getAllCellsWhichCanBeReached(loadingUnit.index, Map);

      if (reachableCells.indexOf(destination.index) < 0) {
        return { ok: false, error: "destination must be in range" };
      }

      Map = moveMapUnit(Map, gameAction.start, gameAction.end);
    }

    const loadingCell = Map[gameAction.end.x]?.[gameAction.end.y];
    const loadingVehicle = Map[gameAction.vehicle.x]?.[gameAction.vehicle.y];

    if (!loadingCell || !loadingVehicle) {
      return { ok: false, error: "invalid load coordinates" };
    }

    if (!isAdjacent(loadingCell, loadingVehicle)) {
      return { ok: false, error: "vehicle must be adjacent to loading unit" };
    }

    if (loadingVehicle.loadedUnit) {
      return { ok: false, error: "that vehicle is already carrying a unit" };
    }

    loadingVehicle.loadedUnit = {
      damage: loadingCell.damage,
      moved: true,
      team: loadingCell.team,
      unit: loadingCell.unit,
    };
    Map[gameAction.end.x][gameAction.end.y] = clearUnitFromCell(loadingCell);

    gameEvents = [
      {
        id: `${gameId}#${Date.now().toString()}`,
        sk: `game#${gameId}`,
        action: "load",
        actor: email,
        end: gameAction.end,
        start: gameAction.start,
        unit: loadingUnit.unit,
        vehicle: gameAction.vehicle,
        vehicleUnit: loadingVehicle.unit,
      },
    ];
  } else if (gameAction.action === "unload") {
    const vehicle = Map[gameAction.start.x]?.[gameAction.start.y];
    const destination = Map[gameAction.end.x]?.[gameAction.end.y];
    const unloadCell = Map[gameAction.cell.x]?.[gameAction.cell.y];

    if (!vehicle || !destination || !unloadCell) {
      return { ok: false, error: "invalid unload coordinates" };
    }

    if (vehicle.team !== activeTeam) {
      return { ok: false, error: "that isn't your piece" };
    }

    if (vehicle.moved) {
      return { ok: false, error: "that vehicle has already acted" };
    }

    if (vehicleUnitOptions.indexOf(vehicle.unit) < 0) {
      return { ok: false, error: "only vehicles can unload units" };
    }

    if (!vehicle.loadedUnit) {
      return { ok: false, error: "that vehicle is not carrying a unit" };
    }

    const vehicleMoves =
      !sameCoords(gameAction.start, gameAction.end);

    if (vehicleMoves) {
      if (destination.unit !== "none") {
        return { ok: false, error: "destination must be an empty space" };
      }

      const reachableCells = getAllCellsWhichCanBeReached(vehicle.index, Map);

      if (reachableCells.indexOf(destination.index) < 0) {
        return { ok: false, error: "destination must be in range" };
      }

      Map = moveMapUnit(Map, gameAction.start, gameAction.end);
    }

    const activeVehicle = Map[gameAction.end.x]?.[gameAction.end.y];
    const activeUnloadCell = Map[gameAction.cell.x]?.[gameAction.cell.y];

    if (!activeVehicle || !activeUnloadCell) {
      return { ok: false, error: "invalid unload coordinates" };
    }

    if (!activeVehicle.loadedUnit) {
      return { ok: false, error: "that vehicle is not carrying a unit" };
    }

    if (!isAdjacent(activeVehicle, activeUnloadCell)) {
      return { ok: false, error: "unload destination must be adjacent to the vehicle" };
    }

    if (activeUnloadCell.unit !== "none") {
      return { ok: false, error: "unload destination must be empty" };
    }

    if (activeUnloadCell.terrain === "water") {
      return { ok: false, error: "cannot unload onto water" };
    }

    const unloadedUnit = activeVehicle.loadedUnit;

    Map[gameAction.cell.x][gameAction.cell.y] = {
      ...activeUnloadCell,
      damage: unloadedUnit.damage,
      moved: unloadedUnit.moved ? true : undefined,
      team: unloadedUnit.team,
      unit: unloadedUnit.unit,
    };
    Map[gameAction.end.x][gameAction.end.y] = {
      ...activeVehicle,
      loadedUnit: undefined,
      moved: true,
    };

    gameEvents = [
      {
        id: `${gameId}#${Date.now().toString()}`,
        sk: `game#${gameId}`,
        action: "unload",
        actor: email,
        cell: gameAction.cell,
        end: gameAction.end,
        start: gameAction.start,
        unit: unloadedUnit.unit,
        vehicleUnit: activeVehicle.unit,
      },
    ];
  }

  const gameWinCondition =
    (gameItem.winCondition as WinCondition) ?? winConditions.ELIMINATION_ONLY;
  const winner = getWinningTeam(Map, gameWinCondition);
  const gameOver = winner !== undefined;

  if (gameOver) {
    gameEvents.push({
      id: `${gameId}#${Date.now().toString()}#gameOver`,
      sk: `game#${gameId}`,
      action: `gameOver`,
      actor: winner === "orange" ? gameItem.creator : gameItem.challenger // actor here is the winner
    });
  }

  const turnIsOver = !gameOver && isTurnOver(activeTeam, Map, gameAction.action, getActiveMoney());
  const newActiveTurn = turnIsOver
    ? gameItem.activeTurn === gameItem.challenger
      ? gameItem.creator
      : gameItem.challenger
    : undefined;

  if (turnIsOver && newActiveTurn) {
    const nextTeam = getTeamForPlayer(newActiveTurn, gameItem.challenger);
    const income = getIncomeForTeam(Map, nextTeam);

    if (nextTeam === "orange") {
      creatorMoney += income;
    } else {
      challengerMoney += income;
    }

    gameEvents.push({
      id: `${gameId}#${Date.now().toString()}#endTurn`,
      sk: `game#${gameId}`,
      action: "endTurn",
      actor: email,
      income,
      creatorMoney,
      challengerMoney,
    });
  }

  let mapForDb: MapItem[][] = Map;
  if (turnIsOver) {
    mapForDb = Map.map((row: MapItem[]) =>
      row.map((item: MapItem) => {
        const { moved, ...rest } = item;

        if (!rest.loadedUnit) {
          return rest as MapItem;
        }

        const { moved: _loadedUnitMoved, ...loadedUnitRest } = rest.loadedUnit;

        return {
          ...rest,
          loadedUnit: loadedUnitRest,
        } as MapItem;
      })
    );
  }

  const winnerEmail =
    winner === "orange"
      ? (gameItem.creator as string | undefined)
      : (gameItem.challenger as string | undefined);
  const loserEmail =
    winner === "orange"
      ? (gameItem.challenger as string | undefined)
      : (gameItem.creator as string | undefined);

  return {
    ok: true,
    challengerMoney,
    creatorMoney,
    gameEvents,
    map: mapForDb,
    turnIsOver,
    newActiveTurn,
    winner,
    winnerEmail,
    loserEmail,
  };
};
