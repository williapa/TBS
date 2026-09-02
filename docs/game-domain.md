# Game domain

## Canonical state and authority

Live games use the normalized, versioned `GameState` contract from `@TBS/game-core`. A state contains lifecycle, revision, axial board cells, stable entities, teams and money, objectives, and turn data. Board coordinates locate entities but never identify them.

`@TBS/game-rules` owns the single standard action/event unions and deterministic `applyStandardAction` evaluator. An accepted action returns a new immutable state plus ordered domain events; a typed rejection leaves state unchanged. Postgres stores the canonical snapshot and applied-action history atomically. Realtime is only a revision wake-up signal, and clients reconcile missed notices from bounded durable history or the latest snapshot.

The active client may render one optimistic transition calculated by that same evaluator while its action envelope is awaiting the trusted server. This projection is transient: it is not inserted into canonical action history, persisted, or used as the base for another submission. Server acceptance replaces the canonical snapshot and clears the matching projection. Rejection clears it and renders the prior canonical snapshot again. Realtime and submission responses may confirm or supersede the projection, but they cannot regress a newer canonical revision.

Two durable player seats exist: the creator is orange and the challenger is purple, with purple taking the first turn. Additional members are read-only spectators. Presence never grants a seat or controls gameplay.

## Maps and setup

The editor uses the versioned `MapDocument` contract owned by `@TBS/game-setup`. Its row, column, cell index, neighbor index, and empty-cell sentinel fields exist only at the map-document boundary. Setup validates map size, topology, identifiers, cargo, and the requirement that each player team has at least one movable combat unit. Unsupported prototype map documents are rejected or cleared.

The new-map form limits hexagon side width to 10 in the browser. The setup contract retains its broader compatibility limit so previously saved or imported maps are not reinterpreted by this UI constraint.

The client ships read-only Default battlefield, 4 Forests, Lake Affection, and Money Mountain presets through the same validated map repository interface used for local maps.

New maps begin in a symmetry-assisted editor stage. The creator chooses either a vertical axis through opposite map edges or a diagonal axis through opposite corners, edits one half of the hexagon, and then reflects that half across the selected axis. Before reflecting, the creator may choose to flip the reflected half vertically, reversing its top-to-bottom arrangement within the destination half. Cells on the axis and the destination half are visible but read-only until reflection. Reflection copies terrain and units while exchanging orange and purple ownership. Empty cells and object units remain neutral. After reflection, every cell becomes editable for final adjustments and the ordinary map save flow is unchanged. Existing saved maps open directly in unrestricted editing.

Newly placed non-object units default to orange but may be assigned to either player team before reflection. Money, missiles, and nukes never accept team ownership in the editor. Map documents continue to represent this absence of ownership with the existing `gray` sentinel, and compatible documents containing colored objects are normalized to neutral when read.

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

The map editor shows the win condition derived from its current unit placement. Game creation and invite previews show the same condition from the revision-zero objectives, and the active game shows it in the details panel whenever no cell or actor is selected. These views present the canonical objectives rather than storing a separate win-condition setting.

Finished-game views announce the winning team and seated player's display name in the persistent game status, and mark the winning player panel independently of the transient event history.

## Extension path

Add a unit through one content definition and any required presentation asset mapping. Add an action through a focused action module, runtime codec, registry composition, shared legality selector, semantic presentation wiring, and focused tests. Add post-action behavior through an explicitly ordered mechanic hook. None of these extension paths require a second reducer, protocol-version dispatch, persistence candidate-state change, or renderer-owned rule.

The opt-in Pathfinder/forest-concealment example exercises unit registry extension and ordered mechanics without changing the pinned standard content.
