import type { CardDefinition } from "./types.js";

import { card as card1 } from "./cards/1/card.js";
import { card as card2 } from "./cards/2/card.js";
import { card as card3 } from "./cards/3/card.js";
import { card as card4 } from "./cards/4/card.js";
import { card as card5 } from "./cards/5/card.js";
import { card as card6 } from "./cards/6/card.js";
import { card as card7 } from "./cards/7/card.js";
import { card as card8 } from "./cards/8/card.js";
import { card as card9 } from "./cards/9/card.js";
import { card as card10 } from "./cards/10/card.js";
import { card as card11 } from "./cards/11/card.js";

export const CARD_REGISTRY: CardDefinition[] = [card1, card2, card3, card4, card5, card6, card7, card8, card9, card10, card11];

export function getCardById(id: string): CardDefinition | undefined {
  return CARD_REGISTRY.find((c) => c.id === id);
}
