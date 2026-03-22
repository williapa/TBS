import { Server, Socket } from "socket.io";
import ddbDocClient from "../data/docClient.js";
import TableName from "../data/tableName.js";
import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  attackUnit,
  Coords,
  getAllCellsWhichCanBeReached,
  getAttackableCells,
  GameAction,
  getWinningTeam,
  isTurnOver,
  MapItem,
  moveableOptions,
  moveMapUnit,
  TeamOption,
  WinCondition,
  winConditions,
} from "@TBS/common";

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
      turnIsOver: boolean;
      newActiveTurn: string | undefined;
      winner: TeamOption | undefined;
      winnerEmail: string | undefined;
      loserEmail: string | undefined;
    }
  | { ok: false; error: string };

const checkForDead = (
  map: MapItem[][],
  attackerEndPosition: Coords,
  defenderEndPosition: Coords
) => {
  const attackerDied =
    map[attackerEndPosition.x][attackerEndPosition.y].unit === "none";
  const defenderDied =
    map[defenderEndPosition.x][defenderEndPosition.y].unit === "none";
  return [attackerDied, defenderDied];
};

/**
 * Validates the game action, applies it to the map, and builds the list of game events.
 * Does not persist to DynamoDB; caller is responsible for that and for broadcasting.
 */
const processGameAction = async (
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

  if (!gameOver && isTurnOver(activeTeam, Map, gameAction.action)) {
    gameEvents.push({
      id: `${gameId}#${Date.now().toString()}#endTurn`,
      sk: `game#${gameId}`,
      action: "endTurn",
      actor: email,
    });
  }

  const turnIsOver = !gameOver && isTurnOver(activeTeam, Map, gameAction.action);
  let mapForDb: MapItem[][] = Map;
  if (turnIsOver) {
    mapForDb = Map.map((row: MapItem[]) =>
      row.map((item: MapItem) => {
        const { moved, ...rest } = item;
        return rest as MapItem;
      })
    );
  }

  const newActiveTurn = turnIsOver
    ? gameItem.activeTurn === gameItem.challenger
      ? gameItem.creator
      : gameItem.challenger
    : undefined;

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
    gameEvents,
    map: mapForDb,
    turnIsOver,
    newActiveTurn,
    winner,
    winnerEmail,
    loserEmail,
  };
};

/**
 * Persists game events and updated map to DynamoDB and returns the events for broadcasting.
 */
const persistGameUpdate = async (
  gameId: string,
  gameEvents: any[],
  map: MapItem[][],
  turnIsOver: boolean,
  newActiveTurn: string | undefined,
  winner: TeamOption | undefined,
  winnerEmail: string | undefined,
  loserEmail: string | undefined
): Promise<void> => {
  const TransactItems: any[] = gameEvents.map((gameEvent: any) => ({
    Put: {
      TableName,
      Item: gameEvent,
    },
  }));

  let UpdateExpression = "SET mapData = :m";
  const ExpressionAttributeValues: any = { ":m": map };

  if (turnIsOver && newActiveTurn !== undefined) {
    UpdateExpression += ", activeTurn = :a";
    ExpressionAttributeValues[":a"] = newActiveTurn;
  }

  if (winner) {
    UpdateExpression += ", winner = :w, ended_timestamp = :et";
    ExpressionAttributeValues[":w"] = winner;
    ExpressionAttributeValues[":et"] = Date.now().toString();
  }

  TransactItems.push({
    Update: {
      TableName,
      Key: {
        id: `game#${gameId}`,
        sk: `meta#${gameId}`,
      },
      UpdateExpression,
      ExpressionAttributeValues,
    },
  });

  if (winner && winnerEmail && loserEmail) {
    TransactItems.push({
      Update: {
        TableName,
        Key: {
          id: `user#${winnerEmail}`,
          sk: `meta#${winnerEmail}`,
        },
        UpdateExpression: "SET wins = if_not_exists(wins, :zero) + :one",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
        },
      },
    });

    TransactItems.push({
      Update: {
        TableName,
        Key: {
          id: `user#${loserEmail}`,
          sk: `meta#${loserEmail}`,
        },
        UpdateExpression: "SET losses = if_not_exists(losses, :zero) + :one",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
        },
      },
    });
  }

  await ddbDocClient.send(
    new TransactWriteCommand({
      TransactItems,
    })
  );
};

const persistJoinGame = async (gameId: string, email: string): Promise<void> => {
  await ddbDocClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName,
            Item: {
              id: `game#${gameId}`,
              sk: `user#${email}`,
              game_id: gameId,
              email: email
            },
            ConditionExpression: "attribute_not_exists(sk)",
            ReturnValuesOnConditionCheckFailure: "ALL_OLD"
          }
        },
        {
          Update: {
            TableName,
            Key: {
              id: `game#${gameId}`, 
              sk: `meta#${gameId}`,
            },
            UpdateExpression: "REMOVE open_timestamp SET people = people + :p, started_timestamp = :st, challenger = :c, activeTurn = :c",
            ConditionExpression: "people <= :limit",
            ExpressionAttributeValues: {
              ":c": email,
              ":p": 1,
              ":st": Date.now().toString(),
              ":limit": 2,
            },
            ReturnValuesOnConditionCheckFailure: "ALL_OLD"
          }
        } 
      ]
    })
  );
};


export const registerGameSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`player connected: ${socket.id}`);

    socket.on("joinGame", async ({ gameId }: { gameId: string }) => {
      socket.join(gameId);
      console.log("the client is listening to the game room now.");
    });

    socket.on("joinPlayer", async ({ gameId, playerId }: { gameId: string, playerId: string }) => {
      await persistJoinGame(gameId, playerId);
        console.log(`player ${playerId} joined game ${gameId}`);
        io.to(gameId).emit("playerJoined", {
          playerId
          // i don't know why the socket gets returned
          // socketId: socket.id
        });
    });

    /**
     * Game action: validate, apply, save, then broadcast new events to the room.
     * On validation failure, respond only to the sender with gameError.
     */
    socket.on(
      "gameAction",
      async (payload: {
        gameId: string;
        gameAction: GameAction;
        email: string;
        pin: string;
      }) => {
        const { gameId, gameAction, email, pin } = payload;

        if (!gameId || !gameAction || !email || !pin) {
          socket.emit("gameError", { error: "invalid payload" });
          return;
        }

        const result = await processGameAction({
          email,
          gameId,
          gameAction,
          pin,
        });

        if (!result.ok) {
          socket.emit("gameError", { error: result.error });
          return;
        }

        const { gameEvents, map, turnIsOver, newActiveTurn, winner, winnerEmail, loserEmail } = result as {
          ok: true;
          gameEvents: any[];
          map: MapItem[][];
          turnIsOver: boolean;
          newActiveTurn: string | undefined;
          winner: TeamOption | undefined;
          winnerEmail: string | undefined;
          loserEmail: string | undefined;
        };
        console.log('checking game events: ');
        console.log(gameEvents);
        try {
          await persistGameUpdate(
            gameId,
            gameEvents,
            map,
            turnIsOver,
            newActiveTurn,
            winner,
            winnerEmail,
            loserEmail
          );
        } catch (err: any) {
          console.error("persistGameUpdate failed:", err);
          socket.emit("gameError", {
            error: `something went wrong: ${err?.message ?? err}`,
          });
          return;
        }
        const whosTurn = winner ? undefined : turnIsOver ? newActiveTurn : email;
        io.to(gameId).emit("gameEvent", {
          events: gameEvents,
          mapData: map,
          activeTurn: whosTurn,
          winner,
        });
      }
    );

    socket.on("disconnect", () => {
      console.log(`player disconnected: ${socket.id}`);
    });
  });
};
