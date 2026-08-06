import {
  BatchWriteCommand,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/lib-dynamodb';
import ddbDocClient from './docClient.js';
import TableName from './tableName.js';
import { winConditions } from '@TBS/common';
import {
  TEST_GAME_ID,
  TEST_GAME_NAME,
  TEST_USERS,
} from './testResources.js';

const BATCH_SIZE = 25;

type Key = { id: string; sk: string };

function createDefaultStartingMap() {
  const rowLengths = [3, 4, 5, 4, 3];
  let nextIndex = 0;
  const indexGrid = rowLengths.map((length) =>
    Array.from({ length }, () => nextIndex++),
  );

  const mapData = indexGrid.map((row, rowIndex) =>
    row.map((index, column) => {
      const neighbors: number[] = [];
      const addAdjacentRow = (neighborRow: number[], add: boolean) => {
        for (const offset of [row.length, neighborRow.length]) {
          const candidate = add ? index + offset : index - offset;
          if (neighborRow.includes(candidate)) neighbors.push(candidate);
        }
      };

      if (rowIndex > 0) addAdjacentRow(indexGrid[rowIndex - 1], false);
      if (row.includes(index - 1)) neighbors.push(index - 1);
      if (row.includes(index + 1)) neighbors.push(index + 1);
      if (rowIndex < indexGrid.length - 1) {
        addAdjacentRow(indexGrid[rowIndex + 1], true);
      }

      const isCreator = index === 0;
      const isChallenger = index === nextIndex - 1;
      return {
        row: rowIndex,
        column,
        index,
        neighbors,
        terrain: 'plains',
        unit: isCreator || isChallenger ? 'soldier' : 'none',
        team: isCreator ? 'orange' : isChallenger ? 'purple' : 'gray',
      };
    }),
  );

  return {
    mapName: 'agent-test-map',
    mapData,
    winCondition: winConditions.ELIMINATION_ONLY,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function findStartingMap() {
  const requestedMapName = process.env.TEST_MAP_NAME;
  if (!requestedMapName) return createDefaultStartingMap();
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result: ScanCommandOutput = await ddbDocClient.send(
      new ScanCommand({
        TableName,
        IndexName: 'MapIndex',
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    const maps = result.Items ?? [];
    const selectedMap = maps.find((map) => map.mapName === requestedMapName);

    if (selectedMap) return selectedMap;
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  throw new Error(
    `No saved map named "${requestedMapName}" was found.`,
  );
}

async function findExistingGameKeys(): Promise<Key[]> {
  const gameKey = `game#${TEST_GAME_ID}`;
  const keys: Key[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await ddbDocClient.send(
      new ScanCommand({
        TableName,
        ExclusiveStartKey: exclusiveStartKey,
        ProjectionExpression: '#id, #sk',
        FilterExpression: '#id = :game OR #sk = :game',
        ExpressionAttributeNames: { '#id': 'id', '#sk': 'sk' },
        ExpressionAttributeValues: { ':game': gameKey },
      }),
    );

    for (const item of result.Items ?? []) {
      if (typeof item.id === 'string' && typeof item.sk === 'string') {
        keys.push({ id: item.id, sk: item.sk });
      }
    }
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return keys;
}

async function batchWrite(requests: Record<string, unknown>[]) {
  let requestItems = { [TableName]: requests };

  do {
    const result = await ddbDocClient.send(
      new BatchWriteCommand({ RequestItems: requestItems }),
    );
    requestItems = (result.UnprocessedItems ?? {}) as typeof requestItems;
  } while ((requestItems[TableName]?.length ?? 0) > 0);
}

async function main() {
  const startingMap = await findStartingMap();
  const existingKeys = await findExistingGameKeys();

  for (const keys of chunk(existingKeys, BATCH_SIZE)) {
    await batchWrite(
      keys.map((key) => ({ DeleteRequest: { Key: key } })),
    );
  }

  const [creator, challenger] = TEST_USERS;
  const startedTimestamp = Date.now().toString();
  const gamePartition = `game#${TEST_GAME_ID}`;
  const gameItems = [
    {
      id: gamePartition,
      sk: `meta#${TEST_GAME_ID}`,
      creator: creator.email,
      creatorMoney: 1000,
      challenger: challenger.email,
      challengerMoney: 1000,
      map: startingMap.mapName,
      mapData: startingMap.mapData,
      name: TEST_GAME_NAME,
      people: 2,
      activeTurn: creator.email,
      started_timestamp: startedTimestamp,
      winCondition: startingMap.winCondition,
    },
    ...TEST_USERS.map((user) => ({
      id: gamePartition,
      sk: `user#${user.email}`,
      game_id: TEST_GAME_ID,
      email: user.email,
    })),
  ];

  await batchWrite(
    gameItems.map((Item) => ({ PutRequest: { Item } })),
  );

  console.log(`Created or reset game "${TEST_GAME_ID}" with map "${startingMap.mapName}".`);
  console.log(`Game URL: http://localhost:3000/game/${TEST_GAME_ID}`);
  for (const user of TEST_USERS) {
    console.log(
      `${user.email}: localStorage.setItem('user', '${JSON.stringify({ user: user.email, pin: user.pin })}')`,
    );
  }
}

main().catch((err) => {
  console.error('Failed to create or update the test game:', err);
  process.exit(1);
});
