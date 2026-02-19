import type { MemoryDefinition } from "../../types.js";

export const card: MemoryDefinition = {
  id: "19",
  name: "Unraveling Dance",
  type: "memory",
  spellName: "HOREE",
  bloodCostX: true,
  description: "Deal X damage to X Summonings. Gain life equal to the total damage dealt.",
  effect: {
    type: "instant",
    action: { type: "damage_x", target: "any_summoning", healCaster: true },
  },
};
