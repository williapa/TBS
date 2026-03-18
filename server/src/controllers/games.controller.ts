import { Request, Response } from 'express';
import ddbDocClient from "../data/docClient.js";
import TableName from "../data/tableName.js";
import { 
  BatchWriteCommand,
  BatchWriteCommandOutput,
  GetCommand,
  ScanCommand,
  ScanCommandOutput,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

type joinGameParams = {
  gameId: string;
  email: string;
};

type MapItem = {
  terrain: any;
  unit: any;
  team: any;
}

type GameConfiguration = {
  challenger?: string;
  email: string;
  name: string;
  map: string;
  mapData: MapItem[][];
};

export const createGame = async (req: Request, res: Response) => { 
  const { email, map, mapData, name }: GameConfiguration = req.body;
  const open_timestamp = Date.now().toString();
  const uuid = uuidv4();

  const response: BatchWriteCommandOutput = await ddbDocClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [TableName]: [
          {
            PutRequest: {
              Item: {
                id: `game#${uuid}`,
                sk: `meta#${uuid}`,
                creator: email,
                map,
                mapData,
                name,
                open_timestamp,
                people: 1,
                activeTurn: ""
              }
            }
          },
          {
            PutRequest: {
              Item: {
                id: `game#${uuid}`,
                sk: `user#${email}`,
                game_id: uuid,
                email: email
              },
            }
          }
        ],
      }
    })
  );

  console.log("document client put user result: ");
  console.log(response);
  // this used to be "data" as the json but I don't see that as part of the response object
  res.status(201).json({ message: 'success, waiting for opponent to join' });
};

export const getGameById = async (req: Request, res: Response) => {
  const id = req.params.id;

  const gameResult = await ddbDocClient.send(
    new GetCommand({
      TableName,
      Key: {
        id: `game#${id}`,
        sk: `meta#${id}`,
      }
    })
  );

  if (!gameResult.Item) {
    res.status(404).json({ error: `error: game ${id} not found.` });
  }
  
  res.json(gameResult.Item);
}

export const joinGame = async (req: Request, res: Response) => {
  const { gameId, email }: joinGameParams = req.body;
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
  res.status(200).json({ message: 'joined game - time to tap into that sweet, sweet websocket!' });
};

export const listGameEvents = async (req: Request, res: Response) => {
  // this limit is because there's a 1mb limit - that means we need to do pagination :( 
  // really, I guess it's fine to have visibility only for the most recent 100
  const pageSize = 100;
  const gameId = req.params.id;

  try {
    const { Items } = await ddbDocClient.send(
      new QueryCommand({
        TableName,
        IndexName: "InvertedIndex",
        KeyConditionExpression: '#gameId = :gameId AND #eventTimestamp <= :now',
        ExpressionAttributeNames: {
          '#gameId': 'sk',
          '#eventTimestamp': 'id'
        },
        ExpressionAttributeValues: {
          ':gameId': `game#${gameId}`,
          ':now': `${gameId}#${Date.now().toString()}`
        },
        ScanIndexForward: false, // sort in descending order by timestamp
        Limit: pageSize // retrieve only the specified number of events - see above
      })
    );

    res.json({ Items });

  } catch (error: any) {
    console.log(`Error querying game events: ${error}`);
    res.status(404).json({ error: `An error occurred trying to query the reverse index for game id ${gameId}` });
  }
};

export const listGames = async (req: Request, res: Response) => {
  const IndexName = "OpenGamesIndex";

  const response: ScanCommandOutput = await ddbDocClient.send(
    new ScanCommand({
      TableName,
      IndexName
    })
  );

  res.json(response && response.Items ? response.Items : []);
};
