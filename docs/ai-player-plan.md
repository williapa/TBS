# AI training foundation

## Status and purpose

The repository has the deterministic tooling needed to run AI experiments against bundled production maps and a release-qualified Phase 3 policy bundle for Four Forests. The qualified policy combines trained weights with a versioned deterministic opening/objective postprocessor and is available in the player application as an ephemeral Orange-human versus Purple-AI match. There is still no evidence that unrestricted self-play is ready to replace the bounded curriculum.

Four Forests is the first training target. Its strategy, paired balance suite, behavior-cloning/correction run, and qualification gate are defined in [`ai-four-forests-strategy.md`](./ai-four-forests-strategy.md). A checkpoint without the matching postprocessor and qualification report remains unqualified.

This document is the authoritative description of the AI training foundation. It deliberately does not preserve results from exploratory simulations because rules, content, or map-balance changes invalidate those results.

## Training assumptions

### One model per bundled map

The shared environment, observation format, model architecture, and export path can support every bundled production map. Learned weights are not assumed to transfer safely between maps. Each trained AI will target one exact bundled-map setup, identified by its preset hash and pinned ruleset, content, engine, observation, and candidate-encoding versions.

Custom or locally edited maps are outside the initial training scope. A balance or gameplay change creates a new training identity and invalidates checkpoints and qualification evidence produced under the previous identity.

### Strategy must be map-specific

Legal-action self-play alone is not expected to discover useful play reliably. Before training a map, its plan must define strategic context such as:

- economy and spending priorities;
- terrain, routes, transport, and access constraints;
- important unit and structure matchups;
- objective timing and defensive obligations;
- useful opening states and short tactical scenarios; and
- conditions that distinguish progress from repetitive or draw-seeking play.

That context should drive scripted opponents, curriculum scenarios, reward diagnostics, and evaluation suites for that map. It must not be encoded as a change to the authoritative game outcome. Engine wins, losses, and draws remain the terminal truth.

### Balance is a prerequisite

Purple moves first in the current rules. Training and evaluation must report orange and purple results separately and use paired evaluations with sides swapped where the scenario permits it. Aggregate results must never hide first-player or team asymmetry.

Before learning begins, both teams must have demonstrated credible winning paths under competent scripted or human-controlled play. If only one team can win, or if draws dominate competent play, treat that as a game or map-balance blocker rather than as evidence about the learner. In particular, a policy that wins only as purple has not demonstrated general playing strength.

Random legal play is useful only as an environment smoke test and performance diagnostic. It is not a balance test, a strength benchmark, or a source of conclusions about which map should be trained first.

### Outcome and truncation semantics

The engine owns terminal outcomes. A win yields `+1` to the winner and `-1` to the loser; a draw yields `0` to both teams. An operational command-budget cutoff is reported separately as truncation and permits value bootstrapping. Training tools must not turn draws or truncations into synthetic victories.

Map-specific shaping may be used for curriculum diagnostics or auxiliary learning signals only when it is versioned, documented, and evaluated against the unchanged terminal outcome. Qualification must always use unshaped win, draw, and loss results split by seat.

## Implemented tooling

### Complete deterministic action enumeration

`@TBS/game-rules` exposes the complete legal command space for the standard ruleset through `enumerateStandardActions`. It covers all nine standard action families and produces candidates in a stable order. Each candidate is bound to the current actor and revision and has a versioned semantic key.

Construction and spawning candidates receive deterministic, collision-free bookkeeping IDs so they can be submitted directly to the evaluator. Those IDs, raw entity IDs, candidate indices, and semantic keys are protocol data, not model features. Tests cover candidate soundness, choice completeness, stable ordering, immutable evaluation, and deterministic replay.

### Headless training environment

`tools/ai-training` provides a long-lived JSON-lines process around the production setup and rules packages. It supports:

- resetting a validated bundled production preset with a deterministic seed;
- observing canonical state, active team, outcome status, rewards, and legal candidates;
- encoding the current actor's model observation;
- applying a revision-bound candidate through the authoritative evaluator;
- snapshotting, restoring, and replaying trajectories; and
- running multiple named environments in one process.

The boundary rejects unsupported or custom presets, stale candidates, incompatible rulesets, mismatched preset hashes, invalid snapshots, oversized messages, and excessive environment counts. It records enough version and setup provenance to prevent silently replaying data under different rules.

The environment preserves the production turn order, including purple-first activation. Its command budget is an operational safety limit rather than a gameplay rule.

### Versioned observation and candidate representation

`@TBS/game-ai` owns the framework-free `standard-observation@1` representation. It encodes:

- valid hex cells and six-neighbor graph links;
- relative geometry and terrain;
- entities, cargo relationships, capabilities, production, and combat-relevant content;
- relative ownership, both economies, objectives, acting team, observing team, and remaining turn horizon; and
- every legal candidate's semantic fields and mask.

Variable cell, entity, and candidate axes use explicit masks. Per-preset shape limits reject overflow instead of dropping legal choices. Record-order and entity-order tests protect invariance, while candidate permutation tests protect policy-logit alignment.

### Model and export verification

The Python harness defines the untrained `hex-graph-policy-value@1` graph/candidate architecture. It shares encoded board information across entities, scores the current legal candidates, and estimates a value for the acting player.

The export path converts a PyTorch checkpoint to ONNX, verifies permutation behavior, compares native and ONNX Runtime outputs, loads the model with ONNX Runtime Web/WASM, and feeds a selected candidate back through the TypeScript environment. Generated checkpoints, fixtures, manifests, and ONNX files are ignored development artifacts and are never qualified for player release merely because export verification succeeds.

The current export fixture uses Money Mountain as a deterministic technical compatibility fixture. That does not select Money Mountain for training, define a Money Mountain strategy, or provide balance or strength evidence.

### Four Forests curriculum pilot

`tools/ai-training/python/four_forests_phase3.py` supplies the first map-specific scripted profiles, paired-seat balance checks, compressed trajectory collection, weighted behavior-cloning loop, bounded iterative correction on model-reached states, checkpoint selection, closed-loop evaluation, and a qualification-grade held-out suite. `export_four_forests_model.py` binds a passing qualification report to the exact checkpoint and live preset identity, exports ONNX, and verifies native runtime parity. Strategy remains outside the deterministic game rules and terminal values still come only from authoritative engine outcomes.

### Reusable commands

- `pnpm ai:build` builds the headless environment.
- `pnpm ai:serve` starts the JSON-lines protocol process after it has been built.
- `pnpm ai:benchmark` runs environment and legal-action performance diagnostics across bundled presets. Cross-map execution here is shared-tool coverage only.
- `pnpm ai:representation:benchmark` measures the current representation fixture's sizes and encoding cost.
- `pnpm ai:phase2` reproduces the untrained model/export compatibility verification. The command name is historical; it does not run training or report playing strength.
- `pnpm ai:phase3:test` runs the Four Forests strategy-pilot unit coverage.
- `pnpm ai:phase3:four-forests` runs the bounded map-specific pilot and writes ignored development artifacts.

Operational details live in [`tools/ai-training/README.md`](../tools/ai-training/README.md), and the automated coverage is listed in [`docs/testing.md`](./testing.md).

## Intentionally not implemented

The repository does not yet provide:

- a PPO, league, or unrestricted self-play learning loop;
- a self-play opponent pool or league;
- player-facing models for maps other than Four Forests.

These omissions are the clean stopping boundary. Adding a learner before balance and map strategy are established would automate production of data without establishing that the data teaches useful play.

## Resuming work after balance changes

Resume AI work in this order:

1. Stabilize the relevant game rules, content, and bundled maps. Version changes forward and update their deterministic tests.
2. Verify that both orange and purple have credible winning paths. Preserve win, draw, and loss counts by seat and inspect first-player asymmetry directly.
3. Keep Four Forests as the single initial target until its curriculum gate passes.
4. Maintain its map-specific strategy document as economy, objective, opening, tactical, and failure-mode evidence changes.
5. Expand its deterministic curriculum scenarios and scripted baselines before unrestricted self-play.
6. Extend the pilot trajectory, behavior-cloning, and correction pipeline with a self-play learner only after the current curriculum gate passes.
7. Evaluate with fixed seeds, paired seats, held-out scenarios, separate win/draw/loss reporting, and regression checks against known tactical cases.
8. Treat a model as releasable only after it passes an explicit map-and-version-specific qualification gate.

Later maps repeat steps 3 through 8 with their own strategy, curriculum, checkpoints, and qualification evidence. They may reuse the tooling and architecture, but they do not inherit another map's strategic assumptions or claim of readiness.

## Architectural boundary

The deterministic game engine remains authoritative. The AI tooling is an outer local composition and does not add training concerns to `game-core` or `game-rules`. The observation package contains no tensor runtime, filesystem, browser, network, or randomness dependency. Model inference selects only from a revision-bound legal candidate set, and the normal evaluator still validates the chosen command.

Generated training artifacts remain ignored local artifacts. The qualified Four Forests ONNX model is the sole vendored player artifact. The browser runtime implements the exact versioned postprocessor, Web Worker model loading, fixed shape limits, a bounded inference timeout, stale-result rejection, and fail-closed behavior. The homepage exposes this fixed map/model pairing directly rather than generalizing AI into the create-game form.
