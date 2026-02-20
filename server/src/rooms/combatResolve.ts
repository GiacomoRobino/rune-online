import { type GameContext } from "./context.js";
import { hasAbility, getOpponent, applyDamageToCreature, checkWinCondition } from "./utils.js";
import { cleanupDeadCreatures } from "./deathCleanup.js";
import { recalculateOngoingEffects } from "./ongoingEffects.js";

export function resolveCombatDamage(ctx: GameContext) {
  ctx.state.turnPhase = "combat_damage";

  const attackingPlayer = ctx.state.players.get(ctx.state.currentTurn);
  if (!attackingPlayer) return;

  const defendingPlayer = getOpponent(ctx, ctx.state.currentTurn);
  if (!defendingPlayer) return;

  // Build blocking map: attackerId -> blockerId[]
  const blockMap = new Map<string, string[]>();
  for (let i = 0; i < ctx.state.blockingAssignments.length; i++) {
    const assignment = ctx.state.blockingAssignments.at(i);
    if (!assignment) continue;
    const [blockerId, attackerId] = assignment.split(":");
    if (!blockerId || !attackerId) continue;
    if (!blockMap.has(attackerId)) {
      blockMap.set(attackerId, []);
    }
    blockMap.get(attackerId)!.push(blockerId);
  }

  // Process each attacker
  for (let i = 0; i < ctx.state.declaredAttackers.length; i++) {
    const attackerId = ctx.state.declaredAttackers.at(i);
    if (!attackerId) continue;
    const attackerCard = attackingPlayer.battlefield.find((c) => c.instanceId === attackerId);
    if (!attackerCard) continue;

    const blockerIds = blockMap.get(attackerId) || [];

    if (blockerIds.length === 0) {
      // Unblocked — damage to defending player
      defendingPlayer.health -= attackerCard.attack;
      defendingPlayer.lifeLostThisTurn += attackerCard.attack;
      // Lifedrinker: heal attacker's owner
      if (hasAbility(attackerCard, "lifedrinker")) {
        attackingPlayer.health = Math.min(
          attackingPlayer.health + attackerCard.attack,
          attackingPlayer.maxHealth
        );
      }
    } else {
      // Blocked — combat with blockers
      let remainingAttack = attackerCard.attack;
      const isDuelist = hasAbility(attackerCard, "duelist");

      for (const blockerId of blockerIds) {
        const blocker = defendingPlayer.battlefield.find((c) => c.instanceId === blockerId);
        if (!blocker) continue;

        if (isDuelist) {
          // Duelist: attacker deals damage first
          const dmgToBlocker = applyDamageToCreature(blocker, remainingAttack);
          remainingAttack -= blocker.health > 0 ? 0 : remainingAttack; // excess carries
          // Lifedrinker: heal attacker's owner by damage dealt to blocker
          if (hasAbility(attackerCard, "lifedrinker") && dmgToBlocker > 0) {
            attackingPlayer.health = Math.min(
              attackingPlayer.health + dmgToBlocker,
              attackingPlayer.maxHealth
            );
          }
          // Blocker only hits back if it survives
          if (blocker.health > 0) {
            const dmgToAttacker = applyDamageToCreature(attackerCard, blocker.attack);
            // Lifedrinker: heal blocker's owner by damage dealt to attacker
            if (hasAbility(blocker, "lifedrinker") && dmgToAttacker > 0) {
              defendingPlayer.health = Math.min(
                defendingPlayer.health + dmgToAttacker,
                defendingPlayer.maxHealth
              );
            }
          }
        } else {
          // Simultaneous damage
          const dmgToBlocker = applyDamageToCreature(blocker, remainingAttack);
          const dmgToAttacker = applyDamageToCreature(attackerCard, blocker.attack);
          // Lifedrinker: heal attacker's owner
          if (hasAbility(attackerCard, "lifedrinker") && dmgToBlocker > 0) {
            attackingPlayer.health = Math.min(
              attackingPlayer.health + dmgToBlocker,
              attackingPlayer.maxHealth
            );
          }
          // Lifedrinker: heal blocker's owner
          if (hasAbility(blocker, "lifedrinker") && dmgToAttacker > 0) {
            defendingPlayer.health = Math.min(
              defendingPlayer.health + dmgToAttacker,
              defendingPlayer.maxHealth
            );
          }
        }

        // Track remaining damage for Fury
        if (blocker.health <= 0) {
          remainingAttack = Math.max(0, remainingAttack - blocker.maxHealth);
        } else {
          remainingAttack = 0;
        }
      }

      // Fury: excess damage goes to defending player
      if (hasAbility(attackerCard, "fury") && remainingAttack > 0) {
        defendingPlayer.health -= remainingAttack;
        defendingPlayer.lifeLostThisTurn += remainingAttack;
      }
    }
  }

  // Clean up dead creatures
  cleanupDeadCreatures(ctx, attackingPlayer);
  cleanupDeadCreatures(ctx, defendingPlayer);

  // Recalculate ongoing effects (echoes may have died)
  recalculateOngoingEffects(ctx);

  // Clear combat state
  ctx.state.declaredAttackers.clear();
  ctx.state.blockingAssignments.clear();

  checkWinCondition(ctx);

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.state.turnPhase = "resolve_death_effects";
  } else {
    ctx.state.turnPhase = "main";
  }
}
