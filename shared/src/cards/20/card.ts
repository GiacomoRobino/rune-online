import type { MemoryDefinition } from "../../types.js";

export const card: MemoryDefinition = {
  id: "20",
  name: "Spark of Corruption",
  type: "memory",
  spellName: "HARMON",
  bloodCost: 2,
  description: "Target Summoning gains Demon (it has Fury, Rage and Revenge).",
  effect: {
    type: "instant",
    action: { type: "grant_subtype", subtype: "Demon", target: "any_summoning" },
  },
};
