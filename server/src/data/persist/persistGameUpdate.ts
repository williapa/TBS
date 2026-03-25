import { GameEvent, MapItem, TeamOption } from "@TBS/common";
import TableName from "../tableName.js";
import ddbDocClient from "../docClient.js";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
/**
 * Persists game events and updated map to DynamoDB and returns the events for broadcasting.
 */
export const persistGameUpdate = async (
  gameId: string,
  gameEvents: GameEvent[],
  map: MapItem[][],
  creatorMoney: number,
  challengerMoney: number,
  turnIsOver: boolean,
  newActiveTurn: string | undefined,
  winner: TeamOption | undefined,
  winnerEmail: string | undefined,
  loserEmail: string | undefined
): Promise<void> => {
  const TransactItems: any[] = gameEvents.map((gameEvent: GameEvent) => ({
    Put: {
      TableName,
      Item: gameEvent,
    },
  }));

  let UpdateExpression =
    "SET mapData = :m, creatorMoney = :creatorMoney, challengerMoney = :challengerMoney";
  const ExpressionAttributeValues: any = {
    ":m": map,
    ":creatorMoney": creatorMoney,
    ":challengerMoney": challengerMoney,
  };

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
