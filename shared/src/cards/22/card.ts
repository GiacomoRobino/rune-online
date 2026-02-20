import type { EchoDefinition } from "../../types.js";

export const card: EchoDefinition = {
  id: "22",
  name: "River of Massacre",
  type: "echo",
  spellName: "HOPE",
  bloodCost: 4,
  abilities: "",
  description: "When a Summoning you control attacks, deal 1 damage to any target.",
  effect: {
    type: "on_attack",
    action: { type: "damage", amount: 1, target: "any" },
  },
};
