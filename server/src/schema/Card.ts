import { Schema, type } from "@colyseus/schema";

export class Card extends Schema {
  @type("string") id: string = "";
  @type("string") instanceId: string = ""; // unique per card instance
  @type("string") name: string = "";
  @type("number") cost: number = 0;
  @type("number") attack: number = 0;
  @type("number") health: number = 0;
  @type("number") maxHealth: number = 0;
  @type("string") description: string = "";
  @type("string") cardType: string = "minion"; // "minion" | "spell"
  @type("boolean") canAttack: boolean = false; // summoning sickness
  @type("boolean") hasAttacked: boolean = false;
}
