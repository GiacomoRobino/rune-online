import { Schema, ArraySchema, type } from "@colyseus/schema";
import { Card } from "./Card.js";

export class Player extends Schema {
  @type("string") id: string = "";
  @type("string") sessionId: string = "";
  @type("string") nickname: string = "";
  @type("number") health: number = 30;
  @type("number") maxHealth: number = 30;
  @type("number") mana: number = 0;
  @type("number") maxMana: number = 0;
  @type([Card]) hand = new ArraySchema<Card>();
  @type([Card]) battlefield = new ArraySchema<Card>();
  @type([Card]) deck = new ArraySchema<Card>(); // Note: In production, hide deck from opponent
  @type("boolean") connected: boolean = true;
}
