import {
  CreateTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import { client } from "./dynamoClient.js"
import TableName from './tableName.js';

async function tableExists(tableName: string) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err: any) {
    if (err?.name === 'ResourceNotFoundException') {
      return false;
    }
    throw err;
  }
}

async function createTable() {
  const exists = await tableExists(TableName);

  if (exists) {
    console.log(`Table "${TableName}" already exists.`);
    return;
  }

  const command = new CreateTableCommand({
    TableName,
    BillingMode: 'PAY_PER_REQUEST',
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'sk', AttributeType: 'S' },
      { AttributeName: 'map', AttributeType: 'S' },
      { AttributeName: 'open_timestamp', AttributeType: 'S' },
      { AttributeName: 'mapName', AttributeType: 'S' },
    ],
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' },
      { AttributeName: 'sk', KeyType: 'RANGE' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'OpenGamesIndex',
        KeySchema: [
          { AttributeName: 'map', KeyType: 'HASH' },
          { AttributeName: 'open_timestamp', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
      },
      {
        IndexName: 'MapIndex',
        KeySchema: [
          { AttributeName: 'mapName', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
      },
      {
        IndexName: 'InvertedIndex',
        KeySchema: [
          { AttributeName: 'sk', KeyType: 'HASH' },
          { AttributeName: 'id', KeyType: 'RANGE' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
      },
    ],
  });

  const result = await client.send(command);
  console.log(`Created table "${TableName}".`);
  console.log(JSON.stringify(result, null, 2));
}

createTable().catch((err) => {
  console.error('Failed to create table:', err);
  process.exit(1);
});
