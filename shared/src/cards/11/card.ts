import type { SummoningDefinition } from "../../types.js";
import { buildAbilities } from "../../subtypeAbilities.js";

export const card: SummoningDefinition = {
  id: "11",
  name: "Eoh, Radiant Blade",
  type: "summoning",
  spellName: "EOH",
  attack: 3,
  health: 1,
  abilities: buildAbilities(["Angel"]),
  subtypes: "Angel",
  description: "My duty is small compared to the grand designs, but small duties, faithfully kept, build the greatest structures.",
};
