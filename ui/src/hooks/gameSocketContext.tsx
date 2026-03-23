import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import { getGameSocket } from "../utils/socket";
import { MapItem, GameAction } from "@TBS/common";


type GameSocketContextValue = {
  challengerMoney: number | null;
  creatorMoney: number | null;
  isConnected: boolean;
  joinGame: (email: string) => void;
  map: MapItem[][];
  moves: GameAction[];
  sendMove: (move: GameAction, email: string, pin: string) => void;
  setMap: React.Dispatch<React.SetStateAction<MapItem[][]>>;
  turn: string;
  clearMoves: () => void;
};

const GameSocketContext = createContext<GameSocketContextValue | null>(null);

export function GameSocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id: gameId } = useParams();
  const [isConnected, setIsConnected] = useState(false);
  const [moves, setMoves] = useState<GameAction[]>([]);
  const [map, setMap] = useState<MapItem[][]>([[]]);
  const [creatorMoney, setCreatorMoney] = useState<number | null>(null);
  const [challengerMoney, setChallengerMoney] = useState<number | null>(null);
  const [turn, setTurn] = useState<string>('');

  useEffect(() => {
    const socket = getGameSocket();

    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    // todo: server should return last valid map state to reset here
    function onGameError({ error }: { error: string }) {
      console.log('move rejected by websocket server');
      console.log(error);
      window.alert(`error with last move: ${error}`);
      // re-fetch data 
      window.location.reload();
    }

    function onMove({
      activeTurn,
      challengerMoney,
      creatorMoney,
      events,
      mapData,
      winner,
    }: {
      activeTurn: string;
      challengerMoney: number;
      creatorMoney: number;
      events: GameAction[];
      mapData: MapItem[][];
      winner?: string;
    }) {
      setMoves((prev) => [...events.reverse(), ...prev]);
      setMap(mapData);
      setChallengerMoney(challengerMoney);
      setCreatorMoney(creatorMoney);
      // test fix for winner
      if (winner) {
        setTurn('gameOver');
      } else if(activeTurn) {
        setTurn(activeTurn);
      }
    }

    function onPlayerJoined() {
      console.log("received 'onPlayerJoined' so redirect to active game view");
      window.location.reload();
    }

    if (!socket.connected) {
      socket.connect();
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("gameError", onGameError);
    socket.on("gameEvent", onMove);
    socket.on("playerJoined", onPlayerJoined);
    // todo: is this in the right place? i found it in "socket.connected"
    socket.emit("joinGame", { gameId });
    // If already connected when this provider mounts
    if (socket.connected) {
      setIsConnected(true);
    }

    return () => {
      // unused, don't need
      // socket.emit("game:leave", { gameId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("gameError", onGameError);
      socket.off("gameEvent", onMove);
      socket.off("playerJoined", onPlayerJoined);

      // Optional:
      // If this provider is the only owner, you could disconnect here.
      // But if the socket is shared more broadly across the app, leave it connected.
      socket.disconnect();
    };
  }, [gameId]);

  const joinGame = useCallback(
    (email: string) => {
      const socket = getGameSocket();
      console.log("emitting 'join game' to socket.'");
      // todo: change to "challengeAccepted"
      socket.emit("joinPlayer", { gameId, playerId: email });
    },
    [gameId]
  );

  const sendMove = useCallback(
    (gameAction: GameAction, email: string, pin: string) => {
      const socket = getGameSocket();
      // TODO: move is not right, should be gameAction, existing type
      const payload = {
        gameId, 
        gameAction,
        email,
        pin
      };

      socket.emit("gameAction", payload);

      // Optional optimistic update: I think it's better not to, for now
      // setMoves((prev) => [...prev, payload]);
    },
    [gameId]
  );

  const clearMoves = useCallback(() => {
    setMoves([]);
    setMap([[]]);
  }, []);

  const value = useMemo(
    () => ({
      isConnected,
      challengerMoney,
      creatorMoney,
      joinGame,
      map,
      moves,
      sendMove,
      setMap,
      turn,
      clearMoves,
    }),
    [
      isConnected,
      challengerMoney,
      creatorMoney,
      joinGame,
      map,
      moves,
      sendMove,
      setMap,
      turn,
      clearMoves,
    ]
  );

  return (
    <GameSocketContext.Provider value={value}>
      {children}
    </GameSocketContext.Provider>
  );
}

export function useGameSocket() {
  const context = useContext(GameSocketContext);

  if (!context) {
    throw new Error("useGameSocket must be used inside GameSocketProvider");
  }

  return context;
}
