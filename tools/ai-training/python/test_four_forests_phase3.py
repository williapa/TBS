from __future__ import annotations

import random
import unittest
from pathlib import Path

from four_forests_phase3 import (
    CANONICAL_TRAINING_PROFILE,
    ROOT,
    _hex_distance,
    _objective_approach_distance,
    _wilson_lower_bound,
    _repository_path,
    choose_scripted_candidate,
    evaluation_quality,
    release_readiness,
    qualification_readiness,
    score_four_forests_candidate,
    select_opening_candidate,
    select_objective_candidate,
    should_collect_correction,
    strategic_correction_reason,
    training_profiles,
)


def _observation(candidates: list[dict]) -> dict:
    entities = {
        "orange-capital": {
            "id": "orange-capital", "unitTypeId": "capital", "ownerTeamId": "orange",
            "position": {"q": -2, "r": 1}, "health": {"current": 100, "maximum": 100},
        },
        "orange-leader": {
            "id": "orange-leader", "unitTypeId": "leader", "ownerTeamId": "orange",
            "position": {"q": -1, "r": 1}, "health": {"current": 100, "maximum": 100},
        },
        "purple-capital": {
            "id": "purple-capital", "unitTypeId": "capital", "ownerTeamId": "purple",
            "position": {"q": 2, "r": -1}, "health": {"current": 100, "maximum": 100},
        },
    }
    cells = {}
    for q in range(-2, 3):
        for r in range(-1, 2):
            cells[f"{q},{r}"] = {
                "position": {"q": q, "r": r}, "terrainTypeId": "forest",
            }
    return {
        "actorTeamId": "orange",
        "candidates": candidates,
        "state": {
            "entities": entities,
            "board": {"cells": cells},
            "objectives": [
                {"type": "capital", "position": {"q": -2, "r": 1}, "controllingTeamId": "orange"},
                {"type": "capital", "position": {"q": 2, "r": -1}, "controllingTeamId": "purple"},
            ],
        },
    }


class FourForestsPolicyTest(unittest.TestCase):
    def test_repository_relative_artifact_paths_do_not_depend_on_package_working_directory(self) -> None:
        relative = Path("tools/ai-training/.tmp/example")
        self.assertEqual(_repository_path(relative), ROOT / relative)
        absolute = ROOT / "absolute-example"
        self.assertEqual(_repository_path(absolute), absolute)

    def test_training_uses_one_canonical_observable_state_policy(self) -> None:
        self.assertEqual(CANONICAL_TRAINING_PROFILE, "michael")
        self.assertEqual(training_profiles(), {"orange": "michael", "purple": "michael"})

    def test_correction_buffer_ignores_equivalent_move_ties_but_keeps_strategy_errors(self) -> None:
        candidates = [
            {"action": {"type": "move"}},
            {"action": {"type": "move"}},
            {"action": {"type": "construct"}},
            {"action": {"type": "end-turn"}},
        ]
        self.assertFalse(should_collect_correction(candidates, 0, 0))
        self.assertFalse(should_collect_correction(candidates, 0, 1))
        self.assertTrue(should_collect_correction(candidates, 0, 3))
        self.assertTrue(should_collect_correction(candidates, 2, 3))

    def test_correction_buffer_keeps_objective_movement_progress(self) -> None:
        candidates = [
            {
                "action": {
                    "type": "move",
                    "actorId": "orange-michael",
                    "destination": {"q": 0, "r": 0},
                }
            },
            {
                "action": {
                    "type": "move",
                    "actorId": "orange-michael",
                    "destination": {"q": 0, "r": 1},
                }
            },
            {
                "action": {
                    "type": "move",
                    "actorId": "orange-michael",
                    "destination": {"q": -2, "r": 0},
                }
            },
        ]
        observation = _observation(candidates)
        observation["state"]["entities"].update({
            "orange-office": {
                "id": "orange-office", "unitTypeId": "office", "ownerTeamId": "orange",
                "position": {"q": -2, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "orange-church": {
                "id": "orange-church", "unitTypeId": "church", "ownerTeamId": "orange",
                "position": {"q": -1, "r": -1}, "health": {"current": 100, "maximum": 100},
            },
            "orange-michael": {
                "id": "orange-michael", "unitTypeId": "michaelJackson", "ownerTeamId": "orange",
                "position": {"q": -1, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
        })
        self.assertEqual(strategic_correction_reason(observation, 0, 2), "objective-move")

    def test_release_readiness_requires_low_draws_and_both_seats(self) -> None:
        evaluation = {
            "modelOutcomes": {"win": 6, "draw": 2},
            "modelOutcomesBySeat": {
                "orange": {"win": 3, "draw": 1},
                "purple": {"win": 3, "draw": 1},
            },
        }
        self.assertEqual(evaluation_quality(evaluation)["drawRate"], 0.25)
        self.assertEqual(
            release_readiness(evaluation)["decision"], "ready-for-expanded-qualification"
        )

    def test_release_qualification_requires_scale_strength_and_complete_policy(self) -> None:
        episodes = []
        for index in range(192):
            model_team = "orange" if index % 2 == 0 else "purple"
            opponent_team = "purple" if model_team == "orange" else "orange"
            seat_index = index // 2
            wins = 62 if model_team == "orange" else 66
            losses = 32 if model_team == "orange" else 28
            winner = (
                model_team
                if seat_index < wins
                else (opponent_team if seat_index < wins + losses else None)
            )
            opponent_profile = "zucker" if seat_index % 2 == 0 else "michael"
            episodes.append({
                "orange_policy": "model" if model_team == "orange" else opponent_profile,
                "purple_policy": "model" if model_team == "purple" else opponent_profile,
                "winner": winner,
                "produced_counts": {
                    model_team: {"constructionWorker": 1, "office": 1, "church": 1, "michaelJackson": 1},
                },
            })
        evaluation = {
            "games": 192,
            "modelOutcomes": {"win": 128, "loss": 60, "draw": 4},
            "modelOutcomesBySeat": {
                "orange": {"win": 62, "loss": 32, "draw": 2},
                "purple": {"win": 66, "loss": 28, "draw": 2},
            },
            "finishReasons": {"capital": 188, "draw": 4},
            "inference": {
                "canonicalOpeningGuardrail": True,
                "considersAllLegalObjectiveAttackerActions": True,
            },
            "episodes": episodes,
        }
        self.assertGreater(_wilson_lower_bound(62, 96), 0.5)
        self.assertEqual(qualification_readiness(evaluation)["decision"], "passed")
        evaluation["inference"]["considersAllLegalObjectiveAttackerActions"] = False
        self.assertEqual(qualification_readiness(evaluation)["decision"], "failed")

    def test_opening_guardrail_recovers_worker_outside_model_shortlist(self) -> None:
        candidates = [
            {"action": {"type": "end-turn"}},
            {
                "action": {
                    "type": "spawn", "actorId": "orange-capital",
                    "destination": {"q": -2, "r": 0}, "unitTypeId": "leader",
                }
            },
            {
                "action": {
                    "type": "spawn", "actorId": "orange-capital",
                    "destination": {"q": -2, "r": 0}, "unitTypeId": "constructionWorker",
                }
            },
        ]
        self.assertEqual(
            select_opening_candidate(_observation(candidates), [10.0, 9.0, 1.0]),
            2,
        )

    def test_objective_reranker_prefers_progress_from_model_shortlist(self) -> None:
        candidates = [
            {"action": {"type": "end-turn"}},
            {
                "action": {
                    "type": "move",
                    "actorId": "orange-michael",
                    "destination": {"q": 0, "r": 0},
                }
            },
            {
                "action": {
                    "type": "move",
                    "actorId": "orange-michael",
                    "destination": {"q": 0, "r": 1},
                }
            },
        ]
        observation = _observation(candidates)
        observation["state"]["entities"].update({
            "orange-office": {
                "id": "orange-office", "unitTypeId": "office", "ownerTeamId": "orange",
                "position": {"q": -2, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "orange-church": {
                "id": "orange-church", "unitTypeId": "church", "ownerTeamId": "orange",
                "position": {"q": -1, "r": -1}, "health": {"current": 100, "maximum": 100},
            },
            "orange-michael": {
                "id": "orange-michael", "unitTypeId": "michaelJackson", "ownerTeamId": "orange",
                "position": {"q": -1, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
        })
        self.assertEqual(
            select_objective_candidate(observation, [0, 1, 2], [10.0, 1.0, 0.5]), 1
        )
        self.assertEqual(
            select_objective_candidate(
                observation,
                [0, 1, 2],
                [10.0, 1.0, 0.5],
                {"orange-michael": {(0, 0)}},
            ),
            2,
        )

    def test_objective_reranker_ignores_non_objective_attackers(self) -> None:
        leader_move = {
            "action": {
                "type": "move", "actorId": "orange-leader", "destination": {"q": 1, "r": 0},
            }
        }
        michael_move = {
            "action": {
                "type": "move", "actorId": "orange-michael", "destination": {"q": 0, "r": 0},
            }
        }
        observation = _observation([leader_move, michael_move])
        observation["state"]["entities"]["orange-michael"] = {
            "id": "orange-michael", "unitTypeId": "michaelJackson", "ownerTeamId": "orange",
            "position": {"q": -1, "r": 0}, "health": {"current": 100, "maximum": 100},
        }
        observation["state"]["entities"]["orange-office"] = {
            "id": "orange-office", "unitTypeId": "office", "ownerTeamId": "orange",
            "position": {"q": -2, "r": 0}, "health": {"current": 100, "maximum": 100},
        }
        observation["state"]["entities"]["orange-church"] = {
            "id": "orange-church", "unitTypeId": "church", "ownerTeamId": "orange",
            "position": {"q": -1, "r": -1}, "health": {"current": 100, "maximum": 100},
        }
        self.assertEqual(
            select_objective_candidate(observation, [0, 1], [10.0, 1.0]),
            1,
        )

    def test_post_buildout_progress_outranks_non_capital_combat(self) -> None:
        move = {
            "action": {
                "type": "move", "actorId": "orange-michael", "destination": {"q": 0, "r": 0},
            }
        }
        attack = {
            "action": {
                "type": "attack", "actorId": "orange-michael", "destination": {"q": 0, "r": 0},
                "defenderId": "purple-soldier",
            }
        }
        observation = _observation([move, attack])
        observation["state"]["entities"].update({
            "orange-office": {
                "id": "orange-office", "unitTypeId": "office", "ownerTeamId": "orange",
                "position": {"q": -2, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "orange-church": {
                "id": "orange-church", "unitTypeId": "church", "ownerTeamId": "orange",
                "position": {"q": -1, "r": -1}, "health": {"current": 100, "maximum": 100},
            },
            "orange-michael": {
                "id": "orange-michael", "unitTypeId": "michaelJackson", "ownerTeamId": "orange",
                "position": {"q": -1, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "purple-soldier": {
                "id": "purple-soldier", "unitTypeId": "soldier", "ownerTeamId": "purple",
                "position": {"q": 0, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
        })
        self.assertGreater(
            score_four_forests_candidate(observation, move, "michael"),
            score_four_forests_candidate(observation, attack, "michael"),
        )

    def test_forward_blocker_attack_outranks_retreat(self) -> None:
        retreat = {
            "action": {
                "type": "move", "actorId": "orange-michael", "destination": {"q": -1, "r": 0},
            }
        }
        attack = {
            "action": {
                "type": "attack", "actorId": "orange-michael", "destination": {"q": 1, "r": 0},
                "defenderId": "purple-worker",
            }
        }
        observation = _observation([retreat, attack])
        observation["state"]["entities"].update({
            "orange-office": {
                "id": "orange-office", "unitTypeId": "office", "ownerTeamId": "orange",
                "position": {"q": -2, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "orange-church": {
                "id": "orange-church", "unitTypeId": "church", "ownerTeamId": "orange",
                "position": {"q": -1, "r": -1}, "health": {"current": 100, "maximum": 100},
            },
            "orange-michael": {
                "id": "orange-michael", "unitTypeId": "michaelJackson", "ownerTeamId": "orange",
                "position": {"q": 0, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "purple-worker": {
                "id": "purple-worker", "unitTypeId": "constructionWorker", "ownerTeamId": "purple",
                "position": {"q": 2, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
        })
        self.assertGreater(
            score_four_forests_candidate(observation, attack, "michael"),
            score_four_forests_candidate(observation, retreat, "michael"),
        )

    def test_objective_route_avoids_occupied_approach_cells(self) -> None:
        observation = _observation([])
        cells = observation["state"]["board"]["cells"]
        for position, entity_id in (((1, -1), "blocker-one"), ((1, 0), "blocker-two")):
            cells[f"{position[0]},{position[1]}"]["occupantEntityId"] = entity_id
        self.assertLess(
            _objective_approach_distance(
                observation["state"], (0, 1), (2, -1), "orange-michael", False
            ),
            _objective_approach_distance(
                observation["state"], (0, -1), (2, -1), "orange-michael", False
            ),
        )

    def test_michael_accepts_normal_combat_exposure_to_advance(self) -> None:
        direct = {
            "action": {
                "type": "move", "actorId": "orange-michael", "destination": {"q": 0, "r": 0},
            }
        }
        retreat = {
            "action": {
                "type": "move", "actorId": "orange-michael", "destination": {"q": -2, "r": 0},
            }
        }
        observation = _observation([direct, retreat])
        observation["state"]["entities"].update({
            "orange-office": {
                "id": "orange-office", "unitTypeId": "office", "ownerTeamId": "orange",
                "position": {"q": -2, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "orange-church": {
                "id": "orange-church", "unitTypeId": "church", "ownerTeamId": "orange",
                "position": {"q": -1, "r": -1}, "health": {"current": 100, "maximum": 100},
            },
            "orange-michael": {
                "id": "orange-michael", "unitTypeId": "michaelJackson", "ownerTeamId": "orange",
                "position": {"q": -1, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
            "purple-leader": {
                "id": "purple-leader", "unitTypeId": "leader", "ownerTeamId": "purple",
                "position": {"q": 1, "r": 0}, "health": {"current": 100, "maximum": 100},
            },
        })
        self.assertGreater(
            score_four_forests_candidate(observation, direct, "michael"),
            score_four_forests_candidate(observation, retreat, "michael"),
        )

    def test_hex_distance(self) -> None:
        self.assertEqual(_hex_distance((-5, 3), (5, -3)), 10)

    def test_worker_is_selected_before_other_capital_spawns(self) -> None:
        candidates = [
            {"action": {"type": "end-turn"}},
            {"action": {"type": "spawn", "actorId": "orange-capital", "destination": {"q": -2, "r": 0}, "unitTypeId": "leader"}},
            {"action": {"type": "spawn", "actorId": "orange-capital", "destination": {"q": -2, "r": 0}, "unitTypeId": "constructionWorker"}},
        ]
        observation = _observation(candidates)
        self.assertEqual(choose_scripted_candidate(observation, "zucker", random.Random(1)), 2)

    def test_soldier_is_not_given_an_offensive_move(self) -> None:
        observation = _observation([{"action": {"type": "end-turn"}}])
        observation["state"]["entities"]["orange-soldier"] = {
            "id": "orange-soldier", "unitTypeId": "soldier", "ownerTeamId": "orange",
            "position": {"q": -1, "r": 0}, "health": {"current": 100, "maximum": 100},
        }
        move = {"action": {"type": "move", "actorId": "orange-soldier", "destination": {"q": 0, "r": 0}}}
        self.assertLess(score_four_forests_candidate(observation, move, "zucker"), 0)

    def test_zero_damage_capital_attack_is_rejected_by_strategy(self) -> None:
        observation = _observation([{"action": {"type": "end-turn"}}])
        attack = {
            "action": {
                "type": "attack", "actorId": "orange-leader", "destination": {"q": 1, "r": -1},
                "defenderId": "purple-capital",
            }
        }
        self.assertLess(score_four_forests_candidate(observation, attack, "zucker"), 0)


if __name__ == "__main__":
    unittest.main()
