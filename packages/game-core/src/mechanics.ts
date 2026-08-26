export const mechanicPhases = [
  "beforeAction",
  "validateAction",
  "applyAction",
  "afterAction",
  "evaluateObjectives",
  "evaluateTurnEnd",
  "startNextTurn",
  "finalize",
] as const;

export type MechanicPhase = (typeof mechanicPhases)[number];

export type MechanicResult<State, Event> = Readonly<{
  state: State;
  events: readonly Event[];
}>;

export interface MechanicHook<State, Event, Context> {
  readonly id: string;
  readonly phase: MechanicPhase;
  readonly after?: readonly string[];
  readonly before?: readonly string[];
  apply(input: Readonly<{ state: State; events: readonly Event[]; context: Context }>): MechanicResult<State, Event>;
}

const insertByRegistrationOrder = (queue: string[], id: string, order: ReadonlyMap<string, number>) => {
  const index = queue.findIndex((candidate) => (order.get(candidate) ?? 0) > (order.get(id) ?? 0));
  if (index < 0) queue.push(id);
  else queue.splice(index, 0, id);
};

export class MechanicPipeline<State, Event, Context> {
  readonly #hooks: readonly MechanicHook<State, Event, Context>[];

  constructor(hooks: readonly MechanicHook<State, Event, Context>[]) {
    this.#hooks = hooks;
  }

  get hookIds(): readonly string[] {
    return this.#hooks.map(({ id }) => id);
  }

  run(state: State, context: Context, events: readonly Event[] = []): MechanicResult<State, Event> {
    return this.#hooks.reduce<MechanicResult<State, Event>>(
      (result, hook) => hook.apply({ ...result, context }),
      { state, events },
    );
  }
}

export const buildMechanicPipeline = <State, Event, Context>(
  hooks: readonly MechanicHook<State, Event, Context>[],
): MechanicPipeline<State, Event, Context> => {
  const byId = new Map<string, MechanicHook<State, Event, Context>>();
  const registrationOrder = new Map<string, number>();
  for (const [index, hook] of hooks.entries()) {
    if (byId.has(hook.id)) throw new Error(`Duplicate mechanic hook: ${hook.id}`);
    byId.set(hook.id, hook);
    registrationOrder.set(hook.id, index);
  }

  const outgoing = new Map<string, Set<string>>([...byId.keys()].map((id) => [id, new Set()]));
  const incomingCount = new Map<string, number>([...byId.keys()].map((id) => [id, 0]));
  const addEdge = (beforeId: string, afterId: string) => {
    if (!byId.has(beforeId)) throw new Error(`Missing mechanic dependency: ${beforeId}`);
    if (!byId.has(afterId)) throw new Error(`Missing mechanic dependency: ${afterId}`);
    const edges = outgoing.get(beforeId);
    if (!edges || edges.has(afterId)) return;
    edges.add(afterId);
    incomingCount.set(afterId, (incomingCount.get(afterId) ?? 0) + 1);
  };

  for (const hook of hooks) {
    for (const dependency of hook.after ?? []) addEdge(dependency, hook.id);
    for (const dependency of hook.before ?? []) addEdge(hook.id, dependency);
  }
  for (const before of hooks) {
    const beforePhase = mechanicPhases.indexOf(before.phase);
    for (const after of hooks) {
      if (beforePhase < mechanicPhases.indexOf(after.phase)) addEdge(before.id, after.id);
    }
  }

  const queue: string[] = [];
  for (const [id, count] of incomingCount) {
    if (count === 0) insertByRegistrationOrder(queue, id, registrationOrder);
  }
  const ordered: MechanicHook<State, Event, Context>[] = [];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) break;
    const hook = byId.get(id);
    if (!hook) throw new Error(`Missing mechanic hook during ordering: ${id}`);
    ordered.push(hook);
    for (const dependent of outgoing.get(id) ?? []) {
      const count = (incomingCount.get(dependent) ?? 0) - 1;
      incomingCount.set(dependent, count);
      if (count === 0) insertByRegistrationOrder(queue, dependent, registrationOrder);
    }
  }
  if (ordered.length !== hooks.length) {
    const cycle = [...byId.keys()].filter((id) => !ordered.some((hook) => hook.id === id));
    throw new Error(`Mechanic hook cycle: ${cycle.join(", ")}`);
  }
  return new MechanicPipeline(ordered);
};
