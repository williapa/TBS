import ddbDocClient from './docClient.js';
import {
  ScanCommand,
  ScanCommandOutput,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import TableName from "./tableName.js";

const GAME_PREFIX = 'game';
const BATCH_SIZE = 25;

function chunk(array: Array<any>, size: number) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function scanAllGameKeys() {
  const keys = [];
  const seen = new Set();
  let ExclusiveStartKey;

  do {
    const result: ScanCommandOutput = await ddbDocClient.send(
      new ScanCommand({
        TableName,
        ExclusiveStartKey,
        ProjectionExpression: '#id, #sk',
        FilterExpression: 'begins_with(#sk, :prefix) OR begins_with(#id, :prefix)',
        ExpressionAttributeNames: {
          '#id': 'id',
          '#sk': 'sk',
        },
        ExpressionAttributeValues: {
          ':prefix': GAME_PREFIX,
        },
      })
    );

    for (const item of result.Items ?? []) {
      if (item.id && item.sk) {
        const dedupeKey = `${item.id}|||${item.sk}`;
        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          keys.push({
            id: item.id,
            sk: item.sk,
          });
        }
      }
    }

    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return keys;
}

async function deleteBatch(keys: any) {
  let requestItems = {
    [TableName]: keys.map((key: string) => ({
      DeleteRequest: {
        Key: key,
      },
    })),
  };

  let attempts = 0;

  while (requestItems && Object.keys(requestItems).length > 0) {
    const result = await ddbDocClient.send(
      new BatchWriteCommand({
        RequestItems: requestItems,
      })
    );

    requestItems = result.UnprocessedItems as any;

    if (requestItems && Object.keys(requestItems).length > 0) {
      attempts += 1;
      const delayMs = Math.min(1000 * attempts, 5000);
      const retryCount = requestItems[TableName]?.length ?? 0;

      console.warn(`Retrying ${retryCount} unprocessed deletes in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

async function main() {
  console.log(
    `Scanning "${TableName}" for items where id or sk begins with "${GAME_PREFIX}"...`
  );

  const keys = await scanAllGameKeys();

  if (keys.length === 0) {
    console.log('No matching game-related items found.');
    return;
  }

  console.log(`Found ${keys.length} items to delete.`);

  const batches = chunk(keys, BATCH_SIZE);

  for (let i = 0; i < batches.length; i++) {
    await deleteBatch(batches[i]);
    console.log(`Deleted batch ${i + 1} of ${batches.length}`);
  }

  console.log(`Done. Deleted ${keys.length} items.`);
}

main().catch((err) => {
  console.error('Failed to delete game items:', err);
  process.exit(1);
});
