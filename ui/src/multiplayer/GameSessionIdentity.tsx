import { createContext, useContext } from "react";

export type GameSessionIdentity = { userId: string };

export interface GameSessionIdentityProvider {
  getIdentity(): Promise<GameSessionIdentity>;
}

export class GameSessionIdentityError extends Error {
  readonly code = "auth-unavailable" as const;
  readonly retryable = true;

  constructor(message: string) {
    super(message);
    this.name = "GameSessionIdentityError";
  }
}

export const GameSessionIdentityContext = createContext<GameSessionIdentity | null>(null);

export const useGameSessionIdentity = () => {
  const identity = useContext(GameSessionIdentityContext);
  if (!identity) throw new Error("GameSessionIdentityContext provider is missing");
  return identity;
};
