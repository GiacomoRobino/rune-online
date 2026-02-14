import type { EchoDefinition } from "../../types.js";

export const card: EchoDefinition = {
  id: "6",
  name: "Hope's Tiranny",
  type: "echo",
  spellName: "HOPE",
  bloodCost: 2,
  abilities: "",
  description: "All Summonings get -2/-2.",
  effect: {
    type: "ongoing",
    action: { type: "buff", attack: -2, health: -2, target: "all" },
  },
};
