# Four Forests AI strategy and pilot gate

## Scope and identity

The first Phase 3 learning target is the bundled `four-forests` preset under the exact preset hash and pinned engine, ruleset, content, observation, and candidate-encoding versions reported by the training environment. Any balance, content, rules, or map edit creates a new training identity and invalidates this experiment's checkpoints and qualification evidence.

The map contains 91 cells: 64 forest, 26 road, and one central water cell. Each team begins with one capital, leader, and soldier. Orange begins with 1,000 money; Purple begins with 900 because Purple acts first. The terrain and units remain geometrically mirrored, but evaluation must still report outcomes separately by seat and swap deterministic policy instances between seats.

The 100-money Purple handicap was introduced after a 768-game held-out qualification run at 1,000/1,000 produced a 54.4% Orange score and 66.9% Purple score. It reduces first-player liquidity through the worker/office/church opening without changing shared unit costs or turn rules. It changes the preset hash and invalidates every earlier Four Forests checkpoint and qualification report.

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

A pilot checkpoint is never player-qualified by training accuracy alone. A longer curriculum run is justified only when both teams demonstrate winning paths, paired seat disparity is at most 25 percentage points, draws do not exceed half of competent games, broad action-family accuracy is at least 65%, strategic construction/spawn accuracy is at least 65%, and closed-loop evaluation shows at least one scripted-baseline win without port/submarine production. Failing a map criterion triggers balance investigation; failing a learning criterion triggers curriculum or learner revision before simply extending runtime.

## Qualified Phase 3 result

The current qualified identity is preset hash `18d5a763e664f8615873166c39e57b84e5218c438db7aad7502a878ad7626021`, using `standard@2`, `standard@1` content, `standard-observation@1`, `standard-actions@1`, and `four-forests-objective-policy@1`. The selected checkpoint SHA-256 is `75e1ea9587883992886afc3af01fe32427c8da7196d34da63365384ad5790912`.

The final untouched qualification range contained 384 paired scenarios (768 games). The policy won 591 and lost 177 with no draws: 77.0% overall, 81.5% as Orange, and 72.4% as Purple. The 95% win-rate lower bounds were 77.3% and 67.7% by seat. Every game completed the intended Michael buildout and ended by capital destruction; no port or submarine was produced. Separate scores were 95.8%/67.2% as Orange and 88.5%/56.3% as Purple against Zucker/Michael, with the lowest profile-specific 95% lower bound at 49.2%.

The locally generated ONNX bundle passed PyTorch/ONNX Runtime CPU parity and ONNX Runtime Web/WASM parity. Web/WASM policy logits differed by at most `7.63e-6`, candidate permutation difference was zero, and the smoke-selected Four Forests command advanced the authoritative engine. These results qualify the combined checkpoint and deterministic policy for Four Forests; they do not qualify the raw checkpoint by itself or complete player-facing integration.

## Curriculum decision

The initial mixed-profile run exposed contradictory labels because the observation intentionally contains no hidden profile bit. The curriculum now selects the Michael Jackson branch as the one canonical opening: its paired scripted games were substantially more decisive than Zuckerbird mirror play, and it uses the office economy while preserving a durable capital attacker. A future learner may discover or receive an explicitly versioned strategic-intent input for alternative branches, but the initial model is trained against one action target for each observable state.

The pilot now includes on-policy correction for states reached by model mistakes. A longer run should expand office-placement and force-protection scenarios, improve value learning, and continue to reject repeated economy buildings and unusable naval production before release qualification.
