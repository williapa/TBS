import type { MapItem } from "@TBS/common";

import { CURRENT_MAP_SCHEMA_VERSION } from "../contracts";
import type { MapDocument } from "../contracts";

const defaultMap = (): MapItem[][] => [[
  {
    row: 0,
    column: 0,
    index: 0,
    neighbors: [1],
    terrain: "plains",
    unit: "soldier",
    team: "orange",
  },
  {
    row: 0,
    column: 1,
    index: 1,
    neighbors: [0],
    terrain: "plains",
    unit: "soldier",
    team: "purple",
  },
]];

export const createDefaultBattlefield = (): MapDocument => ({
  schemaVersion: CURRENT_MAP_SCHEMA_VERSION,
  name: "Default battlefield",
  map: defaultMap(),
});
