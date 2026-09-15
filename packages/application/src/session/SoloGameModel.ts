import type { GameState } from "@TBS/game-core";
import { activateStandardGame, applyStandardAction } from "@TBS/game-rules";

import type {
  GatewayError,
  StandardActionEnvelope,
  StandardAppliedAction,
} from "../contracts";
import { MAX_ACTION_HISTORY } from "../limits";

export type SoloGame = Readonly<{
  mapName: string;
  state: GameState;
}>;

export type SoloGameState = Readonly<{
  actions: readonly StandardAppliedAction[];
  error: GatewayError | null;
  game: SoloGame | null;
}>;

export type StartSoloGameInput = Readonly<{
  initialState: GameState;
  mapName: string;
}>;

export type SoloActionResult =
  | Readonly<{ appliedAction: StandardAppliedAction; ok: true }>
  | Readonly<{ error: GatewayError; ok: false }>;

type StateListener = () => void;

const INITIAL_STATE: SoloGameState = {
  actions: [],
  error: null,
  game: null,
};

const error = (code: GatewayError["code"], message: string): GatewayError => ({
  code,
  message,
  retryable: false,
});

const rejectionMessage = (
  result: Exclude<ReturnType<typeof applyStandardAction>, { ok: true }>,
): string => result.violations.map(({ message }) => message).join("; ") || "The action is invalid";

export class SoloGameModel {
  private state: SoloGameState = INITIAL_STATE;
  private readonly listeners = new Set<StateListener>();

  readonly getState = (): SoloGameState => this.state;

  readonly subscribe = (listener: StateListener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  readonly startGame = ({ initialState, mapName }: StartSoloGameInput): void => {
    const normalizedMapName = mapName.trim();
    if (!normalizedMapName || normalizedMapName.length > 120) {
      throw error("invalid-action", "map name is invalid");
    }
    const activation = activateStandardGame(initialState);
    if (!activation.ok) throw error("invalid-action", activation.message);
    this.replaceState({
      actions: [],
      error: null,
      game: {
        mapName: normalizedMapName,
        state: activation.state,
      },
    });
  };

  readonly submitAction = (envelope: StandardActionEnvelope): SoloActionResult => {
    const game = this.state.game;
    if (!game) return this.reject("game-not-found", "No solo game is active");
    if (envelope.expectedRevision !== game.state.revision) {
      return this.reject("stale-revision", "expected revision does not match");
    }
    if (envelope.rulesetVersion !== game.state.rulesetVersion) {
      return this.reject("incompatible-data", "envelope ruleset does not match the game");
    }
    if (game.state.lifecycle.phase !== "active") {
      return this.reject("invalid-action", "the game is not active");
    }

    const actorTeamId = game.state.lifecycle.activeTeamId;
    const result = applyStandardAction(game.state, actorTeamId, envelope.action);
    if (!result.ok) return this.reject("invalid-action", rejectionMessage(result));

    const appliedAction: StandardAppliedAction = {
      protocolVersion: envelope.protocolVersion,
      actionId: envelope.actionId,
      revision: result.state.revision,
      actorTeamId,
      action: envelope.action,
      events: result.events,
    };
    this.replaceState({
      actions: [...this.state.actions, appliedAction].slice(-MAX_ACTION_HISTORY),
      error: null,
      game: { ...game, state: result.state },
    });
    return { appliedAction, ok: true };
  };

  private reject(code: GatewayError["code"], message: string): SoloActionResult {
    const failure = error(code, message);
    this.replaceState({ ...this.state, error: failure });
    return { error: failure, ok: false };
  }

  private replaceState(state: SoloGameState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
