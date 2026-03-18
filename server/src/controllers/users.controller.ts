import { Request, Response } from 'express';
import { GetCommand, PutCommand, QueryCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import ddbDocClient from '../data/docClient.js';
import TableName from '../data/tableName.js';
import { validateUser } from "@TBS/common";

const listGamesByPlayer = async (email: string) => {

  const IndexName = "InvertedIndex";

  const { Items } = await ddbDocClient.send(
    new QueryCommand({
      TableName,
      IndexName,
      KeyConditionExpression: "sk = :sk",
      ExpressionAttributeValues: {
        ":sk": `user#${email}`,
      },
      ScanIndexForward: true
    })
  );

  if (!Items) {
    return [];
  };

  const Keys = Items?.map((item) => ({ id: `game#${item.game_id}`, sk: `meta#${item.game_id}` }));

  if (!Keys || !Keys.length) {
    return [];
  }

  const { Responses } = await ddbDocClient.send(
    new BatchGetCommand({
      RequestItems: {
        [TableName]: { Keys },
      }
    })
  );

  if (!Responses) {
    return [];
  };
  return Responses[TableName];
}

const userExists = async (email: string) => {

  const result = await ddbDocClient.send(
    new GetCommand({
      TableName,
      Key: {
        id: `user#${email}`,
        sk: `meta#${email}`,
      }
    })
  );

  console.log(result);

  if (result.Item) {
    return result.Item;
  }

};

type userData = {
  email: string;
  newUser: boolean;
  pin: string;
};

export const createUser = async (
  req: Request,
  res: Response
) => {
  console.log('create user request body: ');
  console.log(req.body);
  const { email, newUser, pin }: userData = req.body;

  const validationError = validateUser(email, pin, (str: string) => str);

  if (validationError) throw new Error(`${validationError}`);

  const existingUserFound = await userExists(email);

  if (existingUserFound && newUser) throw new Error('user already exists.');

  if (existingUserFound && !newUser && existingUserFound.pin !== pin) {
    throw new Error('failed to login.');
  } 

  if (!existingUserFound && !newUser) {
    throw new Error('cannot log in a new user');
  } 

  if (existingUserFound && !newUser && existingUserFound.pin === pin) {
    console.log("Logged in successfully");
    res.json({ success: "it worked!" });
  } else {
    // valid new user: create a user record
    console.log('Creating new user');
    await ddbDocClient.send(
      new PutCommand({
        TableName,
        Item: {
          id: `user#${email}`,
          sk: `meta#${email}`,
          pin,
          wins: 0,
          losses: 0
        }
      })
    );

    res.json({ success: 'it worked!' });

  }
}


export const getUserProfile = async (
  req: Request,
  res: Response
) => {
  const email = req.params.email;
  const user = await userExists(email as string);
  if (user) {
    delete user.pin;
    delete user.sk;
    delete user.id;
    const games = await listGamesByPlayer(email as string);
    res.json({ games, player: user });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
};

