import type { SummoningDefinition } from "../../types.js";
import { buildAbilities } from "../../subtypeAbilities.js";

export const card: SummoningDefinition = {
  id: "12",
  name: "Ephero, the Red Storm",
  type: "summoning",
  spellName: "EPHERO",
  attack: 0,
  health: 0,
  abilities: buildAbilities(["Demon"], "bloodmaster", "devour", "ephemeral"),
  subtypes: "Demon",
};
