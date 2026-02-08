import { SummoningDefinition, EchoDefinition, MemoryDefinition, RuneDefinition, CardDefinition } from "./types.js";

// --- SUMMONING POOL ---
export const SUMMONING_POOL: SummoningDefinition[] = [
  // 2-letter (cheap)
  { id: "ox", name: "Ox", type: "summoning", spellName: "OX", attack: 2, health: 3, abilities: "", description: "A sturdy beast." },
  // 3-letter (medium)
  { id: "era", name: "Era", type: "summoning", spellName: "ERA", attack: 2, health: 3, abilities: "", description: "A timeless warrior." },
  { id: "fen", name: "Fen", type: "summoning", spellName: "FEN", attack: 1, health: 4, abilities: "defender", description: "Defender." },
  { id: "axe", name: "Axe", type: "summoning", spellName: "AXE", attack: 3, health: 2, abilities: "", description: "A sharp-edged fighter." },
  // 4-letter (strong)
  { id: "gust", name: "Gust", type: "summoning", spellName: "GUST", attack: 2, health: 2, abilities: "skyrunner,rage", description: "Skyrunner, Rage." },
  { id: "dusk", name: "Dusk", type: "summoning", spellName: "DUSK", attack: 2, health: 3, abilities: "aegis", description: "Aegis." },
  { id: "bane", name: "Bane", type: "summoning", spellName: "BANE", attack: 3, health: 2, abilities: "revenge", description: "Revenge.",
    effect: { type: "on_death", action: { type: "damage", amount: 3, target: "any" } } },
  { id: "bolt", name: "Bolt", type: "summoning", spellName: "BOLT", attack: 4, health: 1, abilities: "rage", description: "Rage." },
  // 5-letter (expensive)
  { id: "thorn", name: "Thorn", type: "summoning", spellName: "THORN", attack: 4, health: 5, abilities: "fury", description: "Fury." },
  { id: "lance", name: "Lance", type: "summoning", spellName: "LANCE", attack: 4, health: 2, abilities: "duelist", description: "Duelist." },
  { id: "wraith", name: "Wraith", type: "summoning", spellName: "WRAITH", attack: 3, health: 3, abilities: "shadowwalker", description: "Shadowwalker." },
];

// --- MEMORY POOL ---
export const MEMORY_POOL: MemoryDefinition[] = [
  { id: "mem_bolt", name: "Bolt", type: "memory", description: "Deal 3 damage to any target.",
    effect: { type: "instant", action: { type: "damage", amount: 3, target: "any" } } },
  { id: "mem_mend", name: "Mend", type: "memory", description: "Restore 4 health to your hero.",
    effect: { type: "instant", action: { type: "heal", amount: 4, target: "self" } } },
  { id: "mem_insight", name: "Insight", type: "memory", description: "Draw 2 cards from your Chaos deck.",
    effect: { type: "instant", action: { type: "draw", amount: 2 } } },
];

// --- RUNE POOL ---
// Letters used by the starter summonings/echoes: A, B, C, D, E, F, G, H, I, K, L, N, O, R, S, T, U, W, X
const STANDARD_LETTERS = ["A", "E", "R", "S", "T", "N", "O", "U", "I"];
const STONE_LETTERS = ["B", "D", "F", "G", "H", "K", "L", "W", "X"];
const BLOOD_LETTERS = ["C", "M", "P", "Q", "V", "Y", "Z"];

function makeRuneDefs(letters: string[], runeType: "standard" | "stone" | "blood"): RuneDefinition[] {
  return letters.map((letter) => ({
    id: `rune_${letter.toLowerCase()}`,
    name: `Rune of ${letter}`,
    type: "rune" as const,
    letter,
    runeType,
  }));
}

export const RUNE_POOL: RuneDefinition[] = [
  ...makeRuneDefs(STANDARD_LETTERS, "standard"),
  ...makeRuneDefs(STONE_LETTERS, "stone"),
  ...makeRuneDefs(BLOOD_LETTERS, "blood"),
];

// --- DECK GENERATION ---

export function generateChaosStarterDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];
  // 2 copies of each summoning
  for (const card of SUMMONING_POOL) {
    deck.push({ ...card });
    deck.push({ ...card });
  }
  // 2 copies of each memory
  for (const card of MEMORY_POOL) {
    deck.push({ ...card });
    deck.push({ ...card });
  }
  return deck;
}

export function generateRunesStarterDeck(): RuneDefinition[] {
  const deck: RuneDefinition[] = [];
  // 3 copies of each standard rune
  for (const rune of RUNE_POOL.filter((r) => r.runeType === "standard")) {
    deck.push({ ...rune });
    deck.push({ ...rune });
    deck.push({ ...rune });
  }
  // 2 copies of each stone rune
  for (const rune of RUNE_POOL.filter((r) => r.runeType === "stone")) {
    deck.push({ ...rune });
    deck.push({ ...rune });
  }
  // 1 copy of each blood rune
  for (const rune of RUNE_POOL.filter((r) => r.runeType === "blood")) {
    deck.push({ ...rune });
  }
  return deck;
}

// --- ECHO POOL ---
export const ECHO_POOL: EchoDefinition[] = [
  { id: "echo_arra", name: "Arra", type: "echo", spellName: "ARRA", abilities: "", description: "+1/+1 to all friendly summonings.",
    effect: { type: "ongoing", action: { type: "buff", attack: 1, health: 1, target: "all_friendly" } } },
];

// --- TEST DECKS ---

const TEST_SUMMONING: SummoningDefinition = {
  id: "art", name: "Art", type: "summoning", spellName: "ART", attack: 2, health: 2, abilities: "", description: "A living artwork.",
};

const TEST_MEMORY: MemoryDefinition = {
  id: "mem_tara", name: "Tara", type: "memory", description: "Draw 1 card from your Chaos deck.",
  effect: { type: "instant", action: { type: "draw", amount: 1 } },
};

const TEST_ECHO: EchoDefinition = ECHO_POOL.find((e) => e.id === "echo_arra")!;

export function generateTestChaosDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];
  // 10 copies of Art (summoning)
  for (let i = 0; i < 10; i++) {
    deck.push({ ...TEST_SUMMONING });
  }
  // 5 copies of Tara (memory)
  for (let i = 0; i < 5; i++) {
    deck.push({ ...TEST_MEMORY });
  }
  // 5 copies of Arra (echo)
  for (let i = 0; i < 5; i++) {
    deck.push({ ...TEST_ECHO });
  }
  return deck;
}

export function generateTestRunesDeck(): RuneDefinition[] {
  const deck: RuneDefinition[] = [];
  const testRunes = RUNE_POOL.filter((r) => ["A", "R", "T"].includes(r.letter));
  // 10 copies of each (A, R, T)
  for (const rune of testRunes) {
    for (let i = 0; i < 10; i++) {
      deck.push({ ...rune });
    }
  }
  return deck;
}

// Shuffle array (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
