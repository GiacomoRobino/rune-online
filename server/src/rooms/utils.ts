import {
  Player, Card,
  SUMMONING_POOL, MEMORY_POOL, ECHO_POOL, CARD_REGISTRY,
  type CardDefinition,
} from "shared";
import { type GameContext } from "./context.js";

export function hasAbility(card: Card, keyword: string): boolean {
  if (!card.abilities) return false;
  return card.abilities.split(",").some((a) => a.trim() === keyword);
}

export function findDefinition(card: Card): CardDefinition | undefined {
  const summoning = SUMMONING_POOL.find((d) => d.id === card.id);
  if (summoning) return summoning;
  const memory = MEMORY_POOL.find((d) => d.id === card.id);
  if (memory) return memory;
  const echo = ECHO_POOL.find((d) => d.id === card.id);
  if (echo) return echo;
  const registry = CARD_REGISTRY.find((d) => d.id === card.id);
  if (registry) return registry;
  return undefined;
}

export function findCardOnAnyBattlefield(ctx: GameContext, instanceId: string): Card | undefined {
  let found: Card | undefined;
  ctx.state.players.forEach((player) => {
    const card = player.battlefield.find((c) => c.instanceId === instanceId);
    if (card) found = card;
  });
  return found;
}

export function findOwner(ctx: GameContext, instanceId: string): Player | undefined {
  let owner: Player | undefined;
  ctx.state.players.forEach((player) => {
    const card = player.battlefield.find((c) => c.instanceId === instanceId);
    if (card) owner = player;
  });
  return owner;
}

export function getOpponent(ctx: GameContext, sessionId: string): Player | undefined {
  let opponent: Player | undefined;
  ctx.state.players.forEach((player, id) => {
    if (id !== sessionId) {
      opponent = player;
    }
  });
  return opponent;
}

export function checkWinCondition(ctx: GameContext) {
  ctx.state.players.forEach((player, sessionId) => {
    if (player.health <= 0) {
      const opp = getOpponent(ctx, sessionId);
      if (opp) {
        endGame(ctx, opp.sessionId);
      }
    }
  });
}

export function endGame(ctx: GameContext, winnerId: string) {
  ctx.state.phase = "ended";
  ctx.state.winner = winnerId;
  console.log(`Game ended! Winner: ${winnerId}`);
}

export function createCard(def: CardDefinition): Card {
  const card = new Card();
  card.id = def.id;
  card.instanceId = `${def.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  card.name = def.name;
  card.cardType = def.type;

  if (def.type === "summoning") {
    card.attack = def.attack;
    card.health = def.health;
    card.maxHealth = def.health;
    card.baseAttack = def.attack;
    card.baseHealth = def.health;
    card.spellName = def.spellName;
    card.bloodCost = def.bloodCost || 0;
    card.canOverpay = def.canOverpay || false;
    card.abilities = def.abilities;
    card.subtypes = def.subtypes || "";
    card.description = def.description || "";
    if (def.effect && def.effect.type === "on_enter" && !Array.isArray(def.effect.action) && def.effect.action.type === "choose_subtype") {
      card.subtypeChoices = def.effect.action.options.join(",");
    }
  } else if (def.type === "echo") {
    card.spellName = def.spellName;
    card.bloodCost = def.bloodCost || 0;
    card.description = def.description;
    card.abilities = def.abilities;
  } else if (def.type === "memory") {
    card.spellName = def.spellName;
    card.bloodCost = def.bloodCost || 0;
    card.bloodCostX = def.bloodCostX || false;
    card.description = def.description;
  } else if (def.type === "rune") {
    card.letter = def.letter;
    card.runeType = def.runeType;
  }

  return card;
}

export function drawChaosCard(player: Player) {
  if (player.chaosDeck.length === 0) return;

  if (player.hand.length >= 10) {
    player.chaosDeck.shift();
    return;
  }

  const card = player.chaosDeck.shift();
  if (card) {
    player.hand.push(card);
  }
}

export function applyDamageToCreature(card: Card, amount: number): number {
  if (amount <= 0) return 0;

  if (card.hasAegis) {
    card.hasAegis = false;
    return 0;
  }

  card.health -= amount;
  return amount;
}
