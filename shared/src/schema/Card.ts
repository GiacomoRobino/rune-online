import { Schema, ArraySchema, type } from "@colyseus/schema";

export class Card extends Schema {
  @type("string") id: string = "";
  @type("string") instanceId: string = "";
  @type("string") name: string = "";
  @type("string") cardType: string = "summoning"; // "summoning"|"echo"|"memory"|"rune"

  // Summoning/Echo fields
  @type("number") attack: number = 0;
  @type("number") health: number = 0;
  @type("number") maxHealth: number = 0;
  @type("string") description: string = "";
  @type("string") spellName: string = ""; // letters needed to summon (e.g. "ERA")
  @type("string") abilities: string = ""; // comma-separated keywords
  @type("boolean") canAttack: boolean = false;
  @type("boolean") hasAttacked: boolean = false;
  @type("boolean") isTapped: boolean = false;
  @type("boolean") hasAegis: boolean = false;
  @type("number") damageMarked: number = 0;

  // Rune fields
  @type("string") runeType: string = "standard"; // "standard"|"stone"|"blood"
  @type("string") letter: string = ""; // the letter this rune provides
  @type("number") etchingCounters: number = 0; // stone runes enter with 1
  @type("string") attachedToId: string = ""; // instanceId of summoning/echo this rune is attached to

  // Runes attached to this summoning/echo
  @type(["string"]) attachedRuneIds = new ArraySchema<string>();
}
