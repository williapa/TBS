import type { CreatedGame, CreateGameInput, GameSession, JoinIntent } from "../contracts";

export interface GameSessionPort {
  createGame(input: CreateGameInput): Promise<CreatedGame>;
  joinGame(inviteToken: string, intent: JoinIntent, displayName: string): Promise<GameSession>;
}
