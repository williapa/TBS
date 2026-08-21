import type { GameState, TeamId } from "@TBS/game-core";
import {
  applyStandardAction,
  parseStandardAction,
  parseStandardEvent,
  STANDARD_CONTENT_VERSION,
  STANDARD_RULESET_VERSION,
  type StandardAction,
  type StandardActionResult,
  type StandardEvent,
} from "@TBS/game-rules";
import {
  createCurrentProtocolCodec,
  CURRENT_PROTOCOL_VERSION,
  parseNormalizedGameState,
  type ActionId,
  type CurrentProtocolCodec,
} from "@TBS/protocol";

import type {
  GatewayError,
  StandardActionEnvelope,
  StandardGameSnapshot,
} from "../contracts";

export type PinnedGameVersions = Readonly<{
  protocolVersion: number;
  rulesetVersion: string;
  contentVersion: string;
}>;

export type TrustedCommitProposal = Readonly<{
  gameId: string;
  callerId: string;
  actionId: ActionId;
  protocolVersion: typeof CURRENT_PROTOCOL_VERSION;
  rulesetVersion: string;
  contentVersion: string;
  expectedRevision: number;
  actorTeamId: TeamId;
  action: StandardAction;
  events: readonly StandardEvent[];
  state: GameState;
  snapshot: StandardGameSnapshot;
}>;

export type TrustedActionEvaluation =
  | Readonly<{ ok: true; proposal: TrustedCommitProposal }>
  | Readonly<{ ok: false; error: GatewayError }>;

export type TrustedActionDependencies = Readonly<{
  codec: CurrentProtocolCodec<GameState, StandardAction, StandardEvent>;
  applyAction: (
    state: GameState,
    actorTeamId: TeamId,
    action: StandardAction,
  ) => StandardActionResult;
}>;

export const currentStandardProtocolCodec = createCurrentProtocolCodec({
  parseState: parseNormalizedGameState,
  parseAction: parseStandardAction,
  parseEvent: parseStandardEvent,
});

const defaultDependencies: TrustedActionDependencies = {
  codec: currentStandardProtocolCodec,
  applyAction: applyStandardAction,
};

const reject = (
  code: GatewayError["code"],
  message: string,
  retryable = false,
): TrustedActionEvaluation => ({
  ok: false,
  error: { code, message, retryable },
});

const actorFor = (
  snapshot: StandardGameSnapshot,
  callerId: string,
): TeamId | undefined => Object.values(snapshot.state.teams)
  .find(({ id }) => snapshot.players[id]?.memberId === callerId)?.id;

const rejectionMessage = (result: Extract<StandardActionResult, { ok: false }>): string =>
  result.violations.map(({ message }) => message).join("; ") || "The action is invalid";

export const evaluateTrustedAction = (
  input: Readonly<{
    snapshot: unknown;
    callerId: string;
    versions: PinnedGameVersions;
    envelope: unknown;
  }>,
  dependencies: TrustedActionDependencies = defaultDependencies,
): TrustedActionEvaluation => {
  let snapshot: StandardGameSnapshot;
  let envelope: StandardActionEnvelope;
  try {
    snapshot = dependencies.codec.parseGameSnapshot(input.snapshot);
    envelope = dependencies.codec.parseActionEnvelope(input.envelope);
  } catch (error) {
    return reject(
      "incompatible-data",
      error instanceof Error ? error.message : "Invalid trusted action input",
    );
  }

  if (
    input.versions.protocolVersion !== CURRENT_PROTOCOL_VERSION
    || input.versions.rulesetVersion !== STANDARD_RULESET_VERSION
    || input.versions.contentVersion !== STANDARD_CONTENT_VERSION
    || envelope.rulesetVersion !== STANDARD_RULESET_VERSION
    || snapshot.state.rulesetVersion !== STANDARD_RULESET_VERSION
    || snapshot.state.contentVersion !== STANDARD_CONTENT_VERSION
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

  const actorTeamId = actorFor(snapshot, input.callerId);
  if (!actorTeamId) {
    return reject("spectator-read-only", "spectators cannot submit actions");
  }

  const result = dependencies.applyAction(snapshot.state, actorTeamId, envelope.action);
  if (!result.ok) {
    const wrongTeam = result.violations.some(({ code }) => code === "wrong-team");
    return reject(
      wrongTeam ? "wrong-team" : "invalid-action",
      rejectionMessage(result),
    );
  }

  const nextSnapshot: StandardGameSnapshot = { ...snapshot, state: result.state };
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
      actorTeamId,
      action: envelope.action,
      events: result.events,
      state: result.state,
      snapshot: nextSnapshot,
    },
  };
};
