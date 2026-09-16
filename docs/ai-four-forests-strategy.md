# Four Forests AI strategy and pilot gate

## Scope and identity

The first Phase 3 learning target is the bundled `four-forests` preset under the exact preset hash and pinned engine, ruleset, content, observation, and candidate-encoding versions reported by the training environment. Any balance, content, rules, or map edit creates a new training identity and invalidates this experiment's checkpoints and qualification evidence.

The map contains 91 cells: 64 forest, 26 road, and one central water cell. Each team begins with one capital, leader, soldier, and 1,000 money. Purple acts first. The setup is geometrically mirrored, but evaluation must still report outcomes separately by seat and swap deterministic policy instances between seats.

## Strategic curriculum

The shared opening is:

1. Spawn a construction worker from the capital.
2. Preserve money until the worker can construct an office.
3. Construct a church and spawn Michael Jackson before advancing.
4. Use leaders to clear opposing combat units and protect the capital attacker.
5. Prefer destruction of the opposing capital. Elimination is a fallback when combat removes the opponent's final mobile attacker first.

Ports and submarines are excluded because the only water cell cannot support useful naval play. Soldiers remain defensive unless an enemy combat unit approaches the home capital; they do not lead a capital charge. The curriculum uses no synthetic win condition and does not reinterpret draws or command-budget truncations.

## Pilot suite

The initial pilot has three evidence layers:

- Paired scripted play covers Zuckerbird mirror play, Michael Jackson mirror play, and cross-profile play with profiles and deterministic tie-break streams swapped between orange and purple.
- Strategy-guided trajectories use the single Michael Jackson curriculum for both seats and retain full versioned observations, legal-candidate alignment, selected semantic actions, actor-relative terminal values, episode boundaries, and train/validation splits. The Zuckerbird profile remains an evaluation opponent, not a contradictory label source.
- Bounded iterative correction rolls the current model out against the canonical expert from both seats, adds expert labels for strategically distinct model-reached mistakes, and fine-tunes at a lower learning rate. Equivalent movement tie-breaks are not treated as errors.
- The learned checkpoint is evaluated from both seats against fixed scripted profiles and random legal play. Reports include exact and action-family imitation accuracy, strategic construction/spawn accuracy, terminal outcomes, finish reasons, and produced-unit traces.

The pilot checkpoint is never player-qualified. A longer curriculum run is justified only when both teams demonstrate winning paths, paired seat disparity is at most 25 percentage points, draws do not exceed half of competent games, broad action-family accuracy is at least 65%, strategic construction/spawn accuracy is at least 65%, and closed-loop evaluation shows at least one scripted-baseline win without port/submarine production. Failing a map criterion triggers balance investigation; failing a learning criterion triggers curriculum or learner revision before simply extending runtime.

## Curriculum decision

The initial mixed-profile run exposed contradictory labels because the observation intentionally contains no hidden profile bit. The curriculum now selects the Michael Jackson branch as the one canonical opening: its paired scripted games were substantially more decisive than Zuckerbird mirror play, and it uses the office economy while preserving a durable capital attacker. A future learner may discover or receive an explicitly versioned strategic-intent input for alternative branches, but the initial model is trained against one action target for each observable state.

The pilot now includes on-policy correction for states reached by model mistakes. A longer run should expand office-placement and force-protection scenarios, improve value learning, and continue to reject repeated economy buildings and unusable naval production before release qualification.
