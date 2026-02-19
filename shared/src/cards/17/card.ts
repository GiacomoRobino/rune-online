import type { MemoryDefinition } from "../../types.js";

export const card: MemoryDefinition = {
  id: "17",
  name: "Blessed River",
  type: "memory",
  spellName: "HOPE",
  bloodCost: 2,
  description: "Put an Aegis counter on each summoning you control.",
  effect: {
    type: "instant",
    action: { type: "grant_aegis", target: "all_friendly" },
  },
};
