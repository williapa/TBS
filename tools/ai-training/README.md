# Headless AI training environment

Run `pnpm ai:build` once. Protocol clients then start `node tools/ai-training/dist/server.js` directly; `pnpm ai:serve` is the interactive convenience command. The process reads one JSON request per line from standard input and writes one JSON response per line to standard output. Node remains the sole owner of game transitions; a learner can keep up to 256 named environments alive in the process.

Every request has a bounded `id`, an `environmentId`, and one of these operations:

- `reset`: requires a production `presetId`, unsigned 32-bit `seed`, and optional `maxCommands`.
- `observe`: returns the canonical state, active team, outcome status, rewards, bootstrap flag, and current candidates.
- `encode`: returns the versioned, masked graph/candidate tensors for the current actor without exposing stable IDs as model features.
- `legal-actions`: returns just the revision-bound candidate mapping.
- `step`: requires the candidate encoding version, state revision, candidate index, and semantic key returned by the same observation.
- `snapshot` / `restore`: checkpoint or resume canonical state and environment provenance.
- `replay`: reconstruct a trajectory from its recorded base state and semantic candidate keys.

Requests larger than 1 MiB, unsupported/custom presets, stale candidate mappings, legacy `standard@1` states, mismatched preset hashes, and invalid snapshots are rejected without applying a command. A command-budget cutoff reports `status: "truncated"` with `bootstrapAllowed: true`; engine wins and draws report `status: "terminated"` with `bootstrapAllowed: false`.

Construct and spawn candidates contain deterministic collision-free entity IDs so they can be passed directly through the evaluator. Their semantic keys omit those bookkeeping IDs. Candidate keys are opaque and versioned; learned features must not use them, generated entity IDs, list indices, or raw stable IDs as strategy inputs.

Run `pnpm ai:benchmark` to print one JSON metrics row per bundled production map. It measures initial enumeration, movement traversals, validation calls, bookkeeping allocations, heap change, bounded random-legal simulation throughput, and observation serialization.

## Phase 2 representation and export

`@TBS/game-ai` owns the framework-free `standard-observation@1` encoding. It represents valid cells and six-neighbor links, relative geometry, terrain, entity and cargo relationships, content-derived stats/capabilities/production, relative ownership, both economies, active objectives, the acting/observing teams, the rules-owned remaining-turn horizon, and every legal candidate's semantic fields. Variable cell/entity/candidate axes carry masks. Per-preset limits reject overflow rather than dropping choices.

To reproduce the deterministic Money Mountain export proof, activate Python 3.12 in an isolated environment, install `tools/ai-training/python/requirements-phase2.txt`, then run `pnpm ai:phase2` from the repository root. Alternatively, set the task-specific `AI_TRAINING_PYTHON` variable to that environment's Python executable. Generated development-only artifacts go under the ignored `tools/ai-training/.tmp/ai-phase-2` directory. The command:

1. creates a production-preset observation fixture;
2. exports an untrained `hex-graph-policy-value@1` checkpoint and ONNX model;
3. checks entity invariance and candidate equivariance in PyTorch;
4. compares PyTorch, ONNX Runtime CPU, and ONNX Runtime Web/WASM outputs;
5. sends the WebAssembly model's selected legal candidate back through the TypeScript engine; and
6. benchmarks reachable Money Mountain representation sizes and encoding latency.

The generated manifest is intentionally marked `qualifiedForPlayerRelease: false`. Phase 2 proves the representation and deployment boundary; it does not train or release a capable player.

## Four Forests Phase 3 pilot

The first map-specific experiment targets the bundled `four-forests` preset. It provides two deterministic, strategy-guided profiles around the shared construction-worker → office opening:

- `zucker`: add a second leader and a Zuckerbird before advancing;
- `michael`: construct a church and spawn Michael Jackson before advancing.

Both profiles ignore port/submarine production, keep soldiers defensive, prefer attacks on the enemy capital, and use the production engine outcome without reward shaping. The paired balance suite swaps both profiles and their deterministic tie-break streams between seats so purple-first results remain visible.

Training trajectories use only the `michael` profile for both seats. `zucker` remains in paired balance and learned-policy evaluation, but it is not mixed into imitation labels because the version-one observation has no hidden strategy-intent feature.

The pilot collects versioned graph observations and scripted targets to a compressed JSON-lines trajectory file, trains the existing policy/value architecture with behavior cloning, and then performs bounded iterative correction. Each correction round rolls the current model out from both seats against the canonical expert, labels strategically distinct model-reached mistakes, and fine-tunes at a lower learning rate. Equivalent movement tie-breaks are excluded from the correction buffer. Construction and spawn samples receive additional training weight because a policy that only imitates common move/end-turn actions does not demonstrate the intended opening. The final checkpoint is evaluated from both seats against scripted and random opponents. Generated trajectories, checkpoints, and reports remain ignored development artifacts and are always marked unqualified for player release.

Create an isolated Python 3.12 environment outside this repository's `tools` tree, install `python/requirements-phase3.txt`, and set `AI_TRAINING_PYTHON` to its absolute Python executable path. Then run:

```sh
pnpm ai:phase3:test
pnpm ai:phase3:four-forests
```

The default bounded pilot writes to `.tmp/ai-phase-3-four-forests`. Use `--mode balance` to run only the paired scripted balance suite or `--mode evaluate --checkpoint <path>` to re-evaluate a compatible checkpoint. Counts, seeds, output directory, batch size, initial epochs, correction iterations/epochs, and learning rates are explicit CLI options. A pilot recommendation distinguishes map/seat balance blockers from curriculum-learning blockers; it does not qualify a model or authorize unrestricted self-play.
