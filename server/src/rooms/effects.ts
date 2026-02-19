import { Player, Card } from "shared";
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
        } else if (targetId === "my_hero") {
          caster.health -= amount;
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
        } else {
          const target = opponent.battlefield.find((c) => c.instanceId === pick);
          if (target) {
            applyDamageToCreature(target, amount);
            cleanupDeadCreatures(ctx, opponent);
          }
        }
      } else if (action.target === "all_enemies") {
        opponent.health -= amount;
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
  }
}
