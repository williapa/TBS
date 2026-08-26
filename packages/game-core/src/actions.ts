export type CoreAction = Readonly<{ type: string }>;

export type RuleViolation = Readonly<{
  code: string;
  message: string;
}>;

export type RuleContext<State, Actor, Services> = Readonly<{
  state: State;
  actor: Actor;
  services: Services;
}>;

export type ActionResult<State, Event> = Readonly<{
  state: State;
  events: readonly Event[];
}>;

export interface ActionHandler<
  State,
  Actor,
  Action extends CoreAction,
  Event,
  Services,
> {
  readonly type: Action["type"];
  validate(context: RuleContext<State, Actor, Services>, action: Action): readonly RuleViolation[];
  apply(context: RuleContext<State, Actor, Services>, action: Action): ActionResult<State, Event>;
}

export type RegistryExecutionResult<State, Event> =
  | Readonly<{ ok: true; state: State; events: readonly Event[] }>
  | Readonly<{ ok: false; code: "unsupported-action"; violations: readonly RuleViolation[] }>
  | Readonly<{ ok: false; code: "invalid-action"; violations: readonly RuleViolation[] }>;

export type RegistryValidationResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; code: "unsupported-action" | "invalid-action"; violations: readonly RuleViolation[] }>;

type Executor<State, Actor, Action extends CoreAction, Event, Services> = (
  context: RuleContext<State, Actor, Services>,
  action: Action,
) => RegistryExecutionResult<State, Event>;

type Validator<State, Actor, Action extends CoreAction, Services> = (
  context: RuleContext<State, Actor, Services>,
  action: Action,
) => RegistryValidationResult;

const matchesActionType = <Action extends CoreAction, Type extends Action["type"]>(
  action: Action,
  type: Type,
): action is Extract<Action, { type: Type }> => action.type === type;

export class ActionRegistry<
  State,
  Actor,
  Action extends CoreAction,
  Event,
  Services,
> {
  readonly #executors: ReadonlyMap<string, Executor<State, Actor, Action, Event, Services>>;
  readonly #validators: ReadonlyMap<string, Validator<State, Actor, Action, Services>>;

  constructor(
    executors: ReadonlyMap<string, Executor<State, Actor, Action, Event, Services>>,
    validators: ReadonlyMap<string, Validator<State, Actor, Action, Services>>,
  ) {
    this.#executors = new Map(executors);
    this.#validators = new Map(validators);
  }

  get actionTypes(): readonly Action["type"][] {
    return [...this.#executors.keys()] as Action["type"][];
  }

  execute(
    context: RuleContext<State, Actor, Services>,
    action: Action,
  ): RegistryExecutionResult<State, Event> {
    const executor = this.#executors.get(action.type);
    if (!executor) {
      return {
        ok: false,
        code: "unsupported-action",
        violations: [{ code: "unsupported-action", message: `No handler is registered for ${action.type}` }],
      };
    }
    return executor(context, action);
  }

  validate(
    context: RuleContext<State, Actor, Services>,
    action: Action,
  ): RegistryValidationResult {
    const validator = this.#validators.get(action.type);
    if (!validator) {
      return {
        ok: false,
        code: "unsupported-action",
        violations: [{ code: "unsupported-action", message: `No handler is registered for ${action.type}` }],
      };
    }
    return validator(context, action);
  }
}

export class ActionRegistryBuilder<
  State,
  Actor,
  Action extends CoreAction,
  Event,
  Services,
> {
  readonly #executors = new Map<string, Executor<State, Actor, Action, Event, Services>>();
  readonly #validators = new Map<string, Validator<State, Actor, Action, Services>>();

  register<Type extends Action["type"]>(
    handler: ActionHandler<State, Actor, Extract<Action, { type: Type }>, Event, Services>,
  ): this {
    if (this.#executors.has(handler.type)) {
      throw new Error(`Duplicate action handler: ${handler.type}`);
    }

    const executor: Executor<State, Actor, Action, Event, Services> = (context, action) => {
      if (!matchesActionType(action, handler.type)) {
        throw new Error(`Action registry dispatched ${action.type} to ${handler.type}`);
      }
      const violations = handler.validate(context, action);
      if (violations.length > 0) return { ok: false, code: "invalid-action", violations };
      return { ok: true, ...handler.apply(context, action) };
    };
    const validator: Validator<State, Actor, Action, Services> = (context, action) => {
      if (!matchesActionType(action, handler.type)) {
        throw new Error(`Action registry dispatched ${action.type} to ${handler.type}`);
      }
      const violations = handler.validate(context, action);
      return violations.length > 0
        ? { ok: false, code: "invalid-action", violations }
        : { ok: true };
    };
    this.#executors.set(handler.type, executor);
    this.#validators.set(handler.type, validator);
    return this;
  }

  build(): ActionRegistry<State, Actor, Action, Event, Services> {
    return new ActionRegistry(this.#executors, this.#validators);
  }
}
