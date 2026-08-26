import type {
  SessionRole,
  StandardProtocolCodec,
  SubmitActionResult,
} from "@TBS/application";
import { ProtocolValidationError } from "@TBS/protocol";

import { parseGatewayError } from "./errors";

export type UnknownRecord = Record<string, unknown>;

const validationError = (path: string, message: string): ProtocolValidationError =>
  new ProtocolValidationError([{ path, message }]);

export const record = (value: unknown, path: string): UnknownRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw validationError(path, "expected an object");
  }
  return value as UnknownRecord;
};

export const rows = (value: unknown, path: string): UnknownRecord[] => {
  if (!Array.isArray(value)) throw validationError(path, "expected an array");
  return value.map((row, index) => record(row, `${path}[${index}]`));
};

export const nonEmptyString = (value: unknown, path: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw validationError(path, "expected a non-empty string");
  }
  return value;
};

export const nonNegativeInteger = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw validationError(path, "expected a non-negative integer");
  }
  return value;
};

export const sessionRole = (
  codec: StandardProtocolCodec,
  value: unknown,
  path: string,
): SessionRole => codec.parseMembership({
  gameId: "role-validation",
  memberId: "role-validation",
  displayName: "Role validation",
  role: nonEmptyString(value, path),
}).role;

export const firstRow = (value: unknown, path: string): UnknownRecord => {
  const parsed = rows(value, path);
  if (parsed.length !== 1) throw validationError(path, "expected exactly one row");
  const row = parsed[0];
  if (!row) throw validationError(path, "expected exactly one row");
  return row;
};

export const snapshotFromRow = (
  codec: StandardProtocolCodec,
  row: UnknownRecord,
) => codec.parseGameSnapshot({
  gameId: row.game_id,
  players: row.players,
  spectatorCount: row.spectator_count,
  state: row.state,
});

export const parseSubmitActionResult = (
  codec: StandardProtocolCodec,
  value: unknown,
): SubmitActionResult => {
  const result = record(value, "submitAction.result");
  if (result.ok === true) {
    return {
      ok: true,
      appliedAction: codec.parseAppliedAction(result.appliedAction),
      snapshot: codec.parseGameSnapshot(result.snapshot),
    };
  }
  if (result.ok === false) {
    return {
      ok: false,
      error: parseGatewayError(result.error, "submitAction.result.error"),
      ...(result.snapshot === undefined
        ? {}
        : { snapshot: codec.parseGameSnapshot(result.snapshot) }),
    };
  }
  throw validationError("submitAction.result.ok", "expected a boolean");
};
