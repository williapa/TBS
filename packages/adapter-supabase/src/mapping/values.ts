import type { SessionRole, SubmitActionResult } from "@TBS/application";
import {
  ContractValidationError,
  parseAppliedAction,
  parseGameSnapshot,
} from "@TBS/common";

import { parseGatewayError } from "./errors";

export type UnknownRecord = Record<string, unknown>;

export const record = (value: unknown, path: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractValidationError(path, "expected an object");
  }
  return value as UnknownRecord;
};

export const rows = (value: unknown, path: string): UnknownRecord[] => {
  if (!Array.isArray(value)) throw new ContractValidationError(path, "expected an array");
  return value.map((row, index) => record(row, `${path}[${index}]`));
};

export const nonEmptyString = (value: unknown, path: string) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new ContractValidationError(path, "expected a non-empty string");
  }
  return value;
};

export const nonNegativeInteger = (value: unknown, path: string) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractValidationError(path, "expected a non-negative integer");
  }
  return value;
};

export const sessionRole = (value: unknown, path: string): SessionRole => {
  if (value !== "orange" && value !== "purple" && value !== "spectator") {
    throw new ContractValidationError(path, "expected orange, purple, or spectator");
  }
  return value;
};

export const firstRow = (value: unknown, path: string) => {
  const parsed = rows(value, path);
  if (parsed.length !== 1) throw new ContractValidationError(path, "expected exactly one row");
  return parsed[0];
};

export const snapshotFromRow = (row: UnknownRecord) => {
  const payload = record(row.gameplay_payload, "snapshot.gameplayPayload");
  return parseGameSnapshot({
    gameId: row.game_id,
    players: row.players,
    spectatorCount: row.spectator_count,
    state: {
      ...payload,
      schemaVersion: row.schema_version,
      revision: row.revision,
      status: row.status,
      activeTeam: row.active_team === null ? undefined : row.active_team,
      winner: row.winner_team === null ? undefined : row.winner_team,
      winCondition: row.win_condition,
    },
  });
};

export const parseSubmitActionResult = (value: unknown): SubmitActionResult => {
  const result = record(value, "submitAction.result");
  if (result.ok === true) {
    return {
      ok: true,
      appliedAction: parseAppliedAction(result.appliedAction),
      snapshot: parseGameSnapshot(result.snapshot),
    };
  }
  if (result.ok === false) {
    return {
      ok: false,
      error: parseGatewayError(result.error, "submitAction.result.error"),
      ...(result.snapshot === undefined
        ? {}
        : { snapshot: parseGameSnapshot(result.snapshot) }),
    };
  }
  throw new ContractValidationError("submitAction.result.ok", "expected a boolean");
};
