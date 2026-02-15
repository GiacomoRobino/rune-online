import type { SummoningDefinition } from "../../types.js";

export const card: SummoningDefinition = {
  id: "9",
  name: "Hope",
  type: "summoning",
  spellName: "HOPE",
  attack: 4,
  health: 4,
  abilities: "",
  subtypes: "Angel,Demon",
  description: "When you Summon Hope, you can choose if he is an Angel or a Demon. When he is not in play, he counts as both.",
  effect: {
    type: "on_enter",
    action: { type: "choose_subtype", options: ["Angel", "Demon"] },
  },
};
