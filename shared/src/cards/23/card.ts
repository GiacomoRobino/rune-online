import type { MemoryDefinition } from "../../types.js";

export const card: MemoryDefinition = {
  id: "23",
  name: "Ascension to the Sky Throne",
  type: "memory",
  spellName: "HOPE",
  bloodCost: 2,
  description: "Return target Summoning from your graveyard to the battlefield. It gains Unbounded.",
  effect: {
    type: "instant",
    action: { type: "reanimate", target: "own_graveyard_summoning" },
  },
};
