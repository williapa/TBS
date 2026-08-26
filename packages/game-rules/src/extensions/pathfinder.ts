import {
  hexKey,
  type EntityId,
  type GameState,
  type MechanicHook,
} from "@TBS/game-core";

import type { StandardEvent } from "../actions/types";
import { createUnitRegistry, defineUnit, standardUnits } from "../content/units";
import type { StandardMechanicContext } from "../mechanics/standard-pipeline";

export const FOREST_CONCEALMENT_ABILITY = "forest-concealment" as const;

export const pathfinderUnit = defineUnit({
  id: "pathfinder",
  category: "person",
  base: { maximumHealth: 100, movement: 2, attack: 18, defense: 12 },
  capabilities: ["move", "attack", "collect-object", "loadable"],
  abilities: [FOREST_CONCEALMENT_ABILITY],
  tags: ["ground", "living", "person"],
});

export const pathfinderUnits = createUnitRegistry([...standardUnits.values(), pathfinderUnit]);

export type ForestConcealmentEvent = Readonly<{
  type: "forest-concealment-applied";
  entityId: EntityId;
}>;

export type PathfinderEvent = StandardEvent | ForestConcealmentEvent;

export const forestConcealmentHook: MechanicHook<GameState, PathfinderEvent, StandardMechanicContext> = {
  id: "example.forest-concealment",
  phase: "afterAction",
  apply: ({ state, events, context }) => {
    if (context.action.type !== "move") return { state, events };
    const entity = state.entities[context.action.actorId];
    const unit = entity ? context.services.getUnit(entity.unitTypeId) : undefined;
    const cell = entity?.position ? state.board.cells[hexKey(entity.position)] : undefined;
    if (!entity || !unit?.abilities.includes(FOREST_CONCEALMENT_ABILITY) || cell?.terrainTypeId !== "forest") {
      return { state, events };
    }

    const statuses = [
      ...entity.statuses.filter(({ type }) => type !== FOREST_CONCEALMENT_ABILITY),
      { type: FOREST_CONCEALMENT_ABILITY, remainingTurns: 1 },
    ];
    return {
      state: {
        ...state,
        entities: { ...state.entities, [entity.id]: { ...entity, statuses } },
      },
      events: [...events, { type: "forest-concealment-applied", entityId: entity.id }],
    };
  },
};
