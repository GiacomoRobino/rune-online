import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { monitor } from "@colyseus/monitor";
import express from "express";
import { GameRoom } from "./rooms/GameRoom";

const app = express();
const port = Number(process.env.PORT) || 2567;

// Colyseus monitor (for debugging)
app.use("/colyseus", monitor());

// Health check
app.get("/health", (_, res) => {
  res.send("OK");
});

const server = new Server({
  transport: new WebSocketTransport({
    server: app.listen(port),
  }),
});

// Register game room
server.define("game", GameRoom);

console.log(`🎮 Sorcery Online server running on http://localhost:${port}`);
console.log(`📊 Monitor available at http://localhost:${port}/colyseus`);
