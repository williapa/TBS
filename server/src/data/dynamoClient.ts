import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// todo: obviously this is for local only, need some process.env.? variable for dev/prod (stage).
// for prod, region & creds would go here
export const client = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT ?? 'http://localhost:8000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy',
  },
});
