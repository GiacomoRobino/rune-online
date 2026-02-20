import { Client } from "@colyseus/core";
import { SUBTYPE_ABILITIES } from "shared";
import { type GameContext } from "./context.js";
import { hasAbility, findDefinition, checkWinCondition } from "./utils.js";
import { validateRuneSpelling, detachRuneFromCurrent } from "./runeHandlers.js";
import { sacrificeRunelessSummonings, handleOnDeathEffect } from "./deathCleanup.js";
import { handleOnEnterEffect, handleMemoryEffect, handleDamageXEffect } from "./effects.js";
import { recalculateOngoingEffects } from "./ongoingEffects.js";

const MAX_BATTLEFIELD_SIZE = 7;

export function handleSummon(ctx: GameContext, client: Client, message: { cardId: string; runeIds: string[]; chosenSubtype?: string; sacrificeTargetId?: string }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.currentTurn !== client.sessionId) return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  // Find card in hand
  const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
  if (cardIndex === -1) return;

  const card = player.hand.at(cardIndex);
  if (!card || card.cardType !== "summoning") return;

  // Check battlefield limit
  if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return;

  // Validate rune spelling
  if (!validateRuneSpelling(player, card.spellName, message.runeIds, card.bloodCost, card.canOverpay)) return;

  // Validate devour before any state mutation
  if (hasAbility(card, "devour")) {
    if (!message.sacrificeTargetId) return;
    const victimExists = player.battlefield.some((c) => c.instanceId === message.sacrificeTargetId && c.cardType === "summoning");
    if (!victimExists) return;
  }

  // Detach runes from old summonings, then attach to new one
  for (const runeId of message.runeIds) {
    detachRuneFromCurrent(player, runeId);
    const rune = player.runeField.find((r) => r.instanceId === runeId);
    if (rune) {
      rune.attachedToId = card.instanceId;
      card.attachedRuneIds.push(runeId);
    }
  }

  // Remove from hand, place on battlefield
  player.hand.splice(cardIndex, 1);
  card.canAttack = hasAbility(card, "rage");
  card.hasAttacked = false;
  card.isTapped = false;

  // Aegis
  if (hasAbility(card, "aegis")) {
    card.hasAegis = true;
  }

  // Handle choose_subtype before placing on battlefield
  const summonDef = findDefinition(card);
  if (summonDef && 'effect' in summonDef && summonDef.effect &&
      summonDef.effect.type === "on_enter" && !Array.isArray(summonDef.effect.action) && summonDef.effect.action.type === "choose_subtype") {
    const action = summonDef.effect.action;
    if (!message.chosenSubtype || !action.options.includes(message.chosenSubtype)) return;
    card.subtypes = message.chosenSubtype;
    // Apply abilities granted by the chosen subtype
    const subtypeAbilities = SUBTYPE_ABILITIES[message.chosenSubtype];
    if (subtypeAbilities) {
      const extra = subtypeAbilities.join(",");
      card.abilities = card.abilities ? `${card.abilities},${extra}` : extra;
      // Re-evaluate canAttack in case rage was granted
      card.canAttack = hasAbility(card, "rage");
      if (hasAbility(card, "aegis")) card.hasAegis = true;
    }
  }

  player.battlefield.push(card);

  // Handle devour: sacrifice a friendly summoning and steal its runes
  if (hasAbility(card, "devour")) {
    const victimIndex = player.battlefield.findIndex((c) => c.instanceId === message.sacrificeTargetId && c.cardType === "summoning" && c.instanceId !== card.instanceId);
    const victim = player.battlefield.at(victimIndex);
    if (victimIndex === -1 || !victim) return; // should not happen — validated above

    // Transfer all runes from victim to card
    for (let i = 0; i < victim.attachedRuneIds.length; i++) {
      const runeId = victim.attachedRuneIds.at(i);
      if (!runeId) continue;
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (rune) {
        rune.attachedToId = card.instanceId;
        card.attachedRuneIds.push(runeId);
      }
    }
    victim.attachedRuneIds.clear();

    // Remove victim from battlefield, fire death effects, send to graveyard
    player.battlefield.splice(victimIndex, 1);
    handleOnDeathEffect(ctx, victim, player);
    player.graveyard.push(victim);
  }

  // Old summonings may have lost runes -> sacrifice
  sacrificeRunelessSummonings(ctx, player);

  // Handle on_enter effects
  handleOnEnterEffect(ctx, card, player);

  recalculateOngoingEffects(ctx);
  checkWinCondition(ctx);

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.state.turnPhase = "resolve_death_effects";
  }
}

export function handlePlayEcho(ctx: GameContext, client: Client, message: { cardId: string; runeIds: string[] }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.currentTurn !== client.sessionId) return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
  if (cardIndex === -1) return;

  const card = player.hand.at(cardIndex);
  if (!card || card.cardType !== "echo") return;

  if (!validateRuneSpelling(player, card.spellName, message.runeIds, card.bloodCost)) return;

  player.hand.splice(cardIndex, 1);
  player.battlefield.push(card);

  // Attach runes AFTER card is on battlefield so Colyseus tracks nested changes
  for (const runeId of message.runeIds) {
    detachRuneFromCurrent(player, runeId);
    const rune = player.runeField.find((r) => r.instanceId === runeId);
    if (rune) {
      rune.attachedToId = card.instanceId;
      card.attachedRuneIds.push(runeId);
    }
  }

  // Old summonings may have lost runes -> sacrifice
  sacrificeRunelessSummonings(ctx, player);

  recalculateOngoingEffects(ctx);
  checkWinCondition(ctx);

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.state.turnPhase = "resolve_death_effects";
  }
}

export function handlePlayMemory(ctx: GameContext, client: Client, message: { cardId: string; runeIds: string[]; targetId?: string; targetIds?: string[] }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.currentTurn !== client.sessionId) return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
  if (cardIndex === -1) return;

  const card = player.hand.at(cardIndex);
  if (!card || card.cardType !== "memory") return;

  // Validate rune spelling (bloodCostX: variable cost, skip validation if 0 runes)
  if (card.bloodCostX) {
    if (message.runeIds.length > 0) {
      if (!validateRuneSpelling(player, card.spellName, message.runeIds, message.runeIds.length)) return;
    }
  } else {
    if (!validateRuneSpelling(player, card.spellName, message.runeIds, card.bloodCost)) return;
  }

  // Cancel (remove) selected runes from rune field
  for (const runeId of message.runeIds) {
    detachRuneFromCurrent(player, runeId);
    const runeIndex = player.runeField.findIndex((r) => r.instanceId === runeId);
    if (runeIndex !== -1) {
      player.runeField.splice(runeIndex, 1);
    }
  }

  // Rune removal may orphan summonings
  sacrificeRunelessSummonings(ctx, player);

  // Remove from hand
  player.hand.splice(cardIndex, 1);

  // Execute effect
  const def = findDefinition(card);
  if (def && 'effect' in def && def.effect && !Array.isArray(def.effect.action) && def.effect.action.type === "damage_x") {
    handleDamageXEffect(ctx, player, message.runeIds.length, message.targetIds || []);
  } else {
    handleMemoryEffect(ctx, card, player, message.targetId);
  }

  // Send to graveyard
  player.graveyard.push(card);

  recalculateOngoingEffects(ctx);
  checkWinCondition(ctx);

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.state.turnPhase = "resolve_death_effects";
  }
}
