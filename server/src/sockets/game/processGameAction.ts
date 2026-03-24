import {
  attackUnit,
  checkForDead,
  GameAction,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  getIncomeForTeam,
  getTeamForPlayer,
  getWinningTeam,
  isTurnOver,
  MapItem,
  moveableOptions,
  moveMapUnit,
  TeamOption,
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

const supportedActions = ["attack", "end", "move"];

type UpdateGameParams = {
  email: string;
  gameId: string;
  gameAction: GameAction;
  pin: string;
};

type ProcessResult =
  | {
      ok: true;
      gameEvents: any[];
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
        "not a valid action. valid actions are - 'move', 'end', 'attack'.",
    };
  }

  const activeTeam =
    gameItem.activeTurn === gameItem.challenger ? "purple" : "orange";
  let gameEvents: any[] = [];
  let Map = (gameItem.mapData as MapItem[][]) ?? [];
  let creatorMoney = Number(gameItem.creatorMoney);
  let challengerMoney = Number(gameItem.challengerMoney);

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

  const turnIsOver = !gameOver && isTurnOver(activeTeam, Map, gameAction.action);
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
        return rest as MapItem;
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