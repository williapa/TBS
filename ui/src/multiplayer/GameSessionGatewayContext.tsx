import { createContext, useContext } from "react";
import type { GameClient } from "@TBS/application";

export const GameSessionGatewayContext = createContext<GameClient | null>(null);

export const useGameSessionGateway = () => {
  const gateway = useContext(GameSessionGatewayContext);
  if (!gateway) throw new Error("GameSessionGatewayContext provider is missing");
  return gateway;
};
