import { describe, it, expect } from "vitest";

import { SUMMONING_POOL, ECHO_POOL, MEMORY_POOL, RUNE_POOL } from "../cards.js";
import { CARD_REGISTRY } from "../cardRegistry.js";
import type { AbilityKeyword, CardDefinition } from "../types.js";

// Valid ability keywords (mirrors the AbilityKeyword union type)
const VALID_ABILITIES: AbilityKeyword[] = [
  "skyrunner", "fury", "rage", "aegis", "defender", "duelist",
  "shadowwalker", "revenge", "shatter", "pack", "master", "veil",
  "blink", "warden", "unbounded", "bloodmaster", "lifedrinker", "deathstrike",
];

const VALID_ACTION_TYPES = [
  "damage", "heal", "draw", "buff", "destroy_rune",
  "return_to_hand", "create_copies", "search_deck", "choose_subtype",
] as const;

const ALL_POOL_CARDS: CardDefinition[] = [
  ...SUMMONING_POOL,
  ...ECHO_POOL,
  ...MEMORY_POOL,
  ...RUNE_POOL,
];

function getAbilities(card: CardDefinition): string[] {
  if (card.type === "rune") return [];
  return card.abilities ? card.abilities.split(",").filter(Boolean) : [];
}

// Discover file-based card directories via import.meta.glob
const cardModules = import.meta.glob("../cards/*/card.ts", { eager: false });
const fileBasedCardIds = Object.keys(cardModules)
  .map((path) => {
    const match = path.match(/\/cards\/(\w+)\/card\.ts$/);
    return match?.[1];
  })
  .filter((id): id is string => id !== undefined);

describe("Card data integrity", () => {
  // --- ID uniqueness ---
  describe("ID uniqueness", () => {
    it("no duplicate IDs across all pools", () => {
      const ids = ALL_POOL_CARDS.map((c) => c.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes, `duplicate IDs found: ${dupes.join(", ")}`).toEqual([]);
    });

    it("no duplicate IDs in CARD_REGISTRY", () => {
      const ids = CARD_REGISTRY.map((c) => c.id);
      const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
      expect(dupes, `duplicate IDs found: ${dupes.join(", ")}`).toEqual([]);
    });
  });

  // --- File-based cards ---
  describe("file-based cards", () => {
    it("every card directory is in CARD_REGISTRY", () => {
      const registryIds = new Set(CARD_REGISTRY.map((c) => c.id));
      for (const dir of fileBasedCardIds) {
        expect(registryIds.has(dir), `card directory "${dir}" not in CARD_REGISTRY`).toBe(true);
      }
    });
  });

  // --- Basic properties ---
  describe("basic properties", () => {
    for (const card of ALL_POOL_CARDS) {
      it(`${card.id} (${card.name}): has non-empty id and name`, () => {
        expect(card.id).toBeTruthy();
        expect(card.name).toBeTruthy();
      });
    }
  });

  // --- spellName validation ---
  describe("spellName", () => {
    const nonRuneCards = ALL_POOL_CARDS.filter((c) => c.type !== "rune");
    for (const card of nonRuneCards) {
      it(`${card.id} (${card.name}): spellName is non-empty uppercase [A-Z]+`, () => {
        expect("spellName" in card && card.spellName).toBeTruthy();
        if ("spellName" in card) {
          expect(card.spellName).toMatch(/^[A-Z]+$/);
        }
      });
    }
  });

  // --- Ability keywords ---
  describe("ability keywords", () => {
    const nonRuneCards = ALL_POOL_CARDS.filter((c) => c.type !== "rune");

    for (const card of nonRuneCards) {
      const abilities = getAbilities(card);
      if (abilities.length > 0) {
        it(`${card.id} (${card.name}): all abilities are valid keywords`, () => {
          for (const a of abilities) {
            expect(VALID_ABILITIES as string[], `unknown ability "${a}"`).toContain(a);
          }
        });
      }
    }

    // Also validate abilities inside choose_subtype effects
    for (const card of nonRuneCards) {
      if (card.type === "rune") continue;
      const effect = "effect" in card ? card.effect : undefined;
      if (effect && effect.action.type === "choose_subtype" && effect.action.abilities) {
        for (const [subtype, abilitiesStr] of Object.entries(effect.action.abilities)) {
          it(`${card.id} (${card.name}): choose_subtype "${subtype}" abilities are valid`, () => {
            const subAbilities = abilitiesStr.split(",").filter(Boolean);
            for (const a of subAbilities) {
              expect(VALID_ABILITIES as string[], `unknown ability "${a}"`).toContain(a);
            }
          });
        }
      }
    }
  });

  // --- Summoning stats ---
  describe("summoning stats", () => {
    for (const card of SUMMONING_POOL) {
      it(`${card.id} (${card.name}): attack >= 0 and health >= 1`, () => {
        expect(card.attack).toBeGreaterThanOrEqual(0);
        expect(card.health).toBeGreaterThanOrEqual(1);
      });
    }
  });

  // --- Rune validation ---
  describe("rune cards", () => {
    for (const rune of RUNE_POOL) {
      it(`${rune.id}: letter is single A-Z char`, () => {
        expect(rune.letter).toMatch(/^[A-Z]$/);
      });

      it(`${rune.id}: has valid runeType`, () => {
        expect(["standard", "stone", "blood"]).toContain(rune.runeType);
      });
    }

    it("all letters used in spellNames are available in rune pool", () => {
      const runeLetters = new Set(RUNE_POOL.map((r) => r.letter));
      const nonRuneCards = ALL_POOL_CARDS.filter((c) => c.type !== "rune");
      for (const card of nonRuneCards) {
        if ("spellName" in card) {
          for (const letter of card.spellName) {
            expect(
              runeLetters.has(letter),
              `letter "${letter}" from ${card.name}'s spellName "${card.spellName}" not in rune pool`,
            ).toBe(true);
          }
        }
      }
    });
  });

  // --- Effect type matches card type ---
  describe("effect types", () => {
    for (const card of SUMMONING_POOL) {
      if (card.effect) {
        it(`${card.id} (${card.name}): summoning effect is on_enter or on_death`, () => {
          expect(["on_enter", "on_death"]).toContain(card.effect!.type);
        });
      }
    }

    for (const card of ECHO_POOL) {
      if (card.effect) {
        it(`${card.id} (${card.name}): echo effect is ongoing`, () => {
          expect(card.effect!.type).toBe("ongoing");
        });
      }
    }

    for (const card of MEMORY_POOL) {
      it(`${card.id} (${card.name}): memory has a required effect`, () => {
        expect(card.effect).toBeDefined();
      });

      it(`${card.id} (${card.name}): memory effect is instant`, () => {
        expect(card.effect.type).toBe("instant");
      });
    }
  });

  // --- Effect action types ---
  describe("effect action types", () => {
    for (const card of ALL_POOL_CARDS) {
      if (card.type === "rune") continue;
      const effect = "effect" in card ? card.effect : undefined;
      if (effect) {
        it(`${card.id} (${card.name}): effect action type is valid`, () => {
          expect(VALID_ACTION_TYPES as readonly string[]).toContain(effect.action.type);
        });
      }
    }
  });

  // --- Pool type consistency ---
  describe("pool type consistency", () => {
    for (const card of SUMMONING_POOL) {
      it(`${card.id} (${card.name}): SUMMONING_POOL entry is type "summoning"`, () => {
        expect(card.type).toBe("summoning");
      });
    }

    for (const card of ECHO_POOL) {
      it(`${card.id} (${card.name}): ECHO_POOL entry is type "echo"`, () => {
        expect(card.type).toBe("echo");
      });
    }

    for (const card of MEMORY_POOL) {
      it(`${card.id} (${card.name}): MEMORY_POOL entry is type "memory"`, () => {
        expect(card.type).toBe("memory");
      });
    }

    for (const card of RUNE_POOL) {
      it(`${card.id}: RUNE_POOL entry is type "rune"`, () => {
        expect(card.type).toBe("rune");
      });
    }
  });
});
