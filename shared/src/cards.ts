import { CardDefinition } from "./types.js";

// Starter card pool for MVP
export const CARD_POOL: CardDefinition[] = [
  // Basic minions
  {
    id: "goblin",
    name: "Goblin Scout",
    cost: 1,
    attack: 1,
    health: 2,
    type: "minion",
    description: "A sneaky little goblin.",
  },
  {
    id: "soldier",
    name: "Footman",
    cost: 2,
    attack: 2,
    health: 3,
    type: "minion",
    description: "A loyal soldier.",
  },
  {
    id: "knight",
    name: "Knight",
    cost: 3,
    attack: 3,
    health: 4,
    type: "minion",
    description: "A noble knight.",
  },
  {
    id: "ogre",
    name: "Ogre Brute",
    cost: 4,
    attack: 4,
    health: 5,
    type: "minion",
    description: "Big and dumb.",
  },
  {
    id: "dragon",
    name: "Young Dragon",
    cost: 6,
    attack: 5,
    health: 6,
    type: "minion",
    description: "A fearsome young dragon.",
  },

  // Minions with effects
  {
    id: "healer",
    name: "Field Medic",
    cost: 2,
    attack: 1,
    health: 3,
    type: "minion",
    description: "Battlecry: Restore 2 health to your hero.",
    effect: {
      type: "battlecry",
      action: { type: "heal", amount: 2, target: "self" },
    },
  },
  {
    id: "bomber",
    name: "Mad Bomber",
    cost: 3,
    attack: 2,
    health: 2,
    type: "minion",
    description: "Battlecry: Deal 2 damage to a random enemy.",
    effect: {
      type: "battlecry",
      action: { type: "damage", amount: 2, target: "random_enemy" },
    },
  },

  // Spells
  {
    id: "fireball",
    name: "Fireball",
    cost: 4,
    attack: 0,
    health: 0,
    type: "spell",
    description: "Deal 6 damage to an enemy.",
    effect: {
      type: "spell",
      action: { type: "damage", amount: 6, target: "enemy" },
    },
  },
  {
    id: "heal",
    name: "Holy Light",
    cost: 2,
    attack: 0,
    health: 0,
    type: "spell",
    description: "Restore 6 health to your hero.",
    effect: {
      type: "spell",
      action: { type: "heal", amount: 6, target: "self" },
    },
  },
  {
    id: "arcane_intellect",
    name: "Arcane Intellect",
    cost: 3,
    attack: 0,
    health: 0,
    type: "spell",
    description: "Draw 2 cards.",
    effect: {
      type: "spell",
      action: { type: "draw", amount: 2 },
    },
  },
];

// Generate a starter deck (2 copies of each card)
export function generateStarterDeck(): CardDefinition[] {
  const deck: CardDefinition[] = [];
  for (const card of CARD_POOL) {
    deck.push({ ...card });
    deck.push({ ...card });
  }
  return deck;
}

// Shuffle array in place (Fisher-Yates)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
