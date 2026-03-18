import { client } from "./dynamoClient.js";
import {
  DynamoDBClient,
  DeleteTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import TableName from "./tableName.js";

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

async function deleteTable() {
  const exists = await tableExists(TableName);

  if (!exists) {
    console.log(`Table "${TableName}" does not exist.`);
    return;
  }

  const command = new DeleteTableCommand({
    TableName
  });

  await client.send(command);

  console.log(`Deleted table "${TableName}".`);
}

deleteTable().catch((err) => {
  console.error('Failed to delete table:', err);
  process.exit(1);
});
