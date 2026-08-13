import type {
  ActionEnvelope,
  DomainEvent,
  GameAction,
  GameSnapshot,
  PersistedGamePayload,
  TeamOption,
} from "@TBS/common";
import {
  applyGameAction,
  ContractValidationError,
  CURRENT_GAME_PROTOCOL_VERSION,
  parseActionEnvelope,
  parseGameSnapshot,
} from "@TBS/common";
import {
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
} from "@TBS/game-rules";

import type { GatewayError } from "../contracts";

export type PinnedGameVersions = Readonly<{
  protocolVersion: number;
  rulesetVersion: string;
  contentVersion: string;
}>;

export type TrustedCommitProposal = Readonly<{
  gameId: string;
  callerId: string;
  actionId: string;
  protocolVersion: typeof CURRENT_GAME_PROTOCOL_VERSION;
  rulesetVersion: string;
  contentVersion: string;
  expectedRevision: number;
  actorTeam: TeamOption;
  action: GameAction;
  events: readonly DomainEvent[];
  gameplayPayload: PersistedGamePayload;
  status: GameSnapshot["state"]["status"];
  activeTeam: TeamOption | null;
  winnerTeam: TeamOption | null;
  snapshot: GameSnapshot;
}>;

export type TrustedActionEvaluation =
  | Readonly<{ ok: true; proposal: TrustedCommitProposal }>
  | Readonly<{ ok: false; error: GatewayError }>;

const reject = (
  code: GatewayError["code"],
  message: string,
  retryable = false,
): TrustedActionEvaluation => ({
  ok: false,
  error: { code, message, retryable },
});

const parseIntentEnvelope = (value: unknown): ActionEnvelope => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractValidationError("envelope", "expected an object");
  }
  const keys = Object.keys(value);
  const allowed = new Set(["protocolVersion", "actionId", "expectedRevision", "action"]);
  const unexpected = keys.find((key) => !allowed.has(key));
  if (unexpected) {
    throw new ContractValidationError(
      `envelope.${unexpected}`,
      "trusted submission accepts intent fields only",
    );
  }
  return parseActionEnvelope(value);
};

const actorFor = (snapshot: GameSnapshot, callerId: string): TeamOption | undefined => {
  if (snapshot.players.orange?.memberId === callerId) return "orange";
  if (snapshot.players.purple?.memberId === callerId) return "purple";
  return undefined;
};

export const evaluateTrustedAction = (input: Readonly<{
  snapshot: unknown;
  callerId: string;
  versions: PinnedGameVersions;
  envelope: unknown;
}>): TrustedActionEvaluation => {
  let snapshot: GameSnapshot;
  let envelope: ActionEnvelope;
  try {
    snapshot = parseGameSnapshot(input.snapshot);
    envelope = parseIntentEnvelope(input.envelope);
  } catch (error) {
    return reject(
      "incompatible-data",
      error instanceof Error ? error.message : "Invalid trusted action input",
    );
  }

  if (
    input.versions.protocolVersion !== CURRENT_GAME_PROTOCOL_VERSION
    || input.versions.rulesetVersion !== STANDARD_RULESET_VERSION
    || input.versions.contentVersion !== STANDARD_CONTENT_VERSION
  ) {
    return reject(
      "incompatible-data",
      "The game is pinned to an unsupported engine version",
    );
  }
  if (snapshot.state.revision !== envelope.expectedRevision) {
    return reject(
      "stale-revision",
      "expected revision does not match canonical state",
      true,
    );
  }

  const actorTeam = actorFor(snapshot, input.callerId);
  if (!actorTeam) {
    return reject("spectator-read-only", "spectators cannot submit actions");
  }

  const result = applyGameAction(snapshot.state, actorTeam, envelope.action);
  if (!result.ok) {
    return reject(
      result.code === "wrong-team" ? "wrong-team" : "invalid-action",
      result.message,
    );
  }

  const nextSnapshot: GameSnapshot = { ...snapshot, state: result.state };
  return {
    ok: true,
    proposal: {
      gameId: snapshot.gameId,
      callerId: input.callerId,
      actionId: envelope.actionId,
      protocolVersion: envelope.protocolVersion,
      rulesetVersion: input.versions.rulesetVersion,
      contentVersion: input.versions.contentVersion,
      expectedRevision: envelope.expectedRevision,
      actorTeam,
      action: envelope.action,
      events: result.events,
      gameplayPayload: {
        map: result.state.map,
        money: result.state.money,
      },
      status: result.state.status,
      activeTeam: result.state.activeTeam ?? null,
      winnerTeam: result.state.winner ?? null,
      snapshot: nextSnapshot,
    },
  };
};
