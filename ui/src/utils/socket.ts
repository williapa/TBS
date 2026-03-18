// socket.ts
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getGameSocket(): Socket {
  if (!socket) {
    socket = io("http://localhost:8420", {
      autoConnect: false,
      transports: ["websocket"],
    });
  }

  return socket;
}