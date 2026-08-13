import type { GameCommandPort } from "./command";
import type { GameQueryPort } from "./query";
import type { GameRealtimePort } from "./realtime";
import type { GameSessionPort } from "./session";

export interface GameClient
  extends GameSessionPort, GameQueryPort, GameCommandPort, GameRealtimePort {}

export type GameClientFactory = () => GameClient;
