import type { CardDefinition, RuneDefinition } from "./types.js";
import { getCardById } from "./cardRegistry.js";
import { RUNE_POOL } from "./cards.js";

export interface DeckListEntry {
  cardId: string;
  copies: number;
}

export function parseDeckList(content: string): DeckListEntry[] {
  const entries: DeckListEntry[] = [];
  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const parts = line.split(":");
    const cardId = parts[0]!.trim();
    const copies = parts.length > 1 ? parseInt(parts[1]!, 10) : 1;
    if (isNaN(copies) || copies < 1) {
      throw new Error(`Invalid copies for card "${cardId}": ${parts[1]}`);
    }
    entries.push({ cardId, copies });
  }
  return entries;
}

export function buildDecksFromList(entries: DeckListEntry[]): {
  chaosDeck: CardDefinition[];
  runesDeck: RuneDefinition[];
} {
  const chaosDeck: CardDefinition[] = [];
  const runesDeck: RuneDefinition[] = [];

  for (const { cardId, copies } of entries) {
    // Try CARD_REGISTRY first
    const registryCard = getCardById(cardId);
    if (registryCard) {
      if (registryCard.type === "rune") {
        for (let i = 0; i < copies; i++) {
          runesDeck.push({ ...registryCard });
        }
      } else {
        for (let i = 0; i < copies; i++) {
          chaosDeck.push({ ...registryCard });
        }
      }
      continue;
    }

    // Try RUNE_POOL (for rune_<letter> IDs)
    const poolRune = RUNE_POOL.find((r) => r.id === cardId);
    if (poolRune) {
      for (let i = 0; i < copies; i++) {
        runesDeck.push({ ...poolRune });
      }
      continue;
    }

    throw new Error(`Unknown card ID: "${cardId}"`);
  }

  return { chaosDeck, runesDeck };
}
