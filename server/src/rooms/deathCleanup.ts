import { Player, Card, PendingEffect } from "shared";
import { type GameContext } from "./context.js";
import { hasAbility, findDefinition, getOpponent } from "./utils.js";

export function handleOnDeathEffect(ctx: GameContext, card: Card, owner: Player) {
  // Revenge: immediate (no targeting needed)
  if (hasAbility(card, "revenge")) {
    const opponent = getOpponent(ctx, owner.sessionId);
    if (opponent) {
      opponent.health -= card.attack;
    }
  }

  // Deathstrike: queue targeted damage
  if (hasAbility(card, "deathstrike")) {
    const effect = new PendingEffect();
    effect.id = `de_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    effect.ownerSessionId = owner.sessionId;
    effect.effectType = "death_damage";
    effect.damageAmount = card.attack;
    effect.cardName = card.name;
    ctx.state.pendingDeathEffects.push(effect);
  }

  // On-death effect(s)
  const def = findDefinition(card);
  if (def && 'effect' in def && def.effect && def.effect.type === "on_death") {
    const actions = Array.isArray(def.effect.action) ? def.effect.action : [def.effect.action];
    for (const action of actions) {
      if (action.type === "search_deck") {
        const effect = new PendingEffect();
        effect.id = `de_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        effect.ownerSessionId = owner.sessionId;
        effect.effectType = "search_deck";
        effect.cardName = card.name;
        effect.searchFilter = action.values.join(",");
        ctx.state.pendingDeathEffects.push(effect);
      } else if (action.type === "write_rune") {
        const effect = new PendingEffect();
        effect.id = `de_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        effect.ownerSessionId = owner.sessionId;
        effect.effectType = "write_rune";
        effect.cardName = card.name;
        effect.runeTypeFilter = action.runeType;
        ctx.state.pendingDeathEffects.push(effect);
      }
    }
  }
}

export function cleanupDeadCreatures(ctx: GameContext, player: Player) {
  const dead: Card[] = [];
  for (let i = player.battlefield.length - 1; i >= 0; i--) {
    const card = player.battlefield.at(i);
    if (!card) continue;
    if (card.health <= 0) {
      dead.push(card);
      player.battlefield.splice(i, 1);
    }
  }

  for (const card of dead) {
    handleOnDeathEffect(ctx, card, player);

    // Detach runes — runes stay on runeField but become unattached
    for (let i = 0; i < card.attachedRuneIds.length; i++) {
      const runeId = card.attachedRuneIds.at(i);
      if (!runeId) continue;
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (rune) {
        rune.attachedToId = "";
      }
    }
    card.attachedRuneIds.clear();

    // Move to graveyard
    player.graveyard.push(card);
  }

  // Check for summonings with 0 attached runes (no Unbounded) — sacrifice
  let sacrificed = true;
  while (sacrificed) {
    sacrificed = false;
    for (let i = player.battlefield.length - 1; i >= 0; i--) {
      const card = player.battlefield.at(i);
      if (!card) continue;
      if ((card.cardType === "summoning" || card.cardType === "echo") && card.attachedRuneIds.length === 0 && !hasAbility(card, "unbounded")) {
        player.battlefield.splice(i, 1);
        player.graveyard.push(card);
        sacrificed = true;
      }
    }
  }
}

/** Sacrifice any summoning/echo that has 0 attached runes (unless Unbounded). */
export function sacrificeRunelessSummonings(ctx: GameContext, player: Player) {
  let sacrificed = true;
  while (sacrificed) {
    sacrificed = false;
    for (let i = player.battlefield.length - 1; i >= 0; i--) {
      const card = player.battlefield.at(i);
      if (!card) continue;
      if ((card.cardType === "summoning" || card.cardType === "echo") && card.attachedRuneIds.length === 0 && !hasAbility(card, "unbounded")) {
        player.battlefield.splice(i, 1);
        handleOnDeathEffect(ctx, card, player);
        player.graveyard.push(card);
        sacrificed = true;
      }
    }
  }
}
