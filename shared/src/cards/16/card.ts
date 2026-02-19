import type { SummoningDefinition } from "../../types.js";

export const card: SummoningDefinition = {
  id: "16",
  name: "Phoe, Bloodfire Phoenix",
  type: "summoning",
  spellName: "PHOE",
  attack: 2,
  health: 1,
  abilities: "skyrunner",
  description: "Skyrunner. When Phoe would die, if it has Blood Runes attached, cancel one and deal 2 damage to any target instead.",
  effect: {
    type: "on_death_prevention",
    condition: "has_blood_rune",
    action: { type: "damage", amount: 2, target: "any" },
  },
};
