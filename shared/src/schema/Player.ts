import { Schema, ArraySchema, type } from "@colyseus/schema";
import { Card } from "./Card.js";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") sessionId: string = "";
  @type("string") nickname: string = "";
  @type("number") health: number = 20;
  @type("number") maxHealth: number = 20;
  @type([Card]) hand = new ArraySchema<Card>();
  @type([Card]) battlefield = new ArraySchema<Card>();
  @type([Card]) chaosDeck = new ArraySchema<Card>();
  @type([Card]) runesDeck = new ArraySchema<Card>();
  @type([Card]) runeField = new ArraySchema<Card>();
  @type([Card]) graveyard = new ArraySchema<Card>();
  @type("number") runesWrittenThisTurn: number = 0;
  @type("number") maxRuneWritesThisTurn: number = 0;
  @type("boolean") connected: boolean = true;
}
