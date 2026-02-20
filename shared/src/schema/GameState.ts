import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { Player } from "./Player.js";
import { PendingEffect } from "./PendingEffect.js";

export class GameState extends Schema {
  @type("string") phase: string = "waiting"; // "waiting"|"mulligan"|"playing"|"ended"
  @type("string") currentTurn: string = ""; // player session id
  @type("number") turnNumber: number = 0;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") winner: string = "";
  @type("string") turnStartTime: string = "";
  @type("string") turnPhase: string = "main"; // "main"|"declare_attackers"|"declare_blockers"|"combat_damage"
  @type(["string"]) declaredAttackers = new ArraySchema<string>();
  @type(["string"]) blockingAssignments = new ArraySchema<string>(); // "blockerId:attackerId" pairs
  @type("boolean") isFirstTurn: boolean = true;
  @type([PendingEffect]) pendingDeathEffects = new ArraySchema<PendingEffect>();
  @type("string") endTurnTargetCardId: string = "";
}
