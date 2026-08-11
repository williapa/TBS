import { createContext, useContext } from "react";
import { GameSessionGateway } from "./GameSessionGateway";

export const GameSessionGatewayContext = createContext<GameSessionGateway | null>(null);

export const useGameSessionGateway = () => {
  const gateway = useContext(GameSessionGatewayContext);
  if (!gateway) throw new Error("GameSessionGatewayContext provider is missing");
  return gateway;
};
