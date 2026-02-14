import type { SummoningDefinition } from "../../types.js";

export const card: SummoningDefinition = {
  id: "7",
  name: "He",
  type: "summoning",
  spellName: "HE",
  attack: 1,
  health: 1,
  abilities: "skyrunner,lifedrinker",
  canOverpay: true,
  description: "Its gentle hum a prayer, its sting divine judgment.",
  effect: {
    type: "on_enter",
    action: { type: "create_copies", source: "extra_runes" },
  },
};
