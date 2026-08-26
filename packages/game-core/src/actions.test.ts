import { describe, expect, it } from "vitest";

import { ActionRegistryBuilder, type ActionHandler } from "./actions";

type CounterAction =
  | Readonly<{ type: "add"; amount: number }>
  | Readonly<{ type: "subtract"; amount: number }>;
type CounterEvent = Readonly<{ type: "changed"; amount: number }>;

const addHandler: ActionHandler<number, string, Extract<CounterAction, { type: "add" }>, CounterEvent, undefined> = {
  type: "add",
  validate: (_context, action) => action.amount > 0
    ? []
    : [{ code: "invalid-amount", message: "amount must be positive" }],
  apply: (context, action) => ({
    state: context.state + action.amount,
    events: [{ type: "changed", amount: action.amount }],
  }),
};

describe("ActionRegistry", () => {
  it("dispatches a typed handler and rejects expected validation failures", () => {
    const registry = new ActionRegistryBuilder<number, string, CounterAction, CounterEvent, undefined>()
      .register(addHandler)
      .build();
    const context = { state: 2, actor: "player", services: undefined };

    expect(registry.execute(context, { type: "add", amount: 3 })).toEqual({
      ok: true,
      state: 5,
      events: [{ type: "changed", amount: 3 }],
    });
    expect(registry.execute(context, { type: "add", amount: 0 })).toMatchObject({
      ok: false,
      code: "invalid-action",
      violations: [{ code: "invalid-amount" }],
    });
    expect(registry.validate(context, { type: "add", amount: 3 })).toEqual({ ok: true });
    expect(registry.validate(context, { type: "add", amount: 0 })).toMatchObject({
      ok: false,
      code: "invalid-action",
      violations: [{ code: "invalid-amount" }],
    });
  });

  it("reports missing handlers and rejects duplicate discriminants at construction", () => {
    const builder = new ActionRegistryBuilder<number, string, CounterAction, CounterEvent, undefined>()
      .register(addHandler);
    expect(builder.build().execute(
      { state: 2, actor: "player", services: undefined },
      { type: "subtract", amount: 1 },
    )).toMatchObject({ ok: false, code: "unsupported-action" });
    expect(builder.build().validate(
      { state: 2, actor: "player", services: undefined },
      { type: "subtract", amount: 1 },
    )).toMatchObject({ ok: false, code: "unsupported-action" });
    expect(() => builder.register(addHandler)).toThrow("Duplicate action handler: add");
  });
});
