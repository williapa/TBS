from __future__ import annotations

import argparse
import copy
import gzip
import hashlib
import json
import math
import random
import shutil
import subprocess
import sys
from collections import Counter, deque
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence


ROOT = Path(__file__).resolve().parents[3]
SERVER = ROOT / "tools" / "ai-training" / "dist" / "server.js"
DEFAULT_OUTPUT = ROOT / "tools" / "ai-training" / ".tmp" / "ai-phase-3-four-forests"
MODEL_ARCHITECTURE = "hex-graph-policy-value@1"
PILOT_VERSION = "four-forests-pilot@1"
OBJECTIVE_POLICY_VERSION = "four-forests-objective-policy@1"
TEAM_IDS = ("orange", "purple")
PROFILES = ("zucker", "michael")
CANONICAL_TRAINING_PROFILE = "michael"
OBJECTIVE_ATTACKER_TYPES = ("michaelJackson", "zuckerbird")
ACTION_TYPES = ("attack", "boost", "construct", "end-turn", "heal", "load", "move", "spawn", "unload")
ACTION_TYPE_INDEX = {name: index for index, name in enumerate(ACTION_TYPES)}
HEX_DIRECTIONS = ((1, 0), (1, -1), (0, -1), (-1, 0), (-1, 1), (0, 1))


def _json_line(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), sort_keys=True)


def _repository_path(path: Path) -> Path:
    return path if path.is_absolute() else ROOT / path


class TrainingEnvironmentClient:
    def __init__(self) -> None:
        if not SERVER.exists():
            raise RuntimeError(f"training server has not been built: {SERVER}")
        self._process = subprocess.Popen(
            ["node", str(SERVER)],
            cwd=ROOT,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._request_id = 0

    def request(self, environment_id: str, operation: str, **values: Any) -> Any:
        if self._process.stdin is None or self._process.stdout is None:
            raise RuntimeError("training server pipes are unavailable")
        self._request_id += 1
        request = {
            "id": f"phase3-{self._request_id}",
            "environmentId": environment_id,
            "operation": operation,
            **values,
        }
        self._process.stdin.write(_json_line(request) + "\n")
        self._process.stdin.flush()
        line = self._process.stdout.readline()
        if not line:
            stderr = self._process.stderr.read() if self._process.stderr else ""
            raise RuntimeError(f"training server stopped unexpectedly: {stderr.strip()}")
        response = json.loads(line)
        if not response.get("ok"):
            message = response.get("error", {}).get("message", "training request failed")
            raise RuntimeError(f"{environment_id} {operation} failed: {message}")
        return response["result"]

    def reset(self, environment_id: str, seed: int, max_commands: int) -> dict[str, Any]:
        return self.request(
            environment_id,
            "reset",
            presetId="four-forests",
            seed=seed,
            maxCommands=max_commands,
        )

    def encode(self, environment_id: str) -> dict[str, Any]:
        return self.request(environment_id, "encode")

    def step(self, environment_id: str, observation: dict[str, Any], index: int) -> dict[str, Any]:
        candidate = observation["candidates"][index]
        transition = self.request(
            environment_id,
            "step",
            selection={
                "candidateVersion": observation["candidateVersion"],
                "stateRevision": observation["stateRevision"],
                "candidateIndex": index,
                "candidateKey": candidate["key"],
            },
        )
        return transition["observation"]

    def release(self, environment_id: str) -> None:
        self.request(environment_id, "release")

    def close(self) -> None:
        if self._process.stdin:
            self._process.stdin.close()
        try:
            self._process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            self._process.terminate()
            self._process.wait(timeout=5)
        if self._process.returncode not in (0, None):
            stderr = self._process.stderr.read() if self._process.stderr else ""
            raise RuntimeError(f"training server exited with {self._process.returncode}: {stderr.strip()}")

    def __enter__(self) -> "TrainingEnvironmentClient":
        return self

    def __exit__(self, exception_type: Any, exception: Any, traceback: Any) -> None:
        self.close()


def _other_team(team_id: str) -> str:
    return "orange" if team_id == "purple" else "purple"


def _coord(value: dict[str, int]) -> tuple[int, int]:
    return value["q"], value["r"]


def _hex_distance(left: tuple[int, int], right: tuple[int, int]) -> int:
    q = left[0] - right[0]
    r = left[1] - right[1]
    return max(abs(q), abs(r), abs(-q - r))


def _capital_position(state: dict[str, Any], team_id: str) -> tuple[int, int]:
    for objective in state["objectives"]:
        if objective["type"] == "capital" and objective.get("controllingTeamId") == team_id:
            return _coord(objective["position"])
    raise RuntimeError(f"capital objective is unavailable for {team_id}")


def _board_positions(state: dict[str, Any]) -> dict[tuple[int, int], dict[str, Any]]:
    return {_coord(cell["position"]): cell for cell in state["board"]["cells"].values()}


def _path_distance(
    state: dict[str, Any],
    start: tuple[int, int],
    target: tuple[int, int],
    flying: bool,
) -> int:
    cells = _board_positions(state)
    queue: deque[tuple[tuple[int, int], int]] = deque([(start, 0)])
    visited = {start}
    while queue:
        position, distance = queue.popleft()
        if position == target:
            return distance
        for q_delta, r_delta in HEX_DIRECTIONS:
            neighbor = (position[0] + q_delta, position[1] + r_delta)
            cell = cells.get(neighbor)
            if not cell or neighbor in visited:
                continue
            if not flying and cell["terrainTypeId"] == "water":
                continue
            visited.add(neighbor)
            queue.append((neighbor, distance + 1))
    return 10_000


def _objective_approach_distance(
    state: dict[str, Any],
    start: tuple[int, int],
    target: tuple[int, int],
    actor_id: str,
    flying: bool,
) -> int:
    """Find a route to an open cell from which the capital can be attacked."""
    cells = _board_positions(state)
    attack_positions = {
        neighbor
        for q_delta, r_delta in HEX_DIRECTIONS
        if (neighbor := (target[0] + q_delta, target[1] + r_delta)) in cells
        and (flying or cells[neighbor]["terrainTypeId"] != "water")
        and cells[neighbor].get("occupantEntityId") in (None, actor_id)
    }
    if not attack_positions:
        return _path_distance(state, start, target, flying)
    queue: deque[tuple[tuple[int, int], int]] = deque([(start, 0)])
    visited = {start}
    while queue:
        position, distance = queue.popleft()
        if position in attack_positions:
            return distance
        for q_delta, r_delta in HEX_DIRECTIONS:
            neighbor = (position[0] + q_delta, position[1] + r_delta)
            cell = cells.get(neighbor)
            if not cell or neighbor in visited:
                continue
            if not flying and cell["terrainTypeId"] == "water":
                continue
            if cell.get("occupantEntityId") not in (None, actor_id):
                continue
            visited.add(neighbor)
            queue.append((neighbor, distance + 1))
    return _path_distance(state, start, target, flying)


UNIT_VALUE = {
    "capital": 10_000,
    "michaelJackson": 1_500,
    "zuckerbird": 1_500,
    "leader": 900,
    "constructionWorker": 500,
    "office": 700,
    "church": 500,
    "soldier": 150,
}

BASE_ATTACK = {
    "capital": 0,
    "church": 0,
    "constructionWorker": 15,
    "leader": 50,
    "michaelJackson": 86,
    "office": 0,
    "soldier": 30,
    "zuckerbird": 8,
}

BASE_DEFENSE = {
    "capital": 60,
    "church": 60,
    "constructionWorker": 5,
    "leader": 35,
    "michaelJackson": 86,
    "office": 40,
    "soldier": 15,
    "zuckerbird": 8,
}


def _combat_damage(attacker: dict[str, Any], defender: dict[str, Any]) -> int:
    attacker_type = attacker["unitTypeId"]
    defender_type = defender["unitTypeId"]
    attack = 160 if attacker_type == "zuckerbird" and defender_type == "capital" else BASE_ATTACK.get(attacker_type, 0)
    defense = BASE_DEFENSE.get(defender_type, 0)
    attacker_health = attacker.get("health", {"current": 0, "maximum": 1})
    defender_health = defender.get("health", {"current": 0, "maximum": 1})
    raw_attack = math.floor(attack * attacker_health["current"] / attacker_health["maximum"])
    raw_defense = math.ceil(defense * defender_health["current"] / defender_health["maximum"])
    return max(0, raw_attack - raw_defense)


def _team_entities(state: dict[str, Any], team_id: str) -> list[dict[str, Any]]:
    return [
        entity
        for entity in state["entities"].values()
        if entity.get("ownerTeamId") == team_id and entity.get("position") is not None
    ]


def _orphan_entities(state: dict[str, Any]) -> list[dict[str, Any]]:
    cargo_ids = {
        cargo_id
        for entity in state["entities"].values()
        for cargo_id in entity.get("cargo", {}).get("entityIds", [])
    }
    return [
        {"id": entity["id"], "unitTypeId": entity["unitTypeId"], "ownerTeamId": entity.get("ownerTeamId")}
        for entity in state["entities"].values()
        if entity.get("position") is None and entity["id"] not in cargo_ids
    ]


def _count_units(entities: Iterable[dict[str, Any]]) -> Counter[str]:
    return Counter(entity["unitTypeId"] for entity in entities)


def training_profiles() -> dict[str, str]:
    """Return one observable-state policy target instead of hidden per-episode intent."""
    return {team: CANONICAL_TRAINING_PROFILE for team in TEAM_IDS}


def _has_objective_attacker(state: dict[str, Any], team_id: str) -> bool:
    return any(
        entity["unitTypeId"] in OBJECTIVE_ATTACKER_TYPES
        for entity in _team_entities(state, team_id)
    )


def should_collect_correction(
    candidates: Sequence[dict[str, Any]],
    expert_index: int,
    selected_index: int,
) -> bool:
    if expert_index == selected_index:
        return False
    expert_type = candidates[expert_index]["action"]["type"]
    selected_type = candidates[selected_index]["action"]["type"]
    return (
        expert_type != selected_type
        or expert_type in ("construct", "spawn")
        or selected_type in ("construct", "spawn")
    )


def strategic_correction_reason(
    observation: dict[str, Any],
    expert_index: int,
    selected_index: int,
) -> str | None:
    candidates = observation["candidates"]
    if expert_index == selected_index:
        return None
    expert_action = candidates[expert_index]["action"]
    selected_action = candidates[selected_index]["action"]
    expert_type = expert_action["type"]
    selected_type = selected_action["type"]
    if expert_type != selected_type:
        return "action-family"
    if expert_type in ("construct", "spawn"):
        return "production-choice"
    if expert_type not in ("attack", "move"):
        return None
    expert_score = score_four_forests_candidate(
        observation, candidates[expert_index], CANONICAL_TRAINING_PROFILE
    )
    selected_score = score_four_forests_candidate(
        observation, candidates[selected_index], CANONICAL_TRAINING_PROFILE
    )
    if expert_score - selected_score < 100.0:
        return None
    if expert_type == "attack":
        defender = observation["state"]["entities"].get(expert_action["defenderId"])
        return "capital-attack" if defender and defender["unitTypeId"] == "capital" else "attack-target"
    return "objective-move"


def _construction_score(
    state: dict[str, Any],
    action: dict[str, Any],
    desired_type: str,
    own_capital: tuple[int, int],
    enemy_capital: tuple[int, int],
) -> float:
    if action["buildingUnitTypeId"] != desired_type:
        return -2_000.0
    position = _coord(action["constructionPosition"])
    cells = _board_positions(state)
    open_neighbors = sum(
        1
        for q_delta, r_delta in HEX_DIRECTIONS
        if (neighbor := cells.get((position[0] + q_delta, position[1] + r_delta)))
        and neighbor.get("occupantEntityId") is None
        and neighbor["terrainTypeId"] != "water"
    )
    return (
        30_000.0
        + open_neighbors * 40.0
        - _hex_distance(position, own_capital) * 15.0
        + _hex_distance(position, enemy_capital) * 3.0
    )


def score_four_forests_candidate(
    observation: dict[str, Any],
    candidate: dict[str, Any],
    profile: str,
) -> float:
    if profile not in PROFILES:
        raise ValueError(f"unsupported Four Forests profile: {profile}")
    state = observation["state"]
    actor_team = observation["actorTeamId"]
    if actor_team not in TEAM_IDS:
        raise RuntimeError("scripted policy requires an active standard team")
    opponent_team = _other_team(actor_team)
    own_entities = _team_entities(state, actor_team)
    counts = _count_units(own_entities)
    own_capital = _capital_position(state, actor_team)
    enemy_capital = _capital_position(state, opponent_team)
    buildout_ready = (
        counts["office"] > 0
        and (
            (profile == "zucker" and counts["zuckerbird"] > 0 and counts["leader"] >= 2)
            or (profile == "michael" and counts["church"] > 0 and counts["michaelJackson"] > 0)
        )
    )
    action = candidate["action"]
    action_type = action["type"]

    if action_type == "end-turn":
        return 0.0

    if action_type == "attack":
        attacker = state["entities"].get(action["actorId"])
        defender = state["entities"].get(action["defenderId"])
        if not attacker or not defender:
            return -10_000.0
        damage = _combat_damage(attacker, defender)
        defender_health = defender.get("health", {}).get("current", 0)
        if damage <= 0:
            return -1_000.0
        defender_type = defender["unitTypeId"]
        if defender_type == "capital":
            return 108_000.0 + damage * 20.0
        if buildout_ready and attacker["unitTypeId"] in (
            "leader", "michaelJackson", "zuckerbird"
        ):
            destination = _coord(action["destination"])
            distance = _path_distance(state, destination, enemy_capital, flying=False)
            score = 5_000.0 + damage * 10.0 - distance * 300.0
            if damage >= defender_health:
                score += 2_000.0
            return score
        score = 8_000.0 + damage * 20.0 + UNIT_VALUE.get(defender_type, 200)
        if damage >= defender_health:
            score += 5_000.0
        return score

    if action_type == "construct":
        if counts["office"] == 0:
            return _construction_score(state, action, "office", own_capital, enemy_capital)
        if profile == "michael" and counts["church"] == 0:
            return _construction_score(state, action, "church", own_capital, enemy_capital)
        return -2_000.0

    if action_type == "spawn":
        unit_type = action["unitTypeId"]
        if counts["office"] == 0 and counts["constructionWorker"] == 0:
            return 35_000.0 if unit_type == "constructionWorker" else -2_000.0
        if profile == "zucker":
            if counts["leader"] < 2 and unit_type == "leader":
                return 27_000.0
            if counts["zuckerbird"] == 0 and unit_type == "zuckerbird":
                return 26_000.0
        else:
            if counts["church"] > 0 and counts["michaelJackson"] == 0 and unit_type == "michaelJackson":
                return 29_000.0
        return -2_000.0

    if action_type == "move":
        entity = state["entities"].get(action["actorId"])
        if not entity:
            return -10_000.0
        unit_type = entity["unitTypeId"]
        destination = _coord(action["destination"])
        if unit_type in ("leader", "michaelJackson", "zuckerbird") and buildout_ready:
            distance = _objective_approach_distance(
                state, destination, enemy_capital, action["actorId"], flying=False
            )
            unit_priority = {"zuckerbird": 900.0, "michaelJackson": 800.0, "leader": 400.0}[unit_type]
            opponents = _team_entities(state, opponent_team)
            danger = sum(
                1
                for opponent in opponents
                if opponent["unitTypeId"] in ("soldier", "leader", "michaelJackson")
                and _hex_distance(destination, _coord(opponent["position"])) <= (
                    3 if opponent["unitTypeId"] == "soldier" else 2
                )
            )
            exposure_per_threat = {
                "zuckerbird": 200.0,
                "michaelJackson": 50.0,
                "leader": 100.0,
            }[unit_type]
            exposure_penalty = danger * exposure_per_threat
            return 5_000.0 + unit_priority - distance * 300.0 - exposure_penalty
        if unit_type == "soldier":
            enemies = _team_entities(state, opponent_team)
            threatening = [
                enemy
                for enemy in enemies
                if enemy["unitTypeId"] in ("leader", "michaelJackson", "zuckerbird")
                and _hex_distance(_coord(enemy["position"]), own_capital) <= 4
            ]
            if threatening and _hex_distance(destination, own_capital) <= 2:
                nearest = min(_hex_distance(destination, _coord(enemy["position"])) for enemy in threatening)
                return 1_500.0 - nearest * 100.0
        return -1_000.0

    return -2_000.0


def choose_scripted_candidate(
    observation: dict[str, Any],
    profile: str,
    rng: random.Random,
) -> int:
    scored = [
        (score_four_forests_candidate(observation, candidate, profile), rng.random(), index)
        for index, candidate in enumerate(observation["candidates"])
    ]
    if not scored:
        raise RuntimeError("running environment has no legal candidate")
    return max(scored)[2]


def _winner(observation: dict[str, Any]) -> str | None:
    lifecycle = observation["state"]["lifecycle"]
    return lifecycle.get("winnerTeamId") if lifecycle["phase"] == "finished" else None


def _finish_reason(observation: dict[str, Any]) -> str:
    winner = _winner(observation)
    if winner is None:
        return "draw" if observation["status"] == "terminated" else "truncated"
    opponent = _other_team(winner)
    opponent_entities = _team_entities(observation["state"], opponent)
    if not any(entity["unitTypeId"] == "capital" for entity in opponent_entities):
        return "capital"
    movable_combat_types = {
        "airplane", "ambulance", "bigTruck", "bluesMusician", "constructionWorker", "doctor",
        "dragon", "engineer", "helicopter", "leader", "lion", "michaelJackson", "pilot",
        "priest", "scientist", "soldier", "studentAthlete", "sub", "truck", "worker",
        "zookeeper", "zuckerbird",
    }
    if not any(entity["unitTypeId"] in movable_combat_types for entity in opponent_entities):
        return "elimination"
    return "unknown"


@dataclass(frozen=True)
class EpisodeSummary:
    episode_id: str
    seed: int
    orange_policy: str
    purple_policy: str
    winner: str | None
    finish_reason: str
    turns: int
    commands: int
    action_counts: dict[str, int]
    produced_counts: dict[str, dict[str, int]]
    capital_attacks: dict[str, int]
    soldier_moves: dict[str, int]


def play_episode(
    client: TrainingEnvironmentClient,
    episode_id: str,
    seed: int,
    policies: dict[str, str],
    rngs: dict[str, random.Random],
    model_policy: Any | None = None,
    collect_samples: bool = False,
    max_commands: int = 2_000,
) -> tuple[EpisodeSummary, list[dict[str, Any]]]:
    observation = client.reset(episode_id, seed, max_commands)
    if model_policy is not None:
        model_policy.reset_episode()
    action_counts: Counter[str] = Counter()
    produced_counts = {team: Counter() for team in TEAM_IDS}
    capital_attacks: Counter[str] = Counter()
    soldier_moves: Counter[str] = Counter()
    samples: list[dict[str, Any]] = []

    while observation["status"] == "running":
        actor = observation["actorTeamId"]
        policy = policies[actor]
        if policy == "model":
            if model_policy is None:
                raise RuntimeError("model policy is unavailable")
            try:
                encoding = client.encode(episode_id)
            except RuntimeError as error:
                raise RuntimeError(
                    f"{error}; orphan entities: {_orphan_entities(observation['state'])}"
                ) from error
            index = model_policy.choose(encoding, observation)
        elif policy == "random":
            index = rngs[actor].randrange(len(observation["candidates"]))
        else:
            index = choose_scripted_candidate(observation, policy, rngs[actor])
        action = observation["candidates"][index]["action"]
        action_type = action["type"]
        action_counts[action_type] += 1
        if action_type in ("spawn", "construct"):
            unit_key = "unitTypeId" if action_type == "spawn" else "buildingUnitTypeId"
            produced_counts[actor][action[unit_key]] += 1
        if action_type == "attack":
            defender = observation["state"]["entities"].get(action["defenderId"])
            if defender and defender["unitTypeId"] == "capital":
                capital_attacks[actor] += 1
        if action_type == "move":
            mover = observation["state"]["entities"].get(action["actorId"])
            if mover and mover["unitTypeId"] == "soldier":
                soldier_moves[actor] += 1
        if collect_samples:
            samples.append({
                "episodeId": episode_id,
                "step": observation["commandCount"],
                "actorTeamId": actor,
                "actionType": action_type,
                "objectiveAttackerReady": _has_objective_attacker(observation["state"], actor),
                "candidateActionTypes": [candidate["action"]["type"] for candidate in observation["candidates"]],
                "targetIndex": index,
                "encoding": client.encode(episode_id),
                "sampleWeight": 1.0,
            })
        observation = client.step(episode_id, observation, index)

    winner = _winner(observation)
    for sample in samples:
        sample["valueTarget"] = 0 if winner is None else (1 if sample["actorTeamId"] == winner else -1)
    summary = EpisodeSummary(
        episode_id=episode_id,
        seed=seed,
        orange_policy=policies["orange"],
        purple_policy=policies["purple"],
        winner=winner,
        finish_reason=_finish_reason(observation),
        turns=observation["state"]["turn"]["number"],
        commands=observation["commandCount"],
        action_counts=dict(action_counts),
        produced_counts={team: dict(produced_counts[team]) for team in TEAM_IDS},
        capital_attacks=dict(capital_attacks),
        soldier_moves=dict(soldier_moves),
    )
    client.release(episode_id)
    return summary, samples


def _aggregate_episodes(episodes: Sequence[EpisodeSummary]) -> dict[str, Any]:
    outcomes: Counter[str] = Counter(
        "draw" if episode.winner is None else episode.winner for episode in episodes
    )
    finish_reasons = Counter(episode.finish_reason for episode in episodes)
    return {
        "games": len(episodes),
        "outcomes": dict(outcomes),
        "finishReasons": dict(finish_reasons),
        "meanTurns": sum(episode.turns for episode in episodes) / max(1, len(episodes)),
        "meanCommands": sum(episode.commands for episode in episodes) / max(1, len(episodes)),
        "episodes": [asdict(episode) for episode in episodes],
    }


def run_balance_suite(
    client: TrainingEnvironmentClient,
    pairs_per_matchup: int,
    seed: int,
) -> dict[str, Any]:
    episodes: list[EpisodeSummary] = []
    matchups = (("zucker", "zucker"), ("michael", "michael"), ("zucker", "michael"))
    for matchup_index, (first, second) in enumerate(matchups):
        for pair in range(pairs_per_matchup):
            scenario_seed = seed + matchup_index * 10_000 + pair
            for swap in range(2):
                orange = second if swap else first
                purple = first if swap else second
                episode_id = f"balance-{matchup_index}-{pair}-{swap}"
                episode, _ = play_episode(
                    client,
                    episode_id,
                    scenario_seed,
                    {"orange": orange, "purple": purple},
                    {
                        "orange": random.Random(scenario_seed * 2 + (2 if swap else 1)),
                        "purple": random.Random(scenario_seed * 2 + (1 if swap else 2)),
                    },
                )
                episodes.append(episode)
    aggregate = _aggregate_episodes(episodes)
    paired = []
    for index in range(0, len(episodes), 2):
        left, right = episodes[index:index + 2]
        paired.append({
            "scenarioSeed": left.seed,
            "firstProfiles": [left.orange_policy, left.purple_policy],
            "winners": [left.winner, right.winner],
        })
    aggregate["pairedScenarios"] = paired
    aggregate["seatWinRateDifference"] = (
        aggregate["outcomes"].get("purple", 0) - aggregate["outcomes"].get("orange", 0)
    ) / max(1, len(episodes))
    return aggregate


def collect_trajectories(
    client: TrainingEnvironmentClient,
    episode_count: int,
    seed: int,
    output_path: Path,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    episodes: list[EpisodeSummary] = []
    for episode_index in range(episode_count):
        episode_seed = seed + episode_index
        episode_id = f"collect-{episode_index}"
        episode, episode_samples = play_episode(
            client,
            episode_id,
            episode_seed,
            training_profiles(),
            {
                "orange": random.Random(episode_seed * 2 + 1),
                "purple": random.Random(episode_seed * 2 + 2),
            },
            collect_samples=True,
        )
        episodes.append(episode)
        split = "validation" if episode_index % 5 == 0 else "train"
        for sample in episode_samples:
            sample["split"] = split
            samples.append(sample)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output_path, "wt", encoding="utf-8") as target:
        for sample in samples:
            target.write(_json_line(sample) + "\n")
    metadata = {
        "trajectoryFormat": "four-forests-trajectories@1",
        "canonicalTrainingProfile": CANONICAL_TRAINING_PROFILE,
        "sampleCount": len(samples),
        "trainSamples": sum(sample["split"] == "train" for sample in samples),
        "validationSamples": sum(sample["split"] == "validation" for sample in samples),
        "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        "episodes": _aggregate_episodes(episodes),
    }
    return samples, metadata


def collect_model_corrections(
    client: TrainingEnvironmentClient,
    model: Any,
    pair_count: int,
    seed: int,
    output_path: Path,
    opponent_profiles: Sequence[str] = PROFILES,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    policy = TorchPolicy(model)
    samples: list[dict[str, Any]] = []
    episodes: list[dict[str, Any]] = []
    for pair in range(pair_count):
        scenario_seed = seed + pair
        opponent_profile = opponent_profiles[pair % len(opponent_profiles)]
        for model_team in TEAM_IDS:
            episode_id = f"correction-{pair}-{model_team}"
            observation = client.reset(episode_id, scenario_seed, 2_000)
            policy.reset_episode()
            expert_rng = random.Random(scenario_seed * 2 + 401)
            episode_samples: list[dict[str, Any]] = []
            while observation["status"] == "running":
                actor = observation["actorTeamId"]
                actor_profile = (
                    CANONICAL_TRAINING_PROFILE if actor == model_team else opponent_profile
                )
                expert_index = choose_scripted_candidate(
                    observation, actor_profile, expert_rng
                )
                if actor == model_team:
                    encoding = client.encode(episode_id)
                    selected_index = policy.choose(encoding, observation)
                    expert_type = observation["candidates"][expert_index]["action"]["type"]
                    selected_type = observation["candidates"][selected_index]["action"]["type"]
                    reason = strategic_correction_reason(
                        observation, expert_index, selected_index
                    )
                    if reason:
                        objective_attacker_ready = _has_objective_attacker(
                            observation["state"], actor
                        )
                        episode_samples.append({
                            "episodeId": episode_id,
                            "step": observation["commandCount"],
                            "actorTeamId": actor,
                            "actionType": expert_type,
                            "modelActionType": selected_type,
                            "correctionReason": reason,
                            "objectiveAttackerReady": objective_attacker_ready,
                            "candidateActionTypes": [
                                candidate["action"]["type"]
                                for candidate in observation["candidates"]
                            ],
                            "targetIndex": expert_index,
                            "encoding": encoding,
                            "split": "train",
                            "sampleWeight": 1.0,
                        })
                else:
                    selected_index = expert_index
                observation = client.step(episode_id, observation, selected_index)
            winner = _winner(observation)
            model_result = (
                "draw" if winner is None else ("win" if winner == model_team else "loss")
            )
            outcome_weight = {"draw": 3.0, "loss": 2.0, "win": 0.5}[model_result]
            for sample in episode_samples:
                sample["valueTarget"] = (
                    0 if winner is None else (1 if sample["actorTeamId"] == winner else -1)
                )
                aggression_weight = (
                    2.0
                    if sample["objectiveAttackerReady"]
                    and sample["correctionReason"] in (
                        "action-family", "attack-target", "capital-attack", "objective-move"
                    )
                    else 1.0
                )
                sample["sampleWeight"] = outcome_weight * aggression_weight
            samples.extend(episode_samples)
            episodes.append({
                "episodeId": episode_id,
                "modelTeamId": model_team,
                "opponentProfile": opponent_profile,
                "winner": winner,
                "modelResult": model_result,
                "finishReason": _finish_reason(observation),
                "turns": observation["state"]["turn"]["number"],
                "commands": observation["commandCount"],
                "correctionSamples": len(episode_samples),
            })
            client.release(episode_id)
    raw_weight_by_seat = {
        team: sum(sample["sampleWeight"] for sample in samples if sample["actorTeamId"] == team)
        for team in TEAM_IDS
    }
    if all(raw_weight_by_seat.values()):
        target_weight = sum(raw_weight_by_seat.values()) / len(TEAM_IDS)
        for sample in samples:
            sample["sampleWeight"] *= target_weight / raw_weight_by_seat[sample["actorTeamId"]]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output_path, "wt", encoding="utf-8") as target:
        for sample in samples:
            target.write(_json_line(sample) + "\n")
    return samples, {
        "correctionFormat": "four-forests-corrections@1",
        "canonicalTrainingProfile": CANONICAL_TRAINING_PROFILE,
        "sampleCount": len(samples),
        "sampleCountBySeat": dict(Counter(sample["actorTeamId"] for sample in samples)),
        "weightedSamplesBySeat": {
            team: sum(
                sample["sampleWeight"] for sample in samples if sample["actorTeamId"] == team
            )
            for team in TEAM_IDS
        },
        "correctionReasons": dict(Counter(sample["correctionReason"] for sample in samples)),
        "expertActionCounts": dict(Counter(sample["actionType"] for sample in samples)),
        "modelActionCounts": dict(Counter(sample["modelActionType"] for sample in samples)),
        "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        "episodes": episodes,
    }


def collect_objective_tactical_samples(
    client: TrainingEnvironmentClient,
    episode_count: int,
    seed: int,
    output_path: Path,
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    episodes: list[EpisodeSummary] = []
    for episode_index in range(episode_count):
        scenario_seed = seed + episode_index
        profile = PROFILES[episode_index % len(PROFILES)]
        episode, episode_samples = play_episode(
            client,
            f"objective-tactical-{episode_index}",
            scenario_seed,
            {team: profile for team in TEAM_IDS},
            {
                "orange": random.Random(scenario_seed * 2 + 501),
                "purple": random.Random(scenario_seed * 2 + 502),
            },
            collect_samples=True,
        )
        episodes.append(episode)
        if episode.finish_reason != "capital":
            continue
        for sample in episode_samples:
            if not sample["objectiveAttackerReady"] or sample["actionType"] not in ("attack", "move"):
                continue
            sample["split"] = "train"
            sample["sampleWeight"] = 2.5
            sample["tacticalProfile"] = profile
            samples.append(sample)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output_path, "wt", encoding="utf-8") as target:
        for sample in samples:
            target.write(_json_line(sample) + "\n")
    return samples, {
        "trajectoryFormat": "four-forests-objective-tactics@1",
        "sampleCount": len(samples),
        "profiles": dict(Counter(sample["tacticalProfile"] for sample in samples)),
        "actionCounts": dict(Counter(sample["actionType"] for sample in samples)),
        "sha256": hashlib.sha256(output_path.read_bytes()).hexdigest(),
        "episodes": _aggregate_episodes(episodes),
    }


def _torch_modules() -> tuple[Any, Any, Any]:
    try:
        import torch
        from torch import nn
        from torch.utils.data import DataLoader
    except ImportError as error:
        raise RuntimeError(
            "Phase 3 training requires PyTorch; install tools/ai-training/python/requirements-phase3.txt"
        ) from error
    return torch, nn, DataLoader


FLOAT_FIELDS = ("cellFeatures", "cellMask", "entityFeatures", "entityMask", "candidateFeatures", "candidateMask", "globalFeatures")
INTEGER_FIELDS = ("cellNeighbors", "entityCells", "entityCarriers", "candidateActors", "candidateDestinations", "candidateTargetEntities", "candidateTargetCells")


def _pad_first_axis(values: list[Any], size: int, fill: Any) -> list[Any]:
    return values + [fill for _ in range(size - len(values))]


def collate_samples(
    batch: Sequence[dict[str, Any]],
) -> tuple[tuple[Any, ...], Any, Any, Any, Any]:
    torch, _, _ = _torch_modules()
    tensors = [sample["encoding"]["tensors"] for sample in batch]
    maximum_entities = max(len(value["entityFeatures"]) for value in tensors)
    maximum_candidates = max(len(value["candidateFeatures"]) for value in tensors)
    values: dict[str, Any] = {}
    for field in FLOAT_FIELDS + INTEGER_FIELDS:
        rows = []
        for tensor in tensors:
            source = tensor[field]
            if field.startswith("entity"):
                size = maximum_entities
            elif field.startswith("candidate"):
                size = maximum_candidates
            else:
                rows.append(source)
                continue
            if source and isinstance(source[0], list):
                fill = [0.0] * len(source[0]) if field in FLOAT_FIELDS else [-1] * len(source[0])
            else:
                fill = 0.0 if field in FLOAT_FIELDS else -1
            rows.append(_pad_first_axis(source, size, fill))
        dtype = torch.float32 if field in FLOAT_FIELDS else torch.int64
        values[field] = torch.tensor(rows, dtype=dtype)
    inputs = (
        values["cellFeatures"], values["cellMask"], values["cellNeighbors"],
        values["entityFeatures"], values["entityMask"], values["entityCells"],
        values["entityCarriers"], values["candidateFeatures"], values["candidateMask"],
        values["candidateActors"], values["candidateDestinations"],
        values["candidateTargetEntities"], values["candidateTargetCells"],
        values["globalFeatures"],
    )
    targets = torch.tensor([sample["targetIndex"] for sample in batch], dtype=torch.int64)
    value_targets = torch.tensor([sample["valueTarget"] for sample in batch], dtype=torch.float32)
    family_targets = torch.tensor(
        [ACTION_TYPE_INDEX[sample["actionType"]] for sample in batch], dtype=torch.int64
    )
    sample_weights = torch.tensor(
        [sample.get("sampleWeight", 1.0) for sample in batch], dtype=torch.float32
    )
    return inputs, targets, value_targets, family_targets, sample_weights


def _classification_metrics(model: Any, samples: Sequence[dict[str, Any]], batch_size: int) -> dict[str, float]:
    torch, _, DataLoader = _torch_modules()
    loader = DataLoader(samples, batch_size=batch_size, shuffle=False, collate_fn=collate_samples)
    correct = 0
    top_five = 0
    family_correct = 0
    strategic_family_correct = 0
    strategic_family_count = 0
    count = 0
    squared_error = 0.0
    model.eval()
    with torch.no_grad():
        for batch, (inputs, targets, value_targets, _, _) in zip(loader.batch_sampler, loader):
            logits, values = model(*inputs)
            predictions = logits.argmax(dim=1)
            correct += int((predictions == targets).sum())
            top = logits.topk(min(5, logits.shape[1]), dim=1).indices
            top_five += int((top == targets.unsqueeze(1)).any(dim=1).sum())
            squared_error += float(((values - value_targets) ** 2).sum())
            count += len(targets)
            for sample_index, prediction in zip(batch, predictions.tolist()):
                sample = samples[sample_index]
                predicted_family = sample["candidateActionTypes"][prediction]
                family_correct += int(predicted_family == sample["actionType"])
                if sample["actionType"] in ("construct", "spawn"):
                    strategic_family_count += 1
                    strategic_family_correct += int(predicted_family == sample["actionType"])
    return {
        "samples": count,
        "policyAccuracy": correct / max(1, count),
        "policyTopFiveAccuracy": top_five / max(1, count),
        "actionFamilyAccuracy": family_correct / max(1, count),
        "strategicActionFamilyAccuracy": strategic_family_correct / max(1, strategic_family_count),
        "strategicActionSamples": strategic_family_count,
        "valueMeanSquaredError": squared_error / max(1, count),
    }


def train_model(
    samples: Sequence[dict[str, Any]],
    epochs: int,
    batch_size: int,
    learning_rate: float,
    seed: int,
    checkpoint_path: Path,
    provenance: dict[str, Any],
    model: Any | None = None,
) -> tuple[Any, dict[str, Any]]:
    torch, nn, DataLoader = _torch_modules()
    sys.path.insert(0, str(Path(__file__).parent))
    from model import TbsPolicyValueModel

    torch.manual_seed(seed)
    train_samples = [sample for sample in samples if sample["split"] == "train"]
    validation_samples = [sample for sample in samples if sample["split"] == "validation"]
    if not train_samples or not validation_samples:
        raise RuntimeError("training and validation trajectory splits must both be non-empty")
    first = samples[0]["encoding"]["tensors"]
    if model is None:
        model = TbsPolicyValueModel(
            cell_feature_count=len(first["cellFeatures"][0]),
            entity_feature_count=len(first["entityFeatures"][0]),
            candidate_feature_count=len(first["candidateFeatures"][0]),
            global_feature_count=len(first["globalFeatures"]),
        )
    optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate)
    action_counts = Counter(sample["actionType"] for sample in train_samples)
    maximum_action_count = max(action_counts.values())
    action_weights = torch.tensor([
        min(5.0, math.sqrt(maximum_action_count / action_counts.get(action_type, 1)))
        for action_type in ACTION_TYPES
    ], dtype=torch.float32)
    loader_generator = torch.Generator().manual_seed(seed)
    loader = DataLoader(
        train_samples,
        batch_size=batch_size,
        shuffle=True,
        generator=loader_generator,
        collate_fn=collate_samples,
    )
    history = []
    for epoch in range(epochs):
        model.train()
        total_policy_loss = 0.0
        total_value_loss = 0.0
        batches = 0
        for inputs, targets, value_targets, family_targets, sample_weights in loader:
            logits, values = model(*inputs)
            policy_losses = nn.functional.cross_entropy(logits, targets, reduction="none")
            effective_weights = action_weights[family_targets] * sample_weights
            policy_loss = (policy_losses * effective_weights).sum() / effective_weights.sum()
            value_losses = nn.functional.mse_loss(values, value_targets, reduction="none")
            value_loss = (value_losses * sample_weights).sum() / sample_weights.sum()
            loss = policy_loss + 0.25 * value_loss
            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            total_policy_loss += float(policy_loss.detach())
            total_value_loss += float(value_loss.detach())
            batches += 1
        history.append({
            "epoch": epoch + 1,
            "policyLoss": total_policy_loss / max(1, batches),
            "valueLoss": total_value_loss / max(1, batches),
            "validation": _classification_metrics(model, validation_samples, batch_size),
        })
    checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "architectureId": MODEL_ARCHITECTURE,
        "pilotVersion": PILOT_VERSION,
        "qualifiedForPlayerRelease": False,
        "provenance": provenance,
        "stateDict": model.state_dict(),
        "training": {
            "epochs": epochs,
            "batchSize": batch_size,
            "learningRate": learning_rate,
            "seed": seed,
            "trainSamples": len(train_samples),
            "validationSamples": len(validation_samples),
        },
    }, checkpoint_path)
    return model, {
        "history": history,
        "train": _classification_metrics(model, train_samples, batch_size),
        "validation": _classification_metrics(model, validation_samples, batch_size),
        "actionWeights": {
            action_type: float(action_weights[index])
            for index, action_type in enumerate(ACTION_TYPES)
        },
        "checkpoint": str(checkpoint_path),
        "checkpointSha256": hashlib.sha256(checkpoint_path.read_bytes()).hexdigest(),
    }


def select_objective_candidate(
    observation: dict[str, Any],
    ranked_indices: Sequence[int],
    logits: Sequence[float],
    recent_positions: dict[str, set[tuple[int, int]]] | None = None,
) -> int:
    if not _has_objective_attacker(observation["state"], observation["actorTeamId"]):
        return ranked_indices[0]
    objective_choices = []
    for index in ranked_indices:
        action = observation["candidates"][index]["action"]
        action_type = action["type"]
        if action_type not in ("attack", "move"):
            continue
        actor = observation["state"]["entities"].get(action.get("actorId", ""))
        if not actor or actor["unitTypeId"] not in OBJECTIVE_ATTACKER_TYPES:
            continue
        score = score_four_forests_candidate(
            observation, observation["candidates"][index], CANONICAL_TRAINING_PROFILE
        )
        if score > 0:
            if action_type == "move" and _coord(action["destination"]) in (
                recent_positions or {}
            ).get(action["actorId"], set()):
                score -= 10_000.0
            objective_choices.append((score, logits[index], index))
    return max(objective_choices)[2] if objective_choices else ranked_indices[0]


def select_opening_candidate(
    observation: dict[str, Any],
    logits: Sequence[float],
) -> int | None:
    choices = []
    for index, candidate in enumerate(observation["candidates"]):
        if candidate["action"]["type"] not in ("construct", "spawn"):
            continue
        score = score_four_forests_candidate(
            observation, candidate, CANONICAL_TRAINING_PROFILE
        )
        if score >= 20_000.0:
            choices.append((score, logits[index], index))
    return max(choices)[2] if choices else None


class TorchPolicy:
    def __init__(self, model: Any, objective_top_k: int = 1) -> None:
        self.model = model.eval()
        self.torch, _, _ = _torch_modules()
        self.objective_top_k = objective_top_k
        self.recent_positions: dict[str, deque[tuple[int, int]]] = {}

    def reset_episode(self) -> None:
        self.recent_positions.clear()

    def choose(self, encoding: dict[str, Any], observation: dict[str, Any] | None = None) -> int:
        sample = {"encoding": encoding, "targetIndex": 0, "valueTarget": 0, "actionType": "end-turn"}
        inputs, _, _, _, _ = collate_samples([sample])
        with self.torch.no_grad():
            logits, _ = self.model(*inputs)
        ranked = logits[0].topk(min(self.objective_top_k, logits.shape[1])).indices.tolist()
        if observation is None or self.objective_top_k == 1:
            return int(ranked[0])
        logit_values = logits[0].tolist()
        opening_index = select_opening_candidate(observation, logit_values)
        if opening_index is not None:
            return int(opening_index)
        objective_indices = []
        for index, candidate in enumerate(observation["candidates"]):
            action = candidate["action"]
            if action["type"] not in ("attack", "move"):
                continue
            actor = observation["state"]["entities"].get(action.get("actorId", ""))
            if actor and actor["unitTypeId"] in OBJECTIVE_ATTACKER_TYPES:
                objective_indices.append(index)
        rerank_indices = list(dict.fromkeys(ranked + objective_indices))
        selected = select_objective_candidate(
            observation,
            rerank_indices,
            logit_values,
            {entity_id: set(positions) for entity_id, positions in self.recent_positions.items()},
        )
        action = observation["candidates"][selected]["action"]
        actor = observation["state"]["entities"].get(action.get("actorId", ""))
        if action["type"] in ("attack", "move") and actor and actor.get("position"):
            positions = self.recent_positions.setdefault(actor["id"], deque(maxlen=64))
            positions.append(_coord(actor["position"]))
        return int(selected)


def load_model(checkpoint_path: Path, encoding: dict[str, Any], provenance: dict[str, Any]) -> Any:
    torch, _, _ = _torch_modules()
    sys.path.insert(0, str(Path(__file__).parent))
    from model import TbsPolicyValueModel

    tensors = encoding["tensors"]
    model = TbsPolicyValueModel(
        cell_feature_count=len(tensors["cellFeatures"][0]),
        entity_feature_count=len(tensors["entityFeatures"][0]),
        candidate_feature_count=len(tensors["candidateFeatures"][0]),
        global_feature_count=len(tensors["globalFeatures"]),
    )
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    if checkpoint.get("architectureId") != MODEL_ARCHITECTURE:
        raise RuntimeError("checkpoint architecture does not match the Four Forests pilot")
    if checkpoint.get("provenance") != provenance:
        raise RuntimeError("checkpoint provenance does not match the current Four Forests identity")
    model.load_state_dict(checkpoint["stateDict"])
    return model.eval()


def load_trajectory_samples(path: Path) -> list[dict[str, Any]]:
    with gzip.open(path, "rt", encoding="utf-8") as source:
        return [json.loads(line) for line in source if line.strip()]


def evaluate_model(
    client: TrainingEnvironmentClient,
    model: Any,
    pairs: int,
    seed: int,
    opponent_policy: str,
    objective_top_k: int = 1,
    scripted_profiles: Sequence[str] = PROFILES,
) -> dict[str, Any]:
    episodes: list[EpisodeSummary] = []
    policy = TorchPolicy(model, objective_top_k)
    for pair in range(pairs):
        scenario_seed = seed + pair
        scripted_profile = (
            scripted_profiles[pair % len(scripted_profiles)]
            if opponent_policy == "scripted"
            else "random"
        )
        for model_team in TEAM_IDS:
            policies = {
                "orange": "model" if model_team == "orange" else scripted_profile,
                "purple": "model" if model_team == "purple" else scripted_profile,
            }
            episode, _ = play_episode(
                client,
                f"evaluate-{opponent_policy}-{pair}-{model_team}",
                scenario_seed,
                policies,
                {
                    # The opponent receives the same scenario stream after seats swap.
                    "orange": random.Random(scenario_seed * 2 + 102),
                    "purple": random.Random(scenario_seed * 2 + 102),
                },
                model_policy=policy,
            )
            episodes.append(episode)
    aggregate = _aggregate_episodes(episodes)
    model_outcomes: Counter[str] = Counter()
    by_seat = {team: Counter() for team in TEAM_IDS}
    for episode in episodes:
        model_team = "orange" if episode.orange_policy == "model" else "purple"
        result = "draw" if episode.winner is None else ("win" if episode.winner == model_team else "loss")
        model_outcomes[result] += 1
        by_seat[model_team][result] += 1
    aggregate["modelOutcomes"] = dict(model_outcomes)
    aggregate["modelOutcomesBySeat"] = {team: dict(values) for team, values in by_seat.items()}
    aggregate["inference"] = {
        "objectivePolicyVersion": OBJECTIVE_POLICY_VERSION,
        "objectiveTopK": objective_top_k,
        "canonicalOpeningGuardrail": objective_top_k > 1,
        "considersAllLegalObjectiveAttackerActions": objective_top_k > 1,
    }
    return aggregate


def _outcome_score(outcomes: dict[str, int]) -> float:
    games = sum(outcomes.values())
    return (outcomes.get("win", 0) + 0.5 * outcomes.get("draw", 0)) / max(1, games)


def evaluation_quality(evaluation: dict[str, Any]) -> dict[str, Any]:
    outcomes = evaluation["modelOutcomes"]
    games = sum(outcomes.values())
    seat_scores = {
        team: _outcome_score(evaluation["modelOutcomesBySeat"].get(team, {}))
        for team in TEAM_IDS
    }
    return {
        "score": _outcome_score(outcomes),
        "minimumSeatScore": min(seat_scores.values()),
        "seatScores": seat_scores,
        "winRate": outcomes.get("win", 0) / max(1, games),
        "drawRate": outcomes.get("draw", 0) / max(1, games),
        "selectionKey": [
            min(seat_scores.values()),
            _outcome_score(outcomes),
            outcomes.get("win", 0) / max(1, games),
            -outcomes.get("draw", 0) / max(1, games),
        ],
    }


def release_readiness(evaluation: dict[str, Any]) -> dict[str, Any]:
    quality = evaluation_quality(evaluation)
    blockers: list[str] = []
    if quality["drawRate"] > 0.25:
        blockers.append("scripted draw rate exceeds the provisional 25% release gate")
    for team, score in quality["seatScores"].items():
        if score < 0.5:
            blockers.append(f"{team} scripted score is below the provisional 50% seat floor")
    return {
        "decision": "needs-more-training" if blockers else "ready-for-expanded-qualification",
        "blockers": blockers,
        **quality,
    }


def _wilson_lower_bound(successes: int, trials: int, z_score: float = 1.96) -> float:
    if trials == 0:
        return 0.0
    proportion = successes / trials
    z_squared = z_score * z_score
    denominator = 1.0 + z_squared / trials
    center = proportion + z_squared / (2.0 * trials)
    margin = z_score * math.sqrt(
        (proportion * (1.0 - proportion) + z_squared / (4.0 * trials)) / trials
    )
    return (center - margin) / denominator


def qualification_readiness(
    evaluation: dict[str, Any],
    minimum_pairs: int = 96,
) -> dict[str, Any]:
    quality = evaluation_quality(evaluation)
    games = evaluation["games"]
    expected_games = minimum_pairs * len(TEAM_IDS)
    blockers: list[str] = []
    if games < expected_games:
        blockers.append(
            f"qualification requires at least {expected_games} paired-seat games"
        )
    if not evaluation.get("inference", {}).get(
        "considersAllLegalObjectiveAttackerActions", False
    ):
        blockers.append("the qualified policy must include the complete objective-action guardrail")
    if not evaluation.get("inference", {}).get("canonicalOpeningGuardrail", False):
        blockers.append("the qualified policy must include the canonical opening guardrail")
    if quality["drawRate"] > 0.10:
        blockers.append("scripted draw rate exceeds the 10% qualification ceiling")
    if quality["score"] < 0.60:
        blockers.append("scripted score is below the 60% qualification floor")
    seat_win_lower_bounds: dict[str, float] = {}
    for team in TEAM_IDS:
        outcomes = evaluation["modelOutcomesBySeat"].get(team, {})
        trials = sum(outcomes.values())
        lower_bound = _wilson_lower_bound(outcomes.get("win", 0), trials)
        seat_win_lower_bounds[team] = lower_bound
        if quality["seatScores"][team] < 0.55:
            blockers.append(f"{team} scripted score is below the 55% qualification floor")
        if lower_bound < 0.50:
            blockers.append(
                f"{team} win-rate 95% confidence lower bound is below 50%"
            )
    capital_finishes = evaluation.get("finishReasons", {}).get("capital", 0)
    capital_finish_rate = capital_finishes / max(1, games)
    if capital_finish_rate < 0.90:
        blockers.append("capital destruction accounts for less than 90% of qualification games")
    completed_buildouts = 0
    forbidden_production = 0
    profile_outcomes = {
        team: {profile: Counter() for profile in PROFILES}
        for team in TEAM_IDS
    }
    for episode in evaluation.get("episodes", []):
        model_team = "orange" if episode["orange_policy"] == "model" else "purple"
        opponent_profile = (
            episode["purple_policy"] if model_team == "orange" else episode["orange_policy"]
        )
        if opponent_profile in PROFILES:
            winner = episode.get("winner")
            result = "draw" if winner is None else ("win" if winner == model_team else "loss")
            profile_outcomes[model_team][opponent_profile][result] += 1
        production = episode["produced_counts"].get(model_team, {})
        completed_buildouts += int(production.get("michaelJackson", 0) > 0)
        forbidden_production += production.get("port", 0) + production.get("sub", 0)
    buildout_rate = completed_buildouts / max(1, games)
    if buildout_rate < 0.95:
        blockers.append("the intended Michael Jackson buildout completed in less than 95% of games")
    if forbidden_production > 0:
        blockers.append("the model produced a port or submarine during qualification")
    profile_scores: dict[str, dict[str, float]] = {team: {} for team in TEAM_IDS}
    profile_win_lower_bounds: dict[str, dict[str, float]] = {team: {} for team in TEAM_IDS}
    minimum_profile_games = minimum_pairs // len(PROFILES)
    for team in TEAM_IDS:
        for profile in PROFILES:
            outcomes = profile_outcomes[team][profile]
            trials = sum(outcomes.values())
            score = _outcome_score(outcomes)
            lower_bound = _wilson_lower_bound(outcomes.get("win", 0), trials)
            profile_scores[team][profile] = score
            profile_win_lower_bounds[team][profile] = lower_bound
            if trials < minimum_profile_games:
                blockers.append(
                    f"{team} versus {profile} has fewer than {minimum_profile_games} games"
                )
            if score < 0.50:
                blockers.append(f"{team} versus {profile} score is below 50%")
            if lower_bound < 0.40:
                blockers.append(
                    f"{team} versus {profile} win-rate 95% confidence lower bound is below 40%"
                )
    return {
        "decision": "failed" if blockers else "passed",
        "blockers": blockers,
        **quality,
        "minimumPairs": minimum_pairs,
        "games": games,
        "seatWinRateWilsonLowerBounds95": seat_win_lower_bounds,
        "capitalFinishRate": capital_finish_rate,
        "buildoutCompletionRate": buildout_rate,
        "forbiddenProductionCount": forbidden_production,
        "profileScores": profile_scores,
        "profileWinRateWilsonLowerBounds95": profile_win_lower_bounds,
    }


def _recommendation(report: dict[str, Any]) -> dict[str, Any]:
    balance = report["balance"]
    outcomes = balance["outcomes"]
    games = balance["games"]
    draws = outcomes.get("draw", 0)
    orange_wins = outcomes.get("orange", 0)
    purple_wins = outcomes.get("purple", 0)
    reasons: list[str] = []
    balance_blockers: list[str] = []
    curriculum_blockers: list[str] = []
    if orange_wins == 0 or purple_wins == 0:
        balance_blockers.append("the scripted balance suite did not demonstrate a winning path for both seats")
    if draws / max(1, games) > 0.5:
        balance_blockers.append("competent scripted play drew in more than half of paired games")
    if abs(purple_wins - orange_wins) / max(1, games) > 0.25:
        balance_blockers.append("the paired scripted suite showed a seat win-rate gap above 25 percentage points")
    training = report.get("training")
    if training:
        accuracy = training["validation"]["policyAccuracy"]
        family_accuracy = training["validation"]["actionFamilyAccuracy"]
        strategic_accuracy = training["validation"]["strategicActionFamilyAccuracy"]
        reasons.append(
            "held-out exact/action-family/strategic-family accuracy was "
            f"{accuracy:.1%}/{family_accuracy:.1%}/{strategic_accuracy:.1%}"
        )
        if family_accuracy < 0.65:
            curriculum_blockers.append("the pilot did not learn broad action families reliably")
        if strategic_accuracy < 0.65:
            curriculum_blockers.append("the pilot did not learn construction and spawn decisions reliably")
    scripted = report.get("evaluation", {}).get("scripted", {}).get("modelOutcomes", {})
    if scripted:
        total = sum(scripted.values())
        score = (scripted.get("win", 0) + 0.5 * scripted.get("draw", 0)) / max(1, total)
        reasons.append(f"model score against the scripted baseline was {score:.1%}")
        if scripted.get("win", 0) == 0:
            curriculum_blockers.append("the pilot model did not win a paired evaluation game against the scripted baseline")
        model_episodes = report["evaluation"]["scripted"]["episodes"]
        model_production = Counter()
        for episode in model_episodes:
            model_team = "orange" if episode["orange_policy"] == "model" else "purple"
            model_production.update(episode["produced_counts"][model_team])
        if model_production["michaelJackson"] + model_production["zuckerbird"] == 0:
            curriculum_blockers.append("the pilot model never completed either intended combat buildout")
        if model_production["port"] + model_production["sub"] > 0:
            curriculum_blockers.append("the pilot model selected strategically unusable port or submarine production")
    blockers = balance_blockers + curriculum_blockers
    if not training:
        decision = "revise-map-balance" if balance_blockers else "balance-suite-passed"
        training_assessment = "not-evaluated"
    else:
        decision = "revise-before-longer-training" if blockers else "proceed-to-longer-training"
        training_assessment = "curriculum-revision-needed" if curriculum_blockers else "ready-for-longer-run"
    return {
        "decision": decision,
        "balanceAssessment": "blocker-detected" if balance_blockers else "no-blocker-detected",
        "trainingAssessment": training_assessment,
        "blockers": blockers,
        "balanceBlockers": balance_blockers,
        "curriculumBlockers": curriculum_blockers,
        "evidence": reasons,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Four Forests Phase 3 training pilot")
    parser.add_argument(
        "--mode",
        choices=("balance", "continue", "evaluate", "finalize", "pilot", "qualify"),
        default="pilot",
    )
    parser.add_argument("--checkpoint", type=Path)
    parser.add_argument("--output-directory", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--seed", type=int, default=20260915)
    parser.add_argument("--balance-pairs", type=int, default=4)
    parser.add_argument("--collection-episodes", type=int, default=20)
    parser.add_argument("--epochs", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--evaluation-pairs", type=int, default=4)
    parser.add_argument("--correction-pairs", type=int, default=4)
    parser.add_argument("--correction-epochs", type=int, default=4)
    parser.add_argument("--correction-iterations", type=int, default=2)
    parser.add_argument("--correction-learning-rate", type=float, default=1e-4)
    parser.add_argument("--selection-pairs", type=int, default=4)
    parser.add_argument("--tactical-episodes", type=int, default=8)
    parser.add_argument("--objective-top-k", type=int, default=1)
    parser.add_argument("--qualification-pairs", type=int, default=96)
    parser.add_argument(
        "--correction-opponent-profile",
        choices=("mixed", *PROFILES),
        default="mixed",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if (
        args.balance_pairs < 1
        or args.collection_episodes < 2
        or args.epochs < 1
        or args.evaluation_pairs < 1
        or args.correction_pairs < 1
        or args.correction_epochs < 1
        or args.correction_iterations < 1
        or args.correction_learning_rate <= 0
        or args.selection_pairs < 1
        or args.tactical_episodes < 1
        or args.objective_top_k < 1
        or args.qualification_pairs < 1
    ):
        raise ValueError("pilot counts must be positive and collection must include at least two episodes")
    output_directory = _repository_path(args.output_directory)
    checkpoint_path = _repository_path(args.checkpoint) if args.checkpoint else None
    output_directory.mkdir(parents=True, exist_ok=True)
    with TrainingEnvironmentClient() as client:
        identity = client.reset("identity", args.seed, 1)
        identity_encoding = client.encode("identity")
        provenance = {
            "presetId": identity["presetId"],
            "presetHash": identity["presetHash"],
            "schemaVersion": identity["state"]["schemaVersion"],
            "rulesetVersion": identity["state"]["rulesetVersion"],
            "contentVersion": identity["state"]["contentVersion"],
            "environmentVersion": identity["environmentVersion"],
            "observationEncodingVersion": identity_encoding["version"],
            "candidateEncodingVersion": identity["candidateVersion"],
            "curriculumProfile": CANONICAL_TRAINING_PROFILE,
        }
        if args.mode == "qualify":
            if checkpoint_path is None:
                raise ValueError("qualify mode requires --checkpoint")
            model = load_model(checkpoint_path, identity_encoding, provenance)
            evaluation = evaluate_model(
                client,
                model,
                args.qualification_pairs,
                args.seed + 700_000,
                "scripted",
                args.objective_top_k,
            )
            readiness = qualification_readiness(evaluation, args.qualification_pairs)
            report = {
                "qualificationVersion": "four-forests-qualification@1",
                "pilotVersion": PILOT_VERSION,
                "provenance": provenance,
                "checkpoint": {
                    "path": str(checkpoint_path),
                    "sha256": hashlib.sha256(checkpoint_path.read_bytes()).hexdigest(),
                },
                "configuration": {
                    "seed": args.seed,
                    "evaluationSeed": args.seed + 700_000,
                    "pairs": args.qualification_pairs,
                    "objectiveTopK": args.objective_top_k,
                    "objectivePolicyVersion": OBJECTIVE_POLICY_VERSION,
                },
                "evaluation": evaluation,
                "qualification": readiness,
            }
            report_path = output_directory / "qualification-report.json"
            report_path.write_text(
                json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
            )
            print(json.dumps({
                "report": str(report_path),
                "qualification": readiness,
            }))
            return
        if args.mode == "continue":
            if checkpoint_path is None:
                raise ValueError("continue mode requires --checkpoint")
            source_directory = checkpoint_path.parent
            trajectory_path = source_directory / "trajectories.jsonl.gz"
            if not trajectory_path.exists():
                raise ValueError(f"continue mode requires saved trajectories: {trajectory_path}")
            source_samples = load_trajectory_samples(trajectory_path)
            source_corrections = sorted(source_directory.glob("corrections-*.jsonl.gz"))
            for correction_path in source_corrections:
                source_samples.extend(load_trajectory_samples(correction_path))
            validation_samples = [
                sample for sample in source_samples if sample["split"] == "validation"
            ]
            if not validation_samples:
                raise ValueError("continue mode requires validation trajectory samples")
            model = load_model(checkpoint_path, identity_encoding, provenance)
            tactical_samples, tactical_metadata = collect_objective_tactical_samples(
                client,
                args.tactical_episodes,
                args.seed + 350_000,
                output_directory / "objective-tactics.jsonl.gz",
            )
            combined_samples = list(source_samples) + tactical_samples
            correction_profiles = (
                PROFILES
                if args.correction_opponent_profile == "mixed"
                else (args.correction_opponent_profile,)
            )
            selection_seed = args.seed + 400_000
            baseline_selection = evaluate_model(
                client,
                model,
                args.selection_pairs,
                selection_seed,
                "scripted",
                args.objective_top_k,
                correction_profiles,
            )
            best_quality = evaluation_quality(baseline_selection)
            best_state = copy.deepcopy(model.state_dict())
            best_checkpoint_path = checkpoint_path
            best_iteration = 0
            iterations = []
            for iteration in range(args.correction_iterations):
                correction_samples, correction_metadata = collect_model_corrections(
                    client,
                    model,
                    args.correction_pairs,
                    args.seed + 450_000 + iteration * 10_000,
                    output_directory / f"aggression-corrections-{iteration + 1}.jsonl.gz",
                    correction_profiles,
                )
                combined_samples.extend(correction_samples)
                candidate_checkpoint = output_directory / f"candidate-{iteration + 1}.pt"
                model, training = train_model(
                    combined_samples,
                    args.correction_epochs,
                    args.batch_size,
                    args.correction_learning_rate,
                    args.seed + iteration + 1,
                    candidate_checkpoint,
                    provenance,
                    model,
                )
                selection = evaluate_model(
                    client,
                    model,
                    args.selection_pairs,
                    selection_seed,
                    "scripted",
                    args.objective_top_k,
                    correction_profiles,
                )
                quality = evaluation_quality(selection)
                selected = quality["selectionKey"] > best_quality["selectionKey"]
                if selected:
                    best_quality = quality
                    best_state = copy.deepcopy(model.state_dict())
                    best_checkpoint_path = candidate_checkpoint
                    best_iteration = iteration + 1
                else:
                    model.load_state_dict(best_state)
                iterations.append({
                    "iteration": iteration + 1,
                    "collection": correction_metadata,
                    "training": training,
                    "selectionEvaluation": selection,
                    "selectionQuality": quality,
                    "selectedAsBest": selected,
                })
            final_checkpoint_path = output_directory / "checkpoint.pt"
            if best_checkpoint_path.resolve() != final_checkpoint_path.resolve():
                shutil.copyfile(best_checkpoint_path, final_checkpoint_path)
            model = load_model(final_checkpoint_path, identity_encoding, provenance)
            evaluation = {
                "scripted": evaluate_model(
                    client,
                    model,
                    args.evaluation_pairs,
                    args.seed + 500_000,
                    "scripted",
                    args.objective_top_k,
                ),
                "random": evaluate_model(
                    client,
                    model,
                    args.evaluation_pairs,
                    args.seed + 600_000,
                    "random",
                    args.objective_top_k,
                ),
            }
            balance = run_balance_suite(client, args.balance_pairs, args.seed)
            report = {
                "pilotVersion": PILOT_VERSION,
                "presetId": "four-forests",
                "configuration": {
                    "mode": "continue",
                    "seed": args.seed,
                    "balancePairs": args.balance_pairs,
                    "batchSize": args.batch_size,
                    "evaluationPairs": args.evaluation_pairs,
                    "correctionPairs": args.correction_pairs,
                    "correctionEpochs": args.correction_epochs,
                    "correctionIterations": args.correction_iterations,
                    "correctionLearningRate": args.correction_learning_rate,
                    "selectionPairs": args.selection_pairs,
                    "tacticalEpisodes": args.tactical_episodes,
                    "objectiveTopK": args.objective_top_k,
                    "correctionOpponentProfile": args.correction_opponent_profile,
                },
                "provenance": provenance,
                "balance": balance,
                "source": {
                    "checkpoint": str(checkpoint_path),
                    "checkpointSha256": hashlib.sha256(checkpoint_path.read_bytes()).hexdigest(),
                    "trajectorySamples": len(source_samples),
                    "correctionFiles": [str(path) for path in source_corrections],
                },
                "objectiveTactics": tactical_metadata,
                "selection": {
                    "seed": selection_seed,
                    "baseline": baseline_selection,
                    "baselineQuality": evaluation_quality(baseline_selection),
                    "bestIteration": best_iteration,
                    "bestQuality": best_quality,
                },
                "corrections": {"iterations": iterations},
                "training": {
                    "checkpoint": str(final_checkpoint_path),
                    "checkpointSha256": hashlib.sha256(
                        final_checkpoint_path.read_bytes()
                    ).hexdigest(),
                    "validation": _classification_metrics(
                        model, validation_samples, args.batch_size
                    ),
                },
                "evaluation": evaluation,
            }
            report["recommendation"] = _recommendation(report)
            report["releaseReadiness"] = release_readiness(evaluation["scripted"])
            report_path = output_directory / "report.json"
            report_path.write_text(
                json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
            )
            print(json.dumps({
                "report": str(report_path),
                "bestIteration": best_iteration,
                "releaseReadiness": report["releaseReadiness"],
            }))
            return
        if args.mode in ("evaluate", "finalize"):
            if checkpoint_path is None:
                raise ValueError(f"{args.mode} mode requires --checkpoint")
            model = load_model(checkpoint_path, identity_encoding, provenance)
            evaluation = {
                "scripted": evaluate_model(
                    client,
                    model,
                    args.evaluation_pairs,
                    args.seed + 200_000,
                    "scripted",
                    args.objective_top_k,
                ),
                "random": evaluate_model(
                    client,
                    model,
                    args.evaluation_pairs,
                    args.seed + 300_000,
                    "random",
                    args.objective_top_k,
                ),
            }
            if args.mode == "evaluate":
                report_path = output_directory / "evaluation-report.json"
                report_path.write_text(json.dumps({
                    "pilotVersion": PILOT_VERSION,
                    "provenance": provenance,
                    "evaluation": evaluation,
                }, indent=2, sort_keys=True) + "\n", encoding="utf-8")
                print(json.dumps({"report": str(report_path)}))
                return
            trajectory_path = output_directory / "trajectories.jsonl.gz"
            if not trajectory_path.exists():
                raise ValueError(f"finalize mode requires saved trajectories: {trajectory_path}")
            samples = load_trajectory_samples(trajectory_path)
            validation_samples = [sample for sample in samples if sample["split"] == "validation"]
            if not validation_samples:
                raise ValueError("finalize mode requires validation trajectory samples")
            balance = run_balance_suite(client, args.balance_pairs, args.seed)
            torch, _, _ = _torch_modules()
            checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
            report: dict[str, Any] = {
                "pilotVersion": PILOT_VERSION,
                "presetId": "four-forests",
                "configuration": {
                    "mode": "finalize",
                    "seed": args.seed,
                    "balancePairs": args.balance_pairs,
                    "batchSize": args.batch_size,
                    "evaluationPairs": args.evaluation_pairs,
                },
                "provenance": provenance,
                "balance": balance,
                "trajectories": {
                    "path": str(trajectory_path),
                    "sha256": hashlib.sha256(trajectory_path.read_bytes()).hexdigest(),
                    "sampleCount": len(samples),
                    "validationSamples": len(validation_samples),
                },
                "training": {
                    "checkpoint": str(checkpoint_path),
                    "checkpointSha256": hashlib.sha256(checkpoint_path.read_bytes()).hexdigest(),
                    "checkpointTraining": checkpoint.get("training", {}),
                    "validation": _classification_metrics(model, validation_samples, args.batch_size),
                },
                "evaluation": evaluation,
            }
            report["recommendation"] = _recommendation(report)
            report_path = output_directory / "report.json"
            report_path.write_text(
                json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8"
            )
            print(json.dumps({
                "report": str(report_path),
                "recommendation": report["recommendation"],
                "balanceOutcomes": balance["outcomes"],
            }))
            return
        balance = run_balance_suite(client, args.balance_pairs, args.seed)
        report: dict[str, Any] = {
            "pilotVersion": PILOT_VERSION,
            "presetId": "four-forests",
            "configuration": {
                "seed": args.seed,
                "canonicalTrainingProfile": CANONICAL_TRAINING_PROFILE,
                "balancePairs": args.balance_pairs,
                "collectionEpisodes": args.collection_episodes,
                "epochs": args.epochs,
                "batchSize": args.batch_size,
                "learningRate": args.learning_rate,
                "evaluationPairs": args.evaluation_pairs,
                "correctionPairs": args.correction_pairs,
                "correctionEpochs": args.correction_epochs,
                "correctionIterations": args.correction_iterations,
                "correctionLearningRate": args.correction_learning_rate,
            },
            "balance": balance,
        }
        first_episode = balance["episodes"][0]
        report["provenance"] = provenance
        if args.mode == "pilot":
            samples, trajectory_metadata = collect_trajectories(
                client,
                args.collection_episodes,
                args.seed + 100_000,
                output_directory / "trajectories.jsonl.gz",
            )
            model, initial_training = train_model(
                samples,
                args.epochs,
                args.batch_size,
                args.learning_rate,
                args.seed,
                output_directory / "initial-checkpoint.pt",
                provenance,
            )
            combined_samples = list(samples)
            correction_iterations = []
            training = initial_training
            for iteration in range(args.correction_iterations):
                correction_samples, correction_metadata = collect_model_corrections(
                    client,
                    model,
                    args.correction_pairs,
                    args.seed + 150_000 + iteration * 10_000,
                    output_directory / f"corrections-{iteration + 1}.jsonl.gz",
                )
                combined_samples.extend(correction_samples)
                final_iteration = iteration + 1 == args.correction_iterations
                model, training = train_model(
                    combined_samples,
                    args.correction_epochs,
                    args.batch_size,
                    args.correction_learning_rate,
                    args.seed + iteration + 1,
                    output_directory / (
                        "checkpoint.pt" if final_iteration else f"correction-checkpoint-{iteration + 1}.pt"
                    ),
                    provenance,
                    model,
                )
                correction_iterations.append({
                    "iteration": iteration + 1,
                    "collection": correction_metadata,
                    "training": training,
                })
            report["trajectories"] = trajectory_metadata
            report["initialTraining"] = initial_training
            report["corrections"] = {
                "iterations": correction_iterations,
                "totalSamples": sum(
                    iteration["collection"]["sampleCount"]
                    for iteration in correction_iterations
                ),
            }
            report["training"] = training
            report["evaluation"] = {
                "scripted": evaluate_model(
                    client,
                    model,
                    args.evaluation_pairs,
                    args.seed + 200_000,
                    "scripted",
                    args.objective_top_k,
                ),
                "random": evaluate_model(
                    client,
                    model,
                    args.evaluation_pairs,
                    args.seed + 300_000,
                    "random",
                    args.objective_top_k,
                ),
            }
        report["recommendation"] = _recommendation(report)
        report_path = output_directory / "report.json"
        report_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        print(json.dumps({
            "report": str(report_path),
            "recommendation": report["recommendation"],
            "balanceOutcomes": report["balance"]["outcomes"],
            "firstEpisodeCommands": first_episode["commands"],
        }))


if __name__ == "__main__":
    main()
