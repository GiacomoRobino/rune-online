import type { CardDefinition } from "./types.js";

import { card as card1 } from "./cards/1/card.js";
import { card as card2 } from "./cards/2/card.js";
import { card as card3 } from "./cards/3/card.js";
import { card as card4 } from "./cards/4/card.js";

export const CARD_REGISTRY: CardDefinition[] = [card1, card2, card3, card4];

export function getCardById(id: string): CardDefinition | undefined {
  return CARD_REGISTRY.find((c) => c.id === id);
}
