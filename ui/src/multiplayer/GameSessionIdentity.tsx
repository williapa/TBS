import { createContext, useContext } from "react";
import { GameSessionIdentityError } from "@TBS/application";
import type { GameSessionIdentity, IdentityPort } from "@TBS/application";

export { GameSessionIdentityError };
export type { GameSessionIdentity };
export type GameSessionIdentityProvider = IdentityPort;

export const GameSessionIdentityContext = createContext<GameSessionIdentity | null>(null);

export const useGameSessionIdentity = () => {
  const identity = useContext(GameSessionIdentityContext);
  if (!identity) throw new Error("GameSessionIdentityContext provider is missing");
  return identity;
};
