import { Card } from "shared";
import { type GameContext } from "./context.js";
import { hasAbility, findDefinition, getOpponent } from "./utils.js";
import { handleOnDeathEffect, sacrificeRunelessSummonings } from "./deathCleanup.js";

/** Recalculate all ongoing buff effects from echoes on the battlefield. */
export function recalculateOngoingEffects(ctx: GameContext) {
  ctx.state.players.forEach((player) => {
    // Sum friendly ongoing buffs from this player's echoes
    let buffAttack = 0;
    let buffHealth = 0;

    player.battlefield.forEach((card) => {
      if (card.cardType !== "echo") return;
      const def = findDefinition(card);
      if (!def || !("effect" in def) || !def.effect) return;
      if (def.effect.type !== "ongoing" || def.effect.action.type !== "buff") return;
      if (def.effect.action.target === "all_friendly" || def.effect.action.target === "all") {
        buffAttack += def.effect.action.attack;
        buffHealth += def.effect.action.health;
      }
    });

    // Sum debuffs from opponent's echoes targeting "all_enemy" or "all"
    const opponent = getOpponent(ctx, player.sessionId);
    if (opponent) {
      opponent.battlefield.forEach((card) => {
        if (card.cardType !== "echo") return;
        const def = findDefinition(card);
        if (!def || !("effect" in def) || !def.effect) return;
        if (def.effect.type !== "ongoing" || def.effect.action.type !== "buff") return;
        if (def.effect.action.target === "all_enemy" || def.effect.action.target === "all") {
          buffAttack += def.effect.action.attack;
          buffHealth += def.effect.action.health;
        }
      });
    }

    // Apply to all summonings
    player.battlefield.forEach((card) => {
      if (card.cardType !== "summoning") return;
      const damageTaken = card.maxHealth - card.health;

      let extraAttack = buffAttack;
      let extraHealth = buffHealth;

      // Bloodmaster: +1/+1 per attached blood rune
      if (hasAbility(card, "bloodmaster")) {
        for (let i = 0; i < card.attachedRuneIds.length; i++) {
          const runeId = card.attachedRuneIds.at(i);
          if (!runeId) continue;
          const rune = player.runeField.find((r) => r.instanceId === runeId);
          if (rune && rune.runeType === "blood") {
            extraAttack++;
            extraHealth++;
          }
        }
      }

      card.attack = card.baseAttack + extraAttack;
      card.maxHealth = card.baseHealth + extraHealth;
      card.health = card.maxHealth - damageTaken;
    });
  });

  // Clean up summonings killed by buff removal
  ctx.state.players.forEach((player) => {
    const dead: Card[] = [];
    for (let i = player.battlefield.length - 1; i >= 0; i--) {
      const card = player.battlefield.at(i);
      if (!card || card.cardType !== "summoning") continue;
      if (card.health <= 0) {
        dead.push(card);
        player.battlefield.splice(i, 1);
      }
    }
    for (const card of dead) {
      for (let j = 0; j < card.attachedRuneIds.length; j++) {
        const runeId = card.attachedRuneIds.at(j);
        if (!runeId) continue;
        const rune = player.runeField.find((r) => r.instanceId === runeId);
        if (rune) rune.attachedToId = "";
      }
      card.attachedRuneIds.clear();
      handleOnDeathEffect(ctx, card, player);
      player.graveyard.push(card);
    }
    if (dead.length > 0) {
      sacrificeRunelessSummonings(ctx, player);
    }
  });

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.state.turnPhase = "resolve_death_effects";
  }
}
