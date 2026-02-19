import type { EchoDefinition } from "../../types.js";

export const card: EchoDefinition = {
  id: "18",
  name: "Cauldron of Painful Knowledge",
  type: "echo",
  spellName: "EPHERO",
  bloodCost: 2,
  abilities: "",
  description: "Whenever you write a blood Rune, lose 1 life and draw a card.",
  effect: {
    type: "on_write_rune",
    runeType: "blood",
    action: [{ type: "lose_life", amount: 1 }, { type: "draw", amount: 1 }],
  },
};
