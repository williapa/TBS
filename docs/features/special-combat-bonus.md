# Feature - Special Combat Bonus

STATUS - COMPLETE (MERGED)

This document describes a feature - special combat bonuses for specific unit types. This feature will apply to 2 unit types - studentAthlete, and zuckerbird.

## Summary

This feature will grant special combat bonuses when specific units are attacking (or defending) other specific unit types. Under all other circumstances, their normal combat stats will be used (as defined in getCombatStats). But, for specific unit types, their combat stats will be enhanced (or reduced) against specific unit types.

## Student Athlete
"StudentAthlete" units will now receive a combat bonus against "MichaelJackson". Against "michaelJackson", "studentAthlete" unit's attack,defense should be adjusted to [100,100]. However, when in combat against ANY vehicle unit type, the "studentAthlete" stats should be adjusted to [10,0].

## Zuckerbird
"zuckerbird" units will now receive a bonus against "capital" buildings, boosting their attack,defense to [100,8]. When in combat with a unit type "dragon", the "zuckerbird" stats should be adjusted to [8,100]. 

## Special Combat Bonus Implementation Plan
### Summary
Use a separate matchup-aware combat stat resolver rather than changing getCombatStats directly. common/src/combat/getCombatStats.ts is currently a baseline lookup for a single unit, while common/src/combat/calculateDamage.ts is the first point that has both combatants and is therefore the natural place to apply opponent-specific overrides.

This keeps the existing API stable, isolates special-case combat logic from default unit definitions, and gives us a cleaner path if more matchup rules are added later.

### Key Changes
Add a new combat helper such as getEffectiveCombatStats(unit, opponent) or getCombatStatsForMatchup(unit, opponent) in common/src/combat/.
Keep getCombatStats responsible only for default/base stats for one unit.
Update calculateDamage to call the new matchup-aware helper for both attacker and defender before computing damage.
Implement the current feature as explicit override rules:
studentAthlete vs michaelJackson -> [100, 100]
studentAthlete vs any vehicle -> [10, 0]
zuckerbird vs capital -> [100, 8]
zuckerbird vs dragon -> [8, 100]
Represent the new rules in a small data-driven structure if practical, but keep it simple:
either a short ordered rule list with predicates
or a small switch-based helper per unit
Preserve current combat flow so the same matchup logic applies both on the initial attack and on retaliation.

### Why This Approach
Better separation of concerns: baseline stats stay in one place, conditional matchup logic lives in another.
Lower regression risk: no need to widen the getCombatStats signature or touch unrelated callers.
Easier extensibility: future “special combat” rules can be added without bloating the base stat map.
Better readability: the distinction between “what this unit normally is” and “what happens in this matchup” stays clear.
I would not recommend folding this into getCombatStats unless the project intends to redefine that function as “all combat stat resolution,” because it currently has a clean single-unit contract.

### Test Plan
Add focused unit tests around the new matchup resolver and/or calculateDamage.
Cover these scenarios:
studentAthlete gets boosted stats against michaelJackson
studentAthlete gets reduced defense against each vehicle type
studentAthlete keeps base stats against unrelated non-vehicle units
zuckerbird gets boosted attack against capital
zuckerbird gets boosted defense against dragon
zuckerbird keeps base stats against unrelated units/buildings
retaliation uses the same matchup rules when roles reverse
If adding tests to common, also add a real test runner there or at the repo root, since common currently has no meaningful automated test setup.
Assumptions
“Against” means the override applies whenever that unit is in combat with the target type, whether attacking or defending.
These overrides replace the unit’s normal [attack, defense] pair rather than adding deltas.
If multiple rules could ever match in the future, rule precedence should be explicit and deterministic; for this feature, the current matchups do not overlap.