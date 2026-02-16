import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { CARD_REGISTRY, SUMMONING_POOL, ECHO_POOL, MEMORY_POOL, SUBTYPE_ABILITIES } from "shared";
import { ABILITY_DESCRIPTIONS } from "../data/abilityDescriptions";
import type { AbilityKeyword } from "shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../../public");

// Valid ability keywords (mirrors the AbilityKeyword union type)
const VALID_ABILITIES: AbilityKeyword[] = [
  "skyrunner", "fury", "rage", "aegis", "defender", "duelist",
  "shadowwalker", "revenge", "shatter", "pack", "master", "veil",
  "blink", "warden", "unbounded", "bloodmaster", "lifedrinker", "deathstrike",
];

// Collect all ability keywords used by any card
function getAllUsedAbilities(): Set<string> {
  const abilities = new Set<string>();
  const allCards = [...SUMMONING_POOL, ...ECHO_POOL, ...MEMORY_POOL];

  for (const card of allCards) {
    if ("abilities" in card && card.abilities) {
      for (const a of card.abilities.split(",").filter(Boolean)) {
        abilities.add(a);
      }
    }
    // Also collect abilities from SUBTYPE_ABILITIES (used by choose_subtype at runtime)
    if ("subtypes" in card && card.subtypes) {
      for (const st of card.subtypes.split(",")) {
        for (const a of SUBTYPE_ABILITIES[st] || []) {
          abilities.add(a);
        }
      }
    }
  }

  return abilities;
}

describe("Client card assets", () => {
  describe("card images", () => {
    for (const card of CARD_REGISTRY) {
      it(`card ${card.id} (${card.name}) has card.png`, () => {
        const imgPath = resolve(publicDir, "cards", card.id, "card.png");
        expect(existsSync(imgPath), `missing image at ${imgPath}`).toBe(true);
      });
    }
  });

  describe("ability descriptions", () => {
    const usedAbilities = getAllUsedAbilities();

    it("every used ability has a description", () => {
      for (const ability of usedAbilities) {
        expect(
          ability in ABILITY_DESCRIPTIONS,
          `missing description for ability "${ability}"`,
        ).toBe(true);
      }
    });

    it("no orphaned entries in ABILITY_DESCRIPTIONS", () => {
      for (const key of Object.keys(ABILITY_DESCRIPTIONS)) {
        expect(
          VALID_ABILITIES as string[],
          `"${key}" in ABILITY_DESCRIPTIONS is not a valid AbilityKeyword`,
        ).toContain(key);
      }
    });
  });
});
