import { client } from "./dynamoClient.js";
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const ddbDocClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
  }
});

export default ddbDocClient;
