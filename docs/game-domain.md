# Game domain

## Canonical state and authority

Live games use the normalized, versioned `GameState` contract from `@TBS/game-core`. A state contains lifecycle, revision, axial board cells, stable entities, teams and money, objectives, and turn data. Board coordinates locate entities but never identify them.

`@TBS/game-rules` owns the single standard action/event unions and deterministic `applyStandardAction` evaluator. An accepted action returns a new immutable state plus ordered domain events; a typed rejection leaves state unchanged. Postgres stores the canonical snapshot and applied-action history atomically. Realtime is only a revision wake-up signal, and clients reconcile missed notices from bounded durable history or the latest snapshot.

Two durable player seats exist: the creator is orange and the challenger is purple, with purple taking the first turn. Additional members are read-only spectators. Presence never grants a seat or controls gameplay.

## Maps and setup

The editor uses the versioned `MapDocument` contract owned by `@TBS/game-setup`. Its row, column, cell index, neighbor index, and empty-cell sentinel fields exist only at the map-document boundary. Setup validates map size, topology, identifiers, cargo, and the requirement that each player team has at least one movable combat unit. Unsupported prototype map documents are rejected or cleared.

Game creation converts a validated map exactly once into revision-zero normalized state:

- map cells become axial board cells keyed by coordinate;
- placed units and cargo receive deterministic stable entity IDs;
- orange and purple receive their initial money;
- each team receives an elimination objective;
- capital objectives are added when both teams begin with capitals; and
- lifecycle begins in `waiting` with the current schema, ruleset, and content versions pinned.

## Terrain and movement

Terrain types affect the energy required for movement and whether a unit may enter a cell. Unit definitions and terrain movement costs live in the standard rules/content registries. Legal-path previews and trusted movement validation use the same rule policies.

Each entity that can act has an action budget. A mobile combat unit may move once, and it may attack before moving only when the rules permit it; attack completes its action. A player may end the turn manually, and the deterministic post-action mechanic ends it automatically when no owned entity can still act. Action budgets reset for the next team.

## Units and abilities

Units are composed from definitions, capabilities, abilities, tags, and state components rather than category inheritance. The standard registry is the authority for movement, attack, defense, health, income, and supported abilities.

The current action families are:

- move and object collection/projectile use;
- attack and deterministic counterattack;
- boost and heal;
- construct and spawn, including money costs;
- load and unload transported entities; and
- end turn.

Rules expose shared selectors for legal entities, destinations, targets, choices, and affordability. Presentation turns those results into labels, panels, overlays, and semantic action drafts; React and the renderers do not reproduce the rules.

## Money and income

Each team starts with 1,000 money. Construction and production spend the costs defined in the rules registry. At turn transition, income from the next team's on-board buildings is calculated and credited deterministically. Income values are part of unit definitions, so setup, previews, and trusted execution share one source.

## Combat, objects, and status

Combat damage is deterministic. Effective attack and defense include matchup and boost modifiers. Damage is:

```text
max(0, floor(attack × attacker current health / maximum health)
       - ceil(defense × defender current health / maximum health))
```

The attacker strikes first. A surviving defender counterattacks from the post-strike state, so its reduced health can lower the counterattack. Death removal, object effects, money awards, status consumption, objectives, victory, turn completion, and income occur through explicit ordered mechanics.

Consumable objects may award money or supply projectile effects when collected as part of movement. Priest shielding and object damage are rule-owned behavior recorded in standard events.

## Victory

Every game has elimination objectives: a team loses when it no longer has an on-board unit with both movement and attack capability. When setup added capital objectives, losing the team's capital is also a loss condition. A winning transition emits `game-over` and sets the canonical lifecycle to `finished` with the winner team.

## Extension path

Add a unit through one content definition and any required presentation asset mapping. Add an action through a focused action module, runtime codec, registry composition, shared legality selector, semantic presentation wiring, and focused tests. Add post-action behavior through an explicitly ordered mechanic hook. None of these extension paths require a second reducer, protocol-version dispatch, persistence candidate-state change, or renderer-owned rule.

The opt-in Pathfinder/forest-concealment example exercises unit registry extension and ordered mechanics without changing the pinned standard content.
