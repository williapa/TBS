import { MapItem, TeamOption, startingMoney } from "@TBS/common";
import TableName from "../tableName.js";
import ddbDocClient from "../docClient.js";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const STARTING_MONEY = startingMoney;

export const persistJoinGame = async (gameId: string, email: string): Promise<void> => {
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
            UpdateExpression: "REMOVE open_timestamp SET people = people + :p, started_timestamp = :st, challenger = :c, challengerMoney = :cm, activeTurn = :c",
            ConditionExpression: "people <= :limit",
            ExpressionAttributeValues: {
              ":c": email,
              ":cm": STARTING_MONEY,
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