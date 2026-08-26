# Conventions

## General principles

- Keep strict TypeScript and model trust-boundary input as `unknown` until runtime validation narrows it.
- Maintain one authoritative definition for state, actions, events, content, costs, limits, and supported versions.
- Prefer clear domain names, immutable inputs/outputs, focused responsibilities, and the smallest cohesive implementation.
- Follow the repository formatter and zero-warning ESLint configuration.

## Workspace ownership

- `game-core` owns ruleset-neutral normalized state, IDs, axial geometry, invariants, and transition infrastructure.
- `game-rules` owns standard content, actions, events, legality policies, handlers, and ordered mechanics.
- `protocol` owns current transport schemas and composes injected action/event codecs.
- `game-setup` owns editor map documents and converts them once into normalized initial state.
- `application` owns provider-neutral ports and session/reconciliation behavior.
- `presentation` derives renderer-neutral view models and semantic action drafts.
- Renderers own projection and visual interaction only. Adapters own provider details only.
- React consumes application/presentation models; concrete adapters and ID generation are bound at composition roots.

Do not deep-import another workspace package, duplicate a rule in UI or a renderer, or introduce a compatibility path for unsupported prototype data.

## Documentation expectations

Update current architecture, domain, testing, setup, and operations documentation with behavior changes. Keep historical design records unchanged and clearly subordinate to the current authoritative documents.
