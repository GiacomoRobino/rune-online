import { Player, Card, SUBTYPE_ABILITIES, PendingEffect } from "shared";
import { type GameContext } from "./context.js";
import {
  createCard, hasAbility, findDefinition,
  findCardOnAnyBattlefield, findOwner, getOpponent,
  drawChaosCard, applyDamageToCreature,
} from "./utils.js";
import { cleanupDeadCreatures } from "./deathCleanup.js";

export function handleOnEnterEffect(ctx: GameContext, card: Card, caster: Player) {
  const def = findDefinition(card);
  if (!def || !('effect' in def) || !def.effect) return;
  if (def.effect.type !== "on_enter") return;

  // choose_subtype is handled in handleSummon before card enters
  if (Array.isArray(def.effect.action)) return;
  if (def.effect.action.type === "choose_subtype") return;

  if (def.effect.action.type === "create_copies" && def.effect.action.source === "extra_runes") {
    // Identify extra rune IDs (those beyond base cost)
    const extraRuneIds: string[] = [];
    const baseNeeded = card.spellName.split("");
    for (let i = 0; i < card.attachedRuneIds.length; i++) {
      const runeId = card.attachedRuneIds.at(i);
      if (!runeId) continue;
      const rune = caster.runeField.find(r => r.instanceId === runeId);
      if (!rune) continue;
      const idx = baseNeeded.indexOf(rune.letter);
      if (idx !== -1) {
        baseNeeded.splice(idx, 1); // consumed by base cost
      } else {
        extraRuneIds.push(runeId);
      }
    }

    for (const extraRuneId of extraRuneIds) {
      // Create a copy
      const copy = createCard(def);
      copy.abilities = copy.abilities ? copy.abilities + ",unbounded" : "unbounded";
      copy.canAttack = hasAbility(copy, "rage");
      copy.hasAegis = hasAbility(copy, "aegis");

      // Detach extra rune from original, attach to copy
      const runeIdx = Array.from(card.attachedRuneIds).indexOf(extraRuneId);
      if (runeIdx !== -1) card.attachedRuneIds.splice(runeIdx, 1);
      const rune = caster.runeField.find(r => r.instanceId === extraRuneId);
      if (rune) {
        rune.attachedToId = copy.instanceId;
        copy.attachedRuneIds.push(extraRuneId);
      }

      caster.battlefield.push(copy);
    }
    return;
  }

  executeEffect(ctx, def.effect.action, caster);
}

export function handleMemoryEffect(ctx: GameContext, card: Card, caster: Player, targetId?: string) {
  const def = findDefinition(card);
  if (!def || !('effect' in def) || !def.effect) return;
  if (Array.isArray(def.effect.action)) return;

  executeEffect(ctx, def.effect.action, caster, targetId);
}

export function executeEffect(ctx: GameContext, action: { type: string; [key: string]: any }, caster: Player, targetId?: string) {
  const opponent = getOpponent(ctx, caster.sessionId);
  if (!opponent) return;

  switch (action.type) {
    case "damage": {
      const amount = action.amount as number;
      if (action.target === "any" && targetId) {
        if (targetId === "opponent_hero") {
          opponent.health -= amount;
          opponent.lifeLostThisTurn += amount;
        } else if (targetId === "my_hero") {
          caster.health -= amount;
          caster.lifeLostThisTurn += amount;
        } else {
          // Try to find on either battlefield
          const target = findCardOnAnyBattlefield(ctx, targetId);
          if (target) {
            const owner = findOwner(ctx, targetId);
            if (owner) {
              applyDamageToCreature(target, amount);
              cleanupDeadCreatures(ctx, owner);
            }
          }
        }
      } else if (action.target === "enemy") {
        if (targetId === "opponent_hero" || targetId === "hero") {
          opponent.health -= amount;
          opponent.lifeLostThisTurn += amount;
        } else if (targetId) {
          const target = opponent.battlefield.find((c) => c.instanceId === targetId);
          if (target) {
            applyDamageToCreature(target, amount);
            cleanupDeadCreatures(ctx, opponent);
          }
        }
      } else if (action.target === "random_enemy") {
        const targets = [...opponent.battlefield.map((c) => c.instanceId), "hero"];
        const pick = targets[Math.floor(Math.random() * targets.length)];
        if (pick === "hero") {
          opponent.health -= amount;
          opponent.lifeLostThisTurn += amount;
        } else {
          const target = opponent.battlefield.find((c) => c.instanceId === pick);
          if (target) {
            applyDamageToCreature(target, amount);
            cleanupDeadCreatures(ctx, opponent);
          }
        }
      } else if (action.target === "all_enemies") {
        opponent.health -= amount;
        opponent.lifeLostThisTurn += amount;
        opponent.battlefield.forEach((c) => {
          applyDamageToCreature(c, amount);
        });
        cleanupDeadCreatures(ctx, opponent);
      }
      break;
    }
    case "heal": {
      const amount = action.amount as number;
      if (action.target === "self") {
        caster.health = Math.min(caster.health + amount, caster.maxHealth);
      }
      break;
    }
    case "draw": {
      const amount = action.amount as number;
      for (let i = 0; i < amount; i++) {
        drawChaosCard(caster);
      }
      break;
    }
    case "buff": {
      if (targetId) {
        const target = caster.battlefield.find((c) => c.instanceId === targetId);
        if (target) {
          target.attack += action.attack || 0;
          target.health += action.health || 0;
          target.maxHealth += action.health || 0;
        }
      }
      break;
    }
    case "grant_aegis": {
      if (action.target === "all_friendly") {
        caster.battlefield.forEach((c) => {
          if (c.cardType === "summoning") {
            c.hasAegis = true;
          }
        });
      }
      break;
    }
    case "lose_life": {
      const loseAmount = action.amount as number;
      caster.health -= loseAmount;
      caster.lifeLostThisTurn += loseAmount;
      break;
    }
    case "create_token": {
      let count = 0;
      if (action.count === "life_lost_this_turn") {
        count = caster.lifeLostThisTurn;
      }
      for (let i = 0; i < count; i++) {
        const tokenDef = {
          id: "token_" + action.tokenName.toLowerCase().replace(/\s+/g, "_"),
          name: action.tokenName,
          type: "summoning" as const,
          spellName: "",
          attack: action.attack,
          health: action.health,
          abilities: action.abilities,
        };
        const token = createCard(tokenDef);
        token.canAttack = hasAbility(token, "rage");
        token.hasAegis = hasAbility(token, "aegis");
        caster.battlefield.push(token);
      }
      break;
    }
    case "reanimate": {
      if (!targetId) break;
      const gravIdx = caster.graveyard.findIndex(c => c.instanceId === targetId && c.cardType === "summoning");
      if (gravIdx === -1) break;
      const target = caster.graveyard.at(gravIdx);
      if (!target) break;
      caster.graveyard.splice(gravIdx, 1);
      // Grant unbounded
      target.abilities = target.abilities ? target.abilities + ",unbounded" : "unbounded";
      // Reset combat state for fresh entry
      target.canAttack = hasAbility(target, "rage");
      target.hasAttacked = false;
      target.isTapped = false;
      target.hasAegis = hasAbility(target, "aegis");
      target.health = target.maxHealth;
      target.damageMarked = 0;
      caster.battlefield.push(target);
      break;
    }
    case "grant_subtype": {
      if (targetId) {
        const target = findCardOnAnyBattlefield(ctx, targetId);
        if (target && target.cardType === "summoning") {
          target.subtypes = target.subtypes ? target.subtypes + "," + action.subtype : action.subtype;
          const subtypeAbilities = SUBTYPE_ABILITIES[action.subtype];
          if (subtypeAbilities) {
            for (const ability of subtypeAbilities) {
              if (!hasAbility(target, ability)) {
                target.abilities = target.abilities ? target.abilities + "," + ability : ability;
              }
            }
            if (hasAbility(target, "rage")) target.canAttack = true;
            if (hasAbility(target, "aegis")) target.hasAegis = true;
          }
        }
      }
      break;
    }
  }
}

export function handleDamageXEffect(ctx: GameContext, caster: Player, x: number, targetIds: string[]) {
  let totalDamage = 0;
  const seen = new Set<string>();
  for (const targetId of targetIds) {
    if (seen.has(targetId)) continue;
    if (seen.size >= x) break;
    seen.add(targetId);
    const target = findCardOnAnyBattlefield(ctx, targetId);
    if (!target || target.cardType !== "summoning") continue;
    totalDamage += applyDamageToCreature(target, x);
  }
  // Clean up dead creatures on both sides
  const opponent = getOpponent(ctx, caster.sessionId);
  cleanupDeadCreatures(ctx, caster);
  if (opponent) cleanupDeadCreatures(ctx, opponent);
  // Heal caster
  if (totalDamage > 0) {
    caster.health = Math.min(caster.health + totalDamage, caster.maxHealth);
  }
}

export function triggerAttackEffects(ctx: GameContext, player: Player) {
  const attackerCount = ctx.state.declaredAttackers.length;
  if (attackerCount === 0) return;

  for (let i = 0; i < player.battlefield.length; i++) {
    const card = player.battlefield.at(i);
    if (!card || card.cardType !== "echo") continue;
    const def = findDefinition(card);
    if (!def || !("effect" in def) || !def.effect) continue;
    if (def.effect.type !== "on_attack") continue;

    const actions = Array.isArray(def.effect.action) ? def.effect.action : [def.effect.action];
    for (const action of actions) {
      if (action.type === "damage" && action.target === "any") {
        for (let a = 0; a < attackerCount; a++) {
          const effect = new PendingEffect();
          effect.id = `ae_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          effect.ownerSessionId = player.sessionId;
          effect.effectType = "attack_damage";
          effect.damageAmount = action.amount;
          effect.cardName = card.name;
          ctx.state.pendingDeathEffects.push(effect);
        }
      } else {
        for (let a = 0; a < attackerCount; a++) {
          executeEffect(ctx, action, player);
        }
      }
    }
  }
}

export function triggerWriteRuneEffects(ctx: GameContext, player: Player, runeType: string) {
  for (let i = 0; i < player.battlefield.length; i++) {
    const card = player.battlefield.at(i);
    if (!card || card.cardType !== "echo") continue;
    const def = findDefinition(card);
    if (!def || !("effect" in def) || !def.effect) continue;
    if (def.effect.type !== "on_write_rune") continue;
    if (def.effect.runeType !== runeType) continue;
    const actions = Array.isArray(def.effect.action) ? def.effect.action : [def.effect.action];
    for (const action of actions) {
      executeEffect(ctx, action, player);
    }
  }
}
