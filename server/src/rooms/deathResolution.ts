import { Client } from "@colyseus/core";
import { Card, PendingEffect } from "shared";
import { type GameContext } from "./context.js";
import { findCardOnAnyBattlefield, findOwner, getOpponent, applyDamageToCreature, checkWinCondition, findDefinition, createCard } from "./utils.js";
import { cleanupDeadCreatures, sacrificeRunelessSummonings } from "./deathCleanup.js";
import { recalculateOngoingEffects } from "./ongoingEffects.js";
import { finishEndTurn } from "./lifecycle.js";

export function handleResolveDeathTarget(ctx: GameContext, client: Client, message: { targetId: string }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "resolve_death_effects") return;

  const effect = ctx.state.pendingDeathEffects.at(0);
  if (!effect || effect.effectType !== "death_damage" || effect.ownerSessionId !== client.sessionId) return;

  const caster = ctx.state.players.get(client.sessionId);
  if (!caster) return;
  const opponent = getOpponent(ctx, client.sessionId);

  const targetId = message.targetId;
  if (targetId === "opponent_hero") {
    if (opponent) opponent.health -= effect.damageAmount;
  } else if (targetId === "my_hero") {
    caster.health -= effect.damageAmount;
  } else {
    const target = findCardOnAnyBattlefield(ctx, targetId);
    if (target) {
      const owner = findOwner(ctx, targetId);
      if (owner) {
        applyDamageToCreature(target, effect.damageAmount);
        cleanupDeadCreatures(ctx, owner);
        recalculateOngoingEffects(ctx);
      }
    }
  }

  ctx.state.pendingDeathEffects.splice(0, 1);
  checkWinCondition(ctx);
  advanceDeathEffectQueue(ctx);
}

export function handleResolveDeathPreventionCancel(ctx: GameContext, client: Client, message: { runeId: string }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "resolve_death_effects") return;

  const effect = ctx.state.pendingDeathEffects.at(0);
  if (!effect || effect.effectType !== "death_prevention_cancel" || effect.ownerSessionId !== client.sessionId) return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  // Find the rune on player's runeField
  const runeIndex = player.runeField.findIndex((r) => r.instanceId === message.runeId);
  if (runeIndex === -1) return;

  const rune = player.runeField.at(runeIndex);
  if (!rune) return;

  // Validate: rune must be attached to the target card and be a blood rune
  if (rune.attachedToId !== effect.targetCardId) return;
  if (rune.runeType !== "blood") return;

  // Cancel the blood rune
  player.runeField.splice(runeIndex, 1);

  // Remove runeId from the card's attachedRuneIds
  const card = player.battlefield.find((c) => c.instanceId === effect.targetCardId);
  if (card) {
    const idx = card.attachedRuneIds.findIndex((id) => id === message.runeId);
    if (idx !== -1) {
      card.attachedRuneIds.splice(idx, 1);
    }
  }

  // Sacrifice runeless summonings
  sacrificeRunelessSummonings(ctx, player);

  // Queue follow-up death_damage effect if there's damage to deal
  if (effect.damageAmount > 0) {
    const dmgEffect = new PendingEffect();
    dmgEffect.id = `de_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    dmgEffect.ownerSessionId = client.sessionId;
    dmgEffect.effectType = "death_damage";
    dmgEffect.damageAmount = effect.damageAmount;
    dmgEffect.cardName = effect.cardName;
    ctx.state.pendingDeathEffects.push(dmgEffect);
  }

  // Remove the death_prevention_cancel effect
  ctx.state.pendingDeathEffects.splice(0, 1);
  advanceDeathEffectQueue(ctx);
}

export function handleResolveDeckSearch(ctx: GameContext, client: Client, message: { cardId: string | null }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "resolve_death_effects") return;

  const effect = ctx.state.pendingDeathEffects.at(0);
  if (!effect || effect.effectType !== "search_deck" || effect.ownerSessionId !== client.sessionId) return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  if (message.cardId) {
    const cardIndex = player.chaosDeck.findIndex((c) => c.instanceId === message.cardId);
    if (cardIndex !== -1) {
      const card = player.chaosDeck.at(cardIndex);
      if (card) {
        // Validate subtype match
        const filterValues = effect.searchFilter.split(",");
        const cardSubtypes = card.subtypes ? card.subtypes.split(",") : [];
        const matches = cardSubtypes.some((st) => filterValues.includes(st));
        if (matches && player.hand.length < 10) {
          player.chaosDeck.splice(cardIndex, 1);
          player.hand.push(card);
        }
      }
    }
  }

  ctx.state.pendingDeathEffects.splice(0, 1);
  advanceDeathEffectQueue(ctx);
}

export function handleResolveWriteRune(ctx: GameContext, client: Client, message: { runeId: string | null }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "resolve_death_effects") return;

  const effect = ctx.state.pendingDeathEffects.at(0);
  if (!effect || effect.effectType !== "write_rune" || effect.ownerSessionId !== client.sessionId) return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  if (message.runeId) {
    const runeIndex = player.runesDeck.findIndex((r) => r.instanceId === message.runeId);
    if (runeIndex !== -1) {
      const rune = player.runesDeck.at(runeIndex);
      if (rune && rune.runeType === effect.runeTypeFilter) {
        player.runesDeck.splice(runeIndex, 1);

        // Blood runes cost 1 life
        if (rune.runeType === "blood") {
          player.health -= 1;
        }

        // Stone runes enter with 1 etching counter
        if (rune.runeType === "stone") {
          rune.etchingCounters = 1;
        }

        player.runeField.push(rune);
        checkWinCondition(ctx);
      }
    }
  }

  ctx.state.pendingDeathEffects.splice(0, 1);
  advanceDeathEffectQueue(ctx);
}

export function handleResolveEndTurnCancel(ctx: GameContext, client: Client, message: { runeId: string }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "end_turn_cancel_rune") return;
  if (ctx.state.currentTurn !== client.sessionId) return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  // Find the rune on player's runeField
  const runeIndex = player.runeField.findIndex((r) => r.instanceId === message.runeId);
  if (runeIndex === -1) return;

  const rune = player.runeField.at(runeIndex);
  if (!rune) return;

  // Validate: rune must be attached to the target card
  if (rune.attachedToId !== ctx.state.endTurnTargetCardId) return;

  // Remove rune from runeField
  player.runeField.splice(runeIndex, 1);

  // Remove runeId from the card's attachedRuneIds
  const card = player.battlefield.find((c) => c.instanceId === ctx.state.endTurnTargetCardId);
  if (card) {
    const idx = card.attachedRuneIds.findIndex((id) => id === message.runeId);
    if (idx !== -1) {
      card.attachedRuneIds.splice(idx, 1);
    }
  }

  // Sacrifice runeless summonings
  sacrificeRunelessSummonings(ctx, player);

  // Check if more cards still need rune cancellation (exclude the just-processed card)
  const processedCardId = ctx.state.endTurnTargetCardId;
  const remaining = Array.from(player.battlefield)
    .filter((c): c is Card => c !== undefined)
    .filter((c) => {
      if (c.instanceId === processedCardId) return false;
      const def = findDefinition(c);
      if (!def || !("effect" in def) || !def.effect) return false;
      return def.effect.type === "end_turn" && def.effect.action.type === "cancel_rune" && c.attachedRuneIds.length > 0;
    });

  if (remaining.length > 0) {
    ctx.state.endTurnTargetCardId = remaining[0].instanceId;
  } else {
    ctx.state.endTurnTargetCardId = "";
    // Check for pending death effects (from sacrifice)
    if (ctx.state.pendingDeathEffects.length > 0) {
      ctx.state.turnPhase = "resolve_death_effects";
      // Mark that we need to finishEndTurn after death effects resolve
      ctx.pendingFinishEndTurn = true;
    } else {
      finishEndTurn(ctx);
    }
  }
}

export function advanceDeathEffectQueue(ctx: GameContext) {
  if (ctx.state.pendingDeathEffects.length > 0) {
    // Stay in resolve_death_effects; skip disconnected players' effects
    const next = ctx.state.pendingDeathEffects.at(0);
    if (next) {
      const owner = ctx.state.players.get(next.ownerSessionId);
      if (!owner || !owner.connected) {
        ctx.state.pendingDeathEffects.splice(0, 1);
        advanceDeathEffectQueue(ctx);
        return;
      }
    }
    ctx.state.turnPhase = "resolve_death_effects";
  } else {
    if (ctx.pendingFinishEndTurn) {
      ctx.pendingFinishEndTurn = false;
      finishEndTurn(ctx);
    } else {
      ctx.state.turnPhase = "main";
    }
  }
}
