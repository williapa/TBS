import { CURRENT_PROTOCOL_VERSION, STANDARD_RULESET_VERSION } from "@TBS/application";
import { createActiveGameStateFixture } from "@TBS/test-kit";

import { createActionEnvelope } from "./createActionEnvelope";

const identifiers = (...values: readonly string[]) => {
  const remaining = [...values];
  return () => {
    const value = remaining.shift();
    if (!value) throw new Error("test identifier sequence was exhausted");
    return value;
  };
};

describe("createActionEnvelope", () => {
  test("uses current version pins and materializes generated entity IDs at composition", () => {
    const state = createActiveGameStateFixture();
    const actor = Object.values(state.entities)[0];
    if (!actor?.position) throw new Error("active fixture requires a positioned actor");
    const envelope = createActionEnvelope(
      7,
      {
        type: "construct",
        actorId: actor.id,
        destination: actor.position,
        constructionPosition: actor.position,
        buildingUnitTypeId: actor.unitTypeId,
      },
      identifiers(
        "41000000-0000-4000-8000-000000000001",
        "41000000-0000-4000-8000-000000000002",
      ),
    );

    expect(envelope).toEqual({
      protocolVersion: CURRENT_PROTOCOL_VERSION,
      actionId: "41000000-0000-4000-8000-000000000001",
      expectedRevision: 7,
      rulesetVersion: STANDARD_RULESET_VERSION,
      action: {
        type: "construct",
        actorId: actor.id,
        destination: actor.position,
        constructionPosition: actor.position,
        buildingEntityId: "41000000-0000-4000-8000-000000000002",
        buildingUnitTypeId: actor.unitTypeId,
      },
    });
  });
});
