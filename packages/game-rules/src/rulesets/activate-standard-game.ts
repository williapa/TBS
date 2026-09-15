import { teamId, type GameState } from "@TBS/game-core";

import { STANDARD_CONTENT_VERSION } from "./standard";
import { isSupportedStandardRulesetVersion } from "./standard-versions";

export type StandardGameActivationFailure = Readonly<{
  ok: false;
  code: "invalid-initial-state" | "incompatible-content" | "incompatible-ruleset" | "invalid-teams";
  message: string;
}>;

export type StandardGameActivationResult =
  | Readonly<{ ok: true; state: GameState }>
  | StandardGameActivationFailure;

const reject = (
  code: StandardGameActivationFailure["code"],
  message: string,
): StandardGameActivationFailure => ({ ok: false, code, message });

/** Activates a current standard setup with the production purple-first semantics. */
export const activateStandardGame = (state: GameState): StandardGameActivationResult => {
  if (state.revision !== 0 || state.turn.number !== 0 || state.lifecycle.phase !== "waiting") {
    return reject("invalid-initial-state", "standard games require a waiting revision-zero, turn-zero state");
  }
  if (!isSupportedStandardRulesetVersion(state.rulesetVersion)) {
    return reject("incompatible-ruleset", `unsupported standard ruleset: ${state.rulesetVersion}`);
  }
  if (state.contentVersion !== STANDARD_CONTENT_VERSION) {
    return reject("incompatible-content", `new standard games require ${STANDARD_CONTENT_VERSION}`);
  }
  const orange = teamId("orange");
  const purple = teamId("purple");
  if (!state.teams[orange] || !state.teams[purple] || Object.keys(state.teams).length !== 2) {
    return reject("invalid-teams", "standard games require exactly the orange and purple teams");
  }
  return {
    ok: true,
    state: {
      ...state,
      lifecycle: { phase: "active", activeTeamId: purple },
      turn: { number: 1 },
    },
  };
};
