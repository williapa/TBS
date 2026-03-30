# Feature - special combat boost

This document describes a feature, granting a special action to specific unit types. This action will generally follow a pattern where this unit will be able to grant a "boost" to the combat stats of another unit, provided the target unit is adjacent and of a certain type.

## Summary

Like all actions (attack, load, unload), this new "boost" action should be a presented as an option in the action form after a unit has moved (even if the destination for movement is the same position as where it started). The intiail click for a unit should always display the movement targets, and only after confirming the movement target should this new action (in addition to the other established ones) be displayed. Additionally, units should only be able to perform one follow-up action to moving, whether it be a "boost", "load", "unload", etc. - the "boost" action cannot be combined with any additional actions, aside from move. Finally, the "boost" action can only be performed when the unit performing the boost is adjacent to a valid target unit. 

A boosted unit should likely be tracked via a new property on the map unit, which could be as simple as a boolean "boost" that is marked true once boosted. Additional logic will be necessary to apply the boost to combat stats during combat. Boosts are not stackable - a unit is either boosted, or not boosted.

All boosts will add +10 to the boosted unit's default attack AND defense stat, regardless of the unit type granting, or receiving, the boost.

A boost is secondary to a combat "bonus" - the bonus stats should override any boost effects. However, if a unit is in combat against an opponent who will receive a bonus stat enhancement, the unit not receiving the bonus should still be enhanced by a "boost", if it applies.

Finally, a unit which has been boosted should be altered visually, so it is apparent to users that the unit has been boosted. I suggest that the emoji should be colored white to reflect this change.

The units which can perform boosts, and their valid target units, are described below.

## BluesMusician

the bluesMusician has the ability to boost combat stats of any "people" unit, including other bluesMusician units.

## Zookeeper

The zookeeper should be able to boost combat stats of any "animal" unit. 

## Scientist

The scientist should be able to boost combat stats of any "building" unit.

# Special Combat Boost Implementation Plan

## Summary
Implement boost as a new persistent unit state on `MapItem` and `LoadedUnit`, plus a new post-move action that marks one adjacent eligible ally as boosted. Resolve boost inside the existing matchup-aware combat stat pipeline so default stats stay separate from conditional combat logic, and keep special combat bonus precedence above boost exactly as the feature doc requires.

## Key Changes
- Extend shared game types in `common/src/types/index.ts`:
  - Add `"boost"` to `supportedActions`, `GameAction`, and `GameEvent`.
  - Add a `boosted?: boolean` flag to `MapItem` and `LoadedUnit`.
  - Add a `Boost` action shape with source movement coordinates, final unit position, and target coordinates.
  - Add a `BoostEvent` carrying booster unit, boosted unit, and target cell.
- Add shared boost rules/helpers in `common/src`:
  - Create a small helper such as `canUnitBoost(unitType)` and `canReceiveBoost(boosterType, targetType)`.
  - Use the existing category lists (`peopleUnitOptions`, `animalUnitOptions`, `buildingUnitOptions`) to encode:
    - `bluesMusician -> people`
    - `zookeeper -> animal`
    - `scientist -> building`
  - Add a helper to compute adjacent valid boost targets from a map position so both UI and server share the same targeting rule.
- Update combat stat resolution in `common/src/combat/getEffectiveCombatStats.ts`:
  - Keep special matchup overrides as the highest-precedence rule.
  - If no matchup override applies and `item.boosted` is true, return base combat stats plus `+10 attack / +10 defense`.
  - Otherwise fall back to `getCombatStats(item)`.
  - Do not modify `getCombatStats` itself beyond comments if desired.
- Add server-side action handling in `server/src/sockets/game/processGameAction.ts`:
  - Validate `boost` similarly to `load`/`unload`: acting unit must belong to active team, must not have already acted, may move first or stay in place, and target must be adjacent after movement.
  - Reuse existing move validation for the actor’s `start -> end`.
  - Reject invalid booster/target pairings, enemy targets, non-adjacent targets, empty cells, or already-boosted targets.
  - After validation, optionally move the booster, then set `boosted: true` on the target cell and mark the acting unit as `moved: true`.
  - Preserve the “only one follow-up action after movement” rule by modeling boost as its own terminal action, just like `attack`, `load`, and `unload`.
  - Keep boost persistent across turns; only unit death should remove it naturally when the map cell is cleared.
- Update client interaction flow in `ui/src/pages/Game/gameInteraction.ts`:
  - Add boost-target discovery for the currently selected/moved unit.
  - Add `Boost` into the post-move action menu only when at least one valid adjacent target exists.
  - Add reducer states/actions parallel to the existing attack/load/unload flow:
    - choose boost mode
    - highlight valid targets
    - select target
    - confirm boost
  - Ensure the initial click still shows movement targets first; boost only appears after a move destination is chosen or origin is re-opened for a zero-move action.
- Update unit rendering in `ui/src/components/Map/Cell/Terrain/Terrain.tsx` and/or `ui/src/components/Map/Unit/Unit.tsx`:
  - Pass `boosted` through rendering props.
  - Visually distinguish boosted units with a white treatment on the emoji/symbol.
  - Apply the same indicator to loaded units if their `loadedUnit.boosted` is true, so persisted boost state stays visible consistently.

## Test Plan
- Add common combat tests covering:
  - boosted unit gets `+10/+10` with no matchup override
  - special combat bonus still overrides boost when both could apply
  - non-boosted opponent in the same combat can still benefit from its own boost
- Add server action tests for:
  - `bluesMusician`, `zookeeper`, and `scientist` each boosting a valid adjacent target
  - boost after movement and boost without movement
  - rejection of invalid target category, enemy target, non-adjacent target, empty target, and already-boosted target
  - boosted flag persists after turn end
  - boosted flag disappears when the unit dies because the cell is cleared
- Add UI interaction coverage for:
  - boost option appearing only after move-target confirmation
  - boost mode highlighting only valid adjacent targets
  - boost not appearing alongside invalid follow-up paths
  - boosted units rendering with the gold indicator

## Assumptions
- Boost duration is persistent: once boosted, a unit remains boosted until it dies.
- Boosts do not stack; trying to boost an already-boosted unit should be disallowed rather than silently ignored.
- Only units physically present on the map can be targeted; loaded units cannot be boosted while inside a transport.
- “Bonus overrides boost” means matchup-specific stats fully replace the boosted calculation for that combatant in that matchup.

