import type { SummoningDefinition } from "../../types.js";
import { buildAbilities } from "../../subtypeAbilities.js";

export const card: SummoningDefinition = {
  id: "15",
  name: "Eo, Angelologyst",
  type: "summoning",
  spellName: "EO",
  attack: 1,
  health: 1,
  abilities: buildAbilities(["Angel"]),
  subtypes: "Angel",
  description: "When Eo dies, search your deck for an Angel and add it to your hand, then write a Blood Rune.",
  effect: {
    type: "on_death",
    action: [
      { type: "search_deck", filter: "subtype", values: ["Angel"] },
      { type: "write_rune", runeType: "blood" },
    ],
  },
};
