from __future__ import annotations

import random
import unittest

from four_forests_phase3 import (
    CANONICAL_TRAINING_PROFILE,
    _hex_distance,
    choose_scripted_candidate,
    score_four_forests_candidate,
    should_collect_correction,
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
