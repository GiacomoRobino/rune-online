import type { SummoningDefinition } from "../../types.js";

export const card: SummoningDefinition = {
  id: "8",
  name: "Oor",
  type: "summoning",
  spellName: "OOR",
  attack: 1,
  health: 1,
  abilities: "skyrunner,defender,aegis,rage,fury,deathstrike",
  subtypes: "Angel,Demon",
  description: "I did not choose to be Harmon's voice. But choice is a luxury of those who are not destined for purpose.",
  effect: {
    type: "on_death",
    action: { type: "search_deck", filter: "subtype", values: ["Angel", "Demon"] },
  },
};
