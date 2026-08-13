import { describe, expect, it } from "vitest";

import { buildMechanicPipeline, type MechanicHook } from "./mechanics";

type Hook = MechanicHook<number, string, undefined>;
const hook = (
  id: string,
  phase: Hook["phase"],
  dependencies: Pick<Hook, "after" | "before"> = {},
): Hook => ({
  id,
  phase,
  ...dependencies,
  apply: ({ state, events }) => ({ state: state + 1, events: [...events, id] }),
});

describe("mechanic pipeline construction", () => {
  it("orders named phases and stable explicit dependencies", () => {
    const pipeline = buildMechanicPipeline([
      hook("turn", "evaluateTurnEnd", { after: ["objectives"] }),
      hook("audit", "afterAction"),
      hook("objectives", "evaluateObjectives"),
    ]);
    expect(pipeline.hookIds).toEqual(["audit", "objectives", "turn"]);
    expect(pipeline.run(0, undefined)).toEqual({ state: 3, events: ["audit", "objectives", "turn"] });
  });

  it("rejects duplicate IDs, missing dependencies, and cycles during construction", () => {
    expect(() => buildMechanicPipeline([hook("same", "afterAction"), hook("same", "afterAction")]))
      .toThrow("Duplicate mechanic hook");
    expect(() => buildMechanicPipeline([hook("one", "afterAction", { after: ["missing"] })]))
      .toThrow("Missing mechanic dependency");
    expect(() => buildMechanicPipeline([
      hook("one", "afterAction", { after: ["two"] }),
      hook("two", "afterAction", { after: ["one"] }),
    ])).toThrow("Mechanic hook cycle");
  });
});
