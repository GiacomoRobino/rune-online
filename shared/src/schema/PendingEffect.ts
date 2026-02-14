import { Schema, type } from "@colyseus/schema";

export class PendingEffect extends Schema {
  @type("string") id: string = "";
  @type("string") ownerSessionId: string = "";
  @type("string") effectType: string = "";      // "death_damage" | "search_deck"
  @type("number") damageAmount: number = 0;
  @type("string") cardName: string = "";
  @type("string") searchFilter: string = "";    // comma-separated subtypes
}
