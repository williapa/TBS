import {
  currentStandardProtocolCodec,
  CURRENT_PROTOCOL_VERSION,
  STANDARD_RULESET_VERSION,
  type StandardActionEnvelope,
} from "@TBS/application";
import type { StandardActionDraft } from "@TBS/presentation";

export type CreateIdentifier = () => string;

const browserIdentifier: CreateIdentifier = () => {
  const value = globalThis.crypto?.randomUUID?.();
  if (!value) throw new Error("Secure UUID generation is unavailable");
  return value;
};

const materializeAction = (
  draft: StandardActionDraft,
  createIdentifier: CreateIdentifier,
): unknown => {
  if (draft.type === "construct") {
    return { ...draft, buildingEntityId: createIdentifier() };
  }
  if (draft.type === "spawn") {
    return { ...draft, spawnedEntityId: createIdentifier() };
  }
  return draft;
};

export const createActionEnvelope = (
  expectedRevision: number,
  action: StandardActionDraft,
  createIdentifier: CreateIdentifier = browserIdentifier,
): StandardActionEnvelope => currentStandardProtocolCodec.parseActionEnvelope({
  protocolVersion: CURRENT_PROTOCOL_VERSION,
  actionId: createIdentifier(),
  expectedRevision,
  rulesetVersion: STANDARD_RULESET_VERSION,
  action: materializeAction(action, createIdentifier),
});
