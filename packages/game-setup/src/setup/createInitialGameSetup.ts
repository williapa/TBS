import {
  CURRENT_GAME_PROTOCOL_VERSION,
  startingMoney,
  teamOptions,
} from "@TBS/common";
import { entityId } from "@TBS/game-core";
import type {
  MapItem,
  PersistedGamePayload,
  WinCondition,
} from "@TBS/common";
import {
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
} from "@TBS/game-rules";

import { validatePlayableMap } from "../maps/validation";

export type InitialGameSetup = Readonly<{
  protocolVersion: typeof CURRENT_GAME_PROTOCOL_VERSION;
  rulesetVersion: string;
  contentVersion: string;
  initialPayload: PersistedGamePayload;
  winCondition: WinCondition;
}>;

const deriveWinCondition = (map: MapItem[][]): WinCondition => {
  const teamsWithCapitals = new Set(
    map.flat()
      .filter((cell) => cell.unit === "capital" && cell.team !== "gray")
      .map((cell) => cell.team),
  );
  return teamOptions.every((team) => teamsWithCapitals.has(team))
    ? "capital-or-combat-elimination"
    : "combat-elimination";
};

const assignInitialEntityIds = (map: MapItem[][]): MapItem[][] => map.map((row) =>
  row.map((cell) => cell.unit === "none"
    ? { ...cell, entityId: undefined, loadedUnit: undefined }
    : {
        ...cell,
        entityId: entityId(`initial-cell-${cell.index}`),
        ...(cell.loadedUnit
          ? {
              loadedUnit: {
                ...cell.loadedUnit,
                entityId: entityId(`initial-cargo-${cell.index}-0`),
              },
            }
          : {}),
      }),
);

export const createInitialGameSetup = (value: unknown): InitialGameSetup => {
  const map = assignInitialEntityIds(validatePlayableMap(value));
  return {
    protocolVersion: CURRENT_GAME_PROTOCOL_VERSION,
    rulesetVersion: STANDARD_RULESET_VERSION,
    contentVersion: STANDARD_CONTENT_VERSION,
    initialPayload: {
      map,
      money: { orange: startingMoney, purple: startingMoney },
    },
    winCondition: deriveWinCondition(map),
  };
};
