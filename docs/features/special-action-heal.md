# Feature - special heal action

STATUS - COMPLETE (MERGED)

This document describes a feature, allowing certain units to perform a special "heal" action targeting specific unit types.

## Summary

Like all actions (attack, load, unload), this new "heal" action should be a presented as an option in the action form after a unit has moved (even if the destination for movement is the same position as where it started). The initial click for a unit should always display the movement targets, and only after confirming the movement target should this new action (in addition to the other established ones) be displayed. Additionally, units should only be able to perform one follow-up action to moving, whether it be a "heal", "attack", "load", etc. - the "heal" action cannot be combined with any additional actions, aside from move. Finally, the "heal" action can only be performed when the unit performing the boost is adjacent to a valid target unit. 

All heal actions will reduce up to 10 damage to from the heal unit's accumulated damage. At most, a heal action will restore a unit to full health, but it cannot apply "negative" damage, or increase a unit's max health. 

The units which can perform heal actions, and their valid target units, are described below.

### Doctor

Doctors should be able to heal people units, including other doctors.

### Ambulance

Ambulance units should be able to heal people units.

### Engineer

Engineer units should be able to heal building units.

### Pilot

Pilot units should be able to heal flying vehicles.

### Worker

Worker units should be able to heal ground vehicles.

# Special Heal Action Implementation Plan

## Summary

Implement `heal` as a new post-move terminal action that follows the same interaction and validation pattern as `boost`, but resolves by reducing an adjacent allied unit’s `damage` by up to 10. Reuse the existing shared movement/adjacency/action architecture so client and server stay aligned, and keep heal state stateless beyond the target’s updated `damage` value.

## Key Changes
- Extend the standard action/event contracts in `@TBS/game-rules`:
  - Add `"heal"` to `supportedActions`.
  - Add a `Heal` action with `start`, `end`, and `target` coordinates.
  - Add a `HealEvent` with healer unit, healed unit, target coordinates, and a numeric `healedDamage` payload.
  - Extend `GameAction` and `GameEvent` unions accordingly.
- Add focused heal rules in the `game-rules` action module, mirroring the boost handler shape:
  - `canUnitHeal(unitType)`
  - `canReceiveHeal(healerType, targetType)`
  - `getHealableCellIndexes(map, actorCell, perspective)`
  - Back these with target groups derived from existing type buckets:
    - `doctor` -> `peopleUnitOptions`
    - `ambulance` -> `peopleUnitOptions`
    - `engineer` -> `buildingUnitOptions`
    - `pilot` -> `flyingOptions`
    - `worker` -> `groundVehicleOptions`
- Export the required heal policy from `@TBS/game-rules` so presentation previews and trusted execution consume one rule source.
- Keep health modeling unchanged:
  - Do not add a new `healed` flag or any extra persistent state.
  - Healing only updates `damage`, using `Math.max(0, currentDamage - 10)`.
  - Units already at full health are not valid heal targets and should not surface in target selection.
- Add server-side action handling in `server/src/sockets/game/processGameAction.ts`:
  - Validate `heal` like `boost`/`load`/`unload`: active-team unit, not already moved, may move first or stay in place, and action ends the unit’s turn.
  - Allow movement onto money exactly as existing post-move actions do; keep projectile-object restrictions unchanged.
  - After optional movement, validate that the target is adjacent, friendly, occupied, currently damaged, and matches the healer’s allowed target category.
  - Apply heal by reducing the target cell’s `damage`; if the result is `0`, normalize back to `undefined` for consistency with current health semantics.
  - Mark the healer as `moved: true` and emit a `heal` event with the actual healed amount (`1` to `10`).
- Integrate heal into the UI interaction reducer in `ui/src/pages/Game/gameInteraction.ts`:
  - Add `availableHealTargets`, `selectedHealTarget`, and pending action `"heal"` to interaction state.
  - Add menu actions `chooseHeal` and `confirmHeal`.
  - Compute heal targets from the preview map after move selection, exactly where attack/boost/load/unload are computed today.
  - Show `Heal` in the post-move action menu only when at least one valid adjacent damaged ally exists.
  - Add targeting and confirmation flow parallel to boost.
  - Add `buildHealAction(...)` to construct the outbound payload.
- Wire the new action through `ui/src/pages/Game/GameMap.tsx`:
  - Handle clicking highlighted heal targets.
  - Dispatch `CHOOSE_HEAL_MODE`, `SELECT_HEAL_TARGET`, and send `confirmHeal`.
- Update any event-display/UI copy paths that enumerate action names so heal events render cleanly alongside move/attack/boost.

## Test Plan
- Shared rules:
  - each healer unit can heal only its intended target category
  - invalid cross-category pairs are rejected
  - `getHealableCellIndexes` returns only adjacent allied occupied damaged valid targets
  - full-health units, enemies, empty cells, and invalid categories are excluded
- Server action handling:
  - heal after movement and heal without movement
  - heal reduces 10 damage when target has 10+ damage
  - heal reduces only remaining damage when target has less than 10 damage
  - heal clears `damage` back to `undefined` when target reaches full health
  - invalid target category, enemy target, empty target, undamaged target, non-adjacent target, and already-acted healer are rejected
  - healer is marked moved and cannot perform an additional follow-up action
  - money pickup on the healer’s destination still works for heal actions
- UI interaction:
  - initial unit click still shows movement targets first
  - `Heal` appears only after choosing a move destination or reopening the origin for zero-move action
  - heal mode highlights only valid adjacent damaged allies
  - selecting a heal target opens a confirm menu and sends the expected `heal` payload

## Assumptions
- Heal is ally-only, matching the existing boost-style support action pattern.
- Heal does not affect loaded units directly; only units currently on map cells can be targeted.
- Buildings with `damage` are healable by engineers, since buildings already participate in the shared attackable/damage model.
- No visual “healed” indicator is needed beyond the normal health bar changing, because heal is not a persistent status effect.
- The cleanest implementation is to follow the existing boost architecture closely, but keep the health change isolated to `damage` rather than introducing new map state.
