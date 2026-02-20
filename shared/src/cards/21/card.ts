import type { MemoryDefinition } from "../../types.js";

export const card: MemoryDefinition = {
  id: "21",
  name: "Burning Nightmare",
  type: "memory",
  spellName: "EPHERO",
  bloodCost: 3,
  description: "For each life point you lost this turn, create a 1/1 Nightmare Mouse token with Skyrunner.",
  effect: {
    type: "instant",
    action: { type: "create_token", tokenName: "Nightmare Mouse", attack: 1, health: 1, abilities: "skyrunner", count: "life_lost_this_turn" },
  },
};
