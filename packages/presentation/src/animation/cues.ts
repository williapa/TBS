import type { EntityId, HexCoord } from "@TBS/game-core";
import type { StandardEvent } from "@TBS/game-rules";

import { DEFAULT_MOVE_DURATION_MS, type AnimationCue } from "./contracts";

const samePosition = (left: HexCoord, right: HexCoord): boolean =>
  left.q === right.q && left.r === right.r;

const eventMovement = (
  event: StandardEvent,
): Readonly<{ entityId: EntityId; start: HexCoord; end: HexCoord }> | undefined => {
  switch (event.type) {
    case "unit-moved":
      return { entityId: event.entityId, start: event.start, end: event.end };
    case "unit-boosted":
    case "unit-healed":
    case "unit-constructed":
      return { entityId: event.actorId, start: event.start, end: event.end };
    case "unit-attacked":
      return { entityId: event.attackerId, start: event.start, end: event.end };
    case "unit-loaded":
      return { entityId: event.entityId, start: event.start, end: event.end };
    case "unit-unloaded":
      return { entityId: event.vehicleId, start: event.start, end: event.end };
    default:
      return undefined;
  }
};

export const createAnimationCues = (
  revision: number,
  events: readonly StandardEvent[],
): readonly AnimationCue[] => events.flatMap((event, index): readonly AnimationCue[] => {
  const movement = eventMovement(event);
  if (!movement || samePosition(movement.start, movement.end)) return [];
  return [{
    type: "move-entity",
    id: `${revision}:${index}:${movement.entityId}`,
    revision,
    entityId: movement.entityId,
    from: movement.start,
    to: movement.end,
    durationMs: DEFAULT_MOVE_DURATION_MS,
  }];
});
