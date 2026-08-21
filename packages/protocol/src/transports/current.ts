import {
  rulesetVersion,
  teamId,
  type GameState,
  type RulesetVersion,
  type TeamId,
} from "@TBS/game-core";
import { z } from "zod";

import { actionEnvelopeSchema, CURRENT_PROTOCOL_VERSION } from "../envelopes/action";
import { actionId, type ActionId } from "../ids";
import { parseProtocolValue } from "../validation";

const identifierSchema = z.string().trim().min(1).max(128);
const revisionSchema = z.number().int().nonnegative();

export const MAX_ACTION_BYTES = 16_384;
export const MAX_EVENT_BYTES = 65_536;
export const MAX_SNAPSHOT_STATE_BYTES = 1_048_576;

const assertSerializedSize = (value: unknown, maximumBytes: number): unknown => {
  const serialized = JSON.stringify(value);
  if (serialized === undefined || new TextEncoder().encode(serialized).byteLength > maximumBytes) {
    throw new Error(`serialized value exceeds ${maximumBytes} bytes`);
  }
  return value;
};

export const playerSeatSchema = z.object({
  memberId: identifierSchema,
  displayName: z.string().trim().min(1).max(80),
}).strict().readonly();

export type PlayerSeat = z.infer<typeof playerSeatSchema>;

export const gameSnapshotSchema = z.object({
  gameId: identifierSchema,
  players: z.record(identifierSchema, playerSeatSchema),
  spectatorCount: z.number().int().nonnegative(),
  state: z.unknown(),
}).strict();

export const appliedActionSchema = z.object({
  protocolVersion: z.literal(CURRENT_PROTOCOL_VERSION),
  actionId: z.string().uuid(),
  revision: z.number().int().positive(),
  actorTeamId: identifierSchema,
  action: z.unknown(),
  events: z.array(z.unknown()).readonly(),
}).strict();

export const membershipSchema = z.object({
  gameId: identifierSchema,
  memberId: identifierSchema,
  displayName: z.string().trim().min(1).max(80),
  role: z.union([identifierSchema, z.literal("spectator")]),
}).strict().readonly();

export type MembershipDocument = z.infer<typeof membershipSchema>;

export const revisionNoticeSchema = z.object({
  gameId: identifierSchema,
  revision: revisionSchema,
  actionId: z.string().uuid(),
}).strict().readonly();

export type RevisionNoticeDocument = z.infer<typeof revisionNoticeSchema>;

export const protocolErrorSchema = z.object({
  code: identifierSchema,
  message: z.string().min(1).max(1_000),
  retryable: z.boolean(),
}).strict().readonly();

export type ProtocolErrorDocument = z.infer<typeof protocolErrorSchema>;

export type ActionEnvelope<Action> = Readonly<{
  protocolVersion: typeof CURRENT_PROTOCOL_VERSION;
  actionId: ActionId;
  expectedRevision: number;
  rulesetVersion: RulesetVersion;
  action: Action;
}>;

export type AppliedAction<Action, Event> = Readonly<{
  protocolVersion: typeof CURRENT_PROTOCOL_VERSION;
  actionId: ActionId;
  revision: number;
  actorTeamId: TeamId;
  action: Action;
  events: readonly Event[];
}>;

export type GameSnapshot<State = GameState> = Readonly<{
  gameId: string;
  players: Readonly<Partial<Record<TeamId, PlayerSeat>>>;
  spectatorCount: number;
  state: State;
}>;

export type Membership = Readonly<{
  gameId: string;
  memberId: string;
  displayName: string;
  role: TeamId | "spectator";
}>;

export type RevisionNotice = Readonly<{
  gameId: string;
  revision: number;
  actionId: ActionId;
}>;

export type CurrentProtocolParsers<State, Action, Event> = Readonly<{
  parseState: (value: unknown) => State;
  parseAction: (value: unknown) => Action;
  parseEvent: (value: unknown) => Event;
}>;

export type CurrentProtocolCodec<State, Action, Event> = Readonly<{
  parseActionEnvelope: (value: unknown) => ActionEnvelope<Action>;
  parseAppliedAction: (value: unknown) => AppliedAction<Action, Event>;
  parseGameSnapshot: (value: unknown) => GameSnapshot<State>;
  parseMembership: (value: unknown) => Membership;
  parseRevisionNotice: (value: unknown) => RevisionNotice;
  parseError: (value: unknown) => ProtocolErrorDocument;
}>;

export const createCurrentProtocolCodec = <State, Action, Event>(
  parsers: CurrentProtocolParsers<State, Action, Event>,
): CurrentProtocolCodec<State, Action, Event> => ({
  parseActionEnvelope: (value) => {
    const document = parseProtocolValue("envelope", actionEnvelopeSchema.parse, value);
    parseProtocolValue("envelope.action", (action) => assertSerializedSize(action, MAX_ACTION_BYTES), document.action);
    return {
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: actionId(document.actionId),
      expectedRevision: document.expectedRevision,
      rulesetVersion: rulesetVersion(document.rulesetVersion),
      action: parseProtocolValue("envelope.action", parsers.parseAction, document.action),
    };
  },
  parseAppliedAction: (value) => {
    const document = parseProtocolValue("appliedAction", appliedActionSchema.parse, value);
    parseProtocolValue("appliedAction.action", (action) => assertSerializedSize(action, MAX_ACTION_BYTES), document.action);
    for (const [index, event] of document.events.entries()) {
      parseProtocolValue(
        `appliedAction.events.${index}`,
        (candidate) => assertSerializedSize(candidate, MAX_EVENT_BYTES),
        event,
      );
    }
    return {
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: actionId(document.actionId),
      revision: document.revision,
      actorTeamId: teamId(document.actorTeamId),
      action: parseProtocolValue("appliedAction.action", parsers.parseAction, document.action),
      events: document.events.map((event, index) =>
        parseProtocolValue(`appliedAction.events.${index}`, parsers.parseEvent, event)),
    };
  },
  parseGameSnapshot: (value) => {
    const document = parseProtocolValue("snapshot", gameSnapshotSchema.parse, value);
    parseProtocolValue(
      "snapshot.state",
      (state) => assertSerializedSize(state, MAX_SNAPSHOT_STATE_BYTES),
      document.state,
    );
    return {
      gameId: document.gameId,
      players: Object.fromEntries(Object.entries(document.players).map(([id, seat]) => [teamId(id), seat])),
      spectatorCount: document.spectatorCount,
      state: parseProtocolValue("snapshot.state", parsers.parseState, document.state),
    };
  },
  parseMembership: (value) => {
    const document = parseProtocolValue("membership", membershipSchema.parse, value);
    return {
      ...document,
      role: document.role === "spectator" ? document.role : teamId(document.role),
    };
  },
  parseRevisionNotice: (value) => {
    const document = parseProtocolValue("revisionNotice", revisionNoticeSchema.parse, value);
    return { ...document, actionId: actionId(document.actionId) };
  },
  parseError: (value) => parseProtocolValue("error", protocolErrorSchema.parse, value),
});
