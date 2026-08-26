import { teamId, terrainTypeId, unitTypeId } from "@TBS/game-core";

import { CURRENT_MAP_SCHEMA_VERSION } from "../contracts";
import type { MapDocument, MapGrid } from "../contracts";

const defaultMap = (): MapGrid => [[
  {
    row: 0,
    column: 0,
    index: 0,
    neighbors: [1],
    terrain: terrainTypeId("plains"),
    unit: unitTypeId("soldier"),
    team: teamId("orange"),
  },
  {
    row: 0,
    column: 1,
    index: 1,
    neighbors: [0],
    terrain: terrainTypeId("plains"),
    unit: unitTypeId("soldier"),
    team: teamId("purple"),
  },
]];

export const createDefaultBattlefield = (): MapDocument => ({
  schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
  name: "Default battlefield",
  map: defaultMap(),
});
