import type { EchoDefinition } from "../../types.js";

export const card: EchoDefinition = {
  id: "5",
  name: "Hope's Kingdom",
  type: "echo",
  spellName: "HOPE",
  bloodCost: 2,
  abilities: "",
  description: "Your Summonings get +2/+2.",
  effect: {
    type: "ongoing",
    action: { type: "buff", attack: 2, health: 2, target: "all_friendly" },
  },
};
