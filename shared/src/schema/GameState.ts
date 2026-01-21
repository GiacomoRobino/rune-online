import { Schema, MapSchema, type } from "@colyseus/schema";
import { Player } from "./Player.js";

export class GameState extends Schema {
  @type("string") phase: string = "waiting"; // "waiting" | "playing" | "ended"
  @type("string") currentTurn: string = ""; // player session id
  @type("number") turnNumber: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") winner: string = "";
  @type("string") turnStartTime: string = ""; // ISO timestamp for turn timer
}
