import { Request, Response } from 'express';
import ddbDocClient from '../data/docClient.js';
import { PutCommand, PutCommandOutput, ScanCommand } from '@aws-sdk/lib-dynamodb';
import TableName from '../data/tableName.js';

type MapProps = {
  name: string;
  map: any;
}

export const createMap = async (req: Request, res: Response) => { 
  const { name, map }: MapProps = req.body;

  await ddbDocClient.send(
    new PutCommand({
      TableName,
      Item: {
        id: `map#${name}`,
        sk: `meta#${name}`,
        mapData: map,
        mapName: name,
      }
    })
  );
  // this might be wrong? what if there's an error creating?
  res.status(201).json({ });
}

export const listMaps = async (req: Request, res: Response) => { 
  const IndexName = "MapIndex";

  const { Items } = await ddbDocClient.send(
    new ScanCommand({
      TableName,
      IndexName
    })
  );
  // this seems too easy, but grok said errors will get returned as such by express, so I'm leaving it.
  res.json(Items);
};
