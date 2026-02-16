import type { SummoningDefinition } from "../../types.js";
import { buildAbilities } from "../../subtypeAbilities.js";

export const card: SummoningDefinition = {
  id: "10",
  name: "Hope, Shadow of Greatness",
  type: "summoning",
  spellName: "HOPE",
  attack: 4,
  health: 4,
  abilities: buildAbilities(["Angel"], "shadowwalker"),
  subtypes: "Angel",
  description: "For a moment, the shadow coalesced, mimicking a form long lost to the celestial wars.",
  effect: {
    type: "end_turn",
    action: { type: "cancel_rune", target: "self" },
  },
};
