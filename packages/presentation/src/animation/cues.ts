import type { DomainEvent, GameState, MapItem } from "@TBS/common";
import { entityId, legacyOffsetToAxial } from "@TBS/game-core";
import type { EntityId } from "@TBS/game-core";

import { DEFAULT_MOVE_DURATION_MS } from "./contracts";
import type { AnimationCue } from "./contracts";

const samePosition = (
  left: Readonly<{ x: number; y: number }>,
  right: Readonly<{ x: number; y: number }>,
) => left.x === right.x && left.y === right.y;

const eventMovement = (event: DomainEvent) => {
  switch (event.type) {
    case "move":
    case "attack":
    case "boost":
    case "heal":
    case "unload":
      return { start: event.start, end: event.end };
    default:
      return undefined;
  }
};

const entityAt = (state: GameState, coords: Readonly<{ x: number; y: number }>): EntityId | undefined => {
  const cell = state.map[coords.x]?.[coords.y];
  if (!cell || cell.unit === "none") return undefined;
  return cell.entityId ?? entityId(`legacy-cell-${cell.index}`);
};

const fallbackEntityAtEnd = (
  state: GameState,
  event: DomainEvent,
  end: Readonly<{ x: number; y: number }>,
): EntityId | undefined => {
  const visible = entityAt(state, end);
  if (visible) return visible;
  if (event.type !== "unload") return undefined;
  return entityAt(state, event.end);
};

export const createAnimationCues = (
  state: GameState,
  events: readonly DomainEvent[],
): readonly AnimationCue[] => {
  const width = state.map[0]?.length;
  if (!width) return [];
  return events.flatMap((event, index): readonly AnimationCue[] => {
    const movement = eventMovement(event);
    if (!movement || samePosition(movement.start, movement.end)) return [];
    const movingEntityId = fallbackEntityAtEnd(state, event, movement.end);
    if (!movingEntityId) return [];
    return [{
      type: "move-entity",
      id: `${state.revision}:${index}:${movingEntityId}`,
      revision: state.revision,
      entityId: movingEntityId,
      from: legacyOffsetToAxial(movement.start.x, movement.start.y, width),
      to: legacyOffsetToAxial(movement.end.x, movement.end.y, width),
      durationMs: DEFAULT_MOVE_DURATION_MS,
    }];
  });
};

export const entityIdForMapItem = (cell: MapItem): EntityId | undefined =>
  cell.unit === "none" ? undefined : cell.entityId ?? entityId(`legacy-cell-${cell.index}`);
