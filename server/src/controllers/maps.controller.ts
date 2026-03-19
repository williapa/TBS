import { Request, Response } from 'express';
import ddbDocClient from '../data/docClient.js';
import { PutCommand, PutCommandOutput, ScanCommand } from '@aws-sdk/lib-dynamodb';
import TableName from '../data/tableName.js';
import {
  checkMapHasCapitals,
  checkMapHasMovableCombatUnits,
  MapItem,
  teamOptions,
  winConditions,
  WinCondition,
} from "@TBS/common";

type MapProps = {
  name: string;
  map: MapItem[][];
}

export const createMap = async (req: Request, res: Response) => { 
  const { name, map }: MapProps = req.body;
  const teamsWithMovableCombatUnits = checkMapHasMovableCombatUnits(map);
  const missingMovableCombatUnitTeams = teamOptions.filter(
    (team) => teamsWithMovableCombatUnits.indexOf(team) < 0
  );

  if (missingMovableCombatUnitTeams.length > 0) {
    return res.status(400).json({
      error:
        "Map must include at least one movable combat unit for both orange and purple teams.",
      missingTeams: missingMovableCombatUnitTeams,
    });
  }

  const teamsWithCapitals = checkMapHasCapitals(map);
  const winCondition: WinCondition =
    teamsWithCapitals.length === 2
      ? winConditions.CAPITAL_OR_ELIMINATION
      : winConditions.ELIMINATION_ONLY;

  await ddbDocClient.send(
    new PutCommand({
      TableName,
      Item: {
        id: `map#${name}`,
        sk: `meta#${name}`,
        mapData: map,
        mapName: name,
        winCondition,
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
