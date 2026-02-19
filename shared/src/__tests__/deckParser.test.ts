import { describe, it, expect } from "vitest";

import { parseDeckList, buildDecksFromList } from "../deckParser.js";

// ── parseDeckList ──────────────────────────────────────────────────

describe("parseDeckList", () => {
  it("parses basic id:copies lines", () => {
    const result = parseDeckList("1:3\n2:2");
    expect(result).toEqual([
      { cardId: "1", copies: 3 },
      { cardId: "2", copies: 2 },
    ]);
  });

  it("defaults copies to 1 when no :copies suffix", () => {
    const result = parseDeckList("1\nrune_a");
    expect(result).toEqual([
      { cardId: "1", copies: 1 },
      { cardId: "rune_a", copies: 1 },
    ]);
  });

  it("skips empty lines and # comment lines", () => {
    const result = parseDeckList("# comment\n\n1:2\n  \n# another comment\n2:1");
    expect(result).toEqual([
      { cardId: "1", copies: 2 },
      { cardId: "2", copies: 1 },
    ]);
  });

  it("throws on non-numeric copies", () => {
    expect(() => parseDeckList("1:abc")).toThrow(/Invalid copies/);
  });

  it("throws on zero copies", () => {
    expect(() => parseDeckList("1:0")).toThrow(/Invalid copies/);
  });

  it("throws on negative copies", () => {
    expect(() => parseDeckList("1:-1")).toThrow(/Invalid copies/);
  });
});

// ── buildDecksFromList ─────────────────────────────────────────────

describe("buildDecksFromList", () => {
  it("puts summoning/echo/memory cards into chaosDeck", () => {
    // card 1 is a summoning (Oer), card 5 is an echo (Hope's Kingdom)
    const entries = parseDeckList("1:1\n5:1");
    const { chaosDeck, runesDeck } = buildDecksFromList(entries);
    expect(chaosDeck).toHaveLength(2);
    expect(runesDeck).toHaveLength(0);
  });

  it("puts registry rune cards into runesDeck", () => {
    // cards 2,3,4 are rune cards in CARD_REGISTRY
    const entries = parseDeckList("2:1\n3:1\n4:1");
    const { chaosDeck, runesDeck } = buildDecksFromList(entries);
    expect(chaosDeck).toHaveLength(0);
    expect(runesDeck).toHaveLength(3);
  });

  it("resolves RUNE_POOL ids (rune_<letter>) into runesDeck", () => {
    const entries = parseDeckList("rune_a:2\nrune_b:1");
    const { chaosDeck, runesDeck } = buildDecksFromList(entries);
    expect(chaosDeck).toHaveLength(0);
    expect(runesDeck).toHaveLength(3);
    expect(runesDeck[0]!.letter).toBe("A");
    expect(runesDeck[2]!.letter).toBe("B");
  });

  it("expands copies correctly", () => {
    const entries = parseDeckList("1:4");
    const { chaosDeck } = buildDecksFromList(entries);
    expect(chaosDeck).toHaveLength(4);
    expect(chaosDeck.every((c) => c.id === "1")).toBe(true);
  });

  it("throws on unknown card ID", () => {
    const entries = parseDeckList("unknown_card_999:1");
    expect(() => buildDecksFromList(entries)).toThrow(/Unknown card ID/);
  });
});

// ── Decklist file validation ───────────────────────────────────────

const decklistModules = import.meta.glob("../../../decklists/*.md", {
  eager: true,
  query: "?raw",
  import: "default",
});

describe("Decklist files", () => {
  const files = Object.entries(decklistModules);

  it("discovers at least one decklist file", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const [path, content] of files) {
    const name = path.split("/").pop()!;

    describe(name, () => {
      it("parses without error", () => {
        expect(() => parseDeckList(content as string)).not.toThrow();
      });

      it("builds without error", () => {
        const entries = parseDeckList(content as string);
        expect(() => buildDecksFromList(entries)).not.toThrow();
      });

      it("produces at least 1 chaos card and 1 rune card", () => {
        const entries = parseDeckList(content as string);
        const { chaosDeck, runesDeck } = buildDecksFromList(entries);
        expect(chaosDeck.length, "expected at least 1 chaos card").toBeGreaterThanOrEqual(1);
        expect(runesDeck.length, "expected at least 1 rune card").toBeGreaterThanOrEqual(1);
      });
    });
  }
});
