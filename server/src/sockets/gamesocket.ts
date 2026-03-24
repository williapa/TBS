import { Server, Socket } from "socket.io";
import { persistJoinGame } from "../data/persist/persistJoinGame";
import { persistGameUpdate } from "../data/persist/persistGameUpdate";
import { processGameAction } from "./game/processGameAction";
import {
  GameAction,
  MapItem,
  TeamOption
} from "@TBS/common";

export const registerGameSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`player connected: ${socket.id}`);

    socket.on("joinGame", async ({ gameId }: { gameId: string }) => {
      socket.join(gameId);
      console.log("the client is listening to the game room now.");
    });

    socket.on("joinPlayer", async ({ gameId, playerId }: { gameId: string, playerId: string }) => {
      await persistJoinGame(gameId, playerId);
        console.log(`player ${playerId} joined game ${gameId}`);
        io.to(gameId).emit("playerJoined", {
          playerId
          // i don't know why the socket gets returned
          // socketId: socket.id
        });
    });

    /**
     * Game action: validate, apply, save, then broadcast new events to the room.
     * On validation failure, respond only to the sender with gameError.
     */
    socket.on(
      "gameAction",
      async (payload: {
        gameId: string;
        gameAction: GameAction;
        email: string;
        pin: string;
      }) => {
        const { gameId, gameAction, email, pin } = payload;

        if (!gameId || !gameAction || !email || !pin) {
          socket.emit("gameError", { error: "invalid payload" });
          return;
        }

        const result = await processGameAction({
          email,
          gameId,
          gameAction,
          pin,
        });

        if (!result.ok) {
          socket.emit("gameError", { error: result.error });
          return;
        }

        const { challengerMoney, creatorMoney, gameEvents, map, turnIsOver, newActiveTurn, winner, winnerEmail, loserEmail } = result as {
          ok: true;
          challengerMoney: number;
          creatorMoney: number;
          gameEvents: any[];
          map: MapItem[][];
          turnIsOver: boolean;
          newActiveTurn: string | undefined;
          winner: TeamOption | undefined;
          winnerEmail: string | undefined;
          loserEmail: string | undefined;
        };
        console.log('checking game events: ');
        console.log(gameEvents);
        try {
          await persistGameUpdate(
            gameId,
            gameEvents,
            map,
            creatorMoney,
            challengerMoney,
            turnIsOver,
            newActiveTurn,
            winner,
            winnerEmail,
            loserEmail
          );
        } catch (err: any) {
          console.error("persistGameUpdate failed:", err);
          socket.emit("gameError", {
            error: `something went wrong: ${err?.message ?? err}`,
          });
          return;
        }
        const whosTurn = winner ? undefined : turnIsOver ? newActiveTurn : email;
        io.to(gameId).emit("gameEvent", {
          challengerMoney,
          creatorMoney,
          events: gameEvents,
          mapData: map,
          activeTurn: whosTurn,
          winner,
        });
      }
    );

    socket.on("disconnect", () => {
      console.log(`player disconnected: ${socket.id}`);
    });
  });
};
