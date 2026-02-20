import { Client } from "@colyseus/core";
import { type GameContext } from "./context.js";
import { hasAbility, getOpponent } from "./utils.js";
import { resolveCombatDamage } from "./combatResolve.js";
import { triggerAttackEffects } from "./effects.js";

export function handleDeclareAttackers(ctx: GameContext, client: Client, message: { attackerIds: string[] }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.currentTurn !== client.sessionId) return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  // Validate attackers
  const validAttackerIds: string[] = [];
  for (const id of message.attackerIds) {
    const card = player.battlefield.find((c) => c.instanceId === id);
    if (!card) continue;
    if (card.cardType !== "summoning") continue;
    if (card.isTapped || card.hasAttacked || !card.canAttack) continue;
    if (hasAbility(card, "defender")) continue;
    validAttackerIds.push(id);
  }

  if (validAttackerIds.length === 0) return;

  // Tap attackers (unless Warden)
  for (const id of validAttackerIds) {
    const card = player.battlefield.find((c) => c.instanceId === id);
    if (card && !hasAbility(card, "warden")) {
      card.isTapped = true;
    }
    if (card) {
      card.hasAttacked = true;
    }
  }

  // Store declared attackers
  ctx.state.declaredAttackers.clear();
  for (const id of validAttackerIds) {
    ctx.state.declaredAttackers.push(id);
  }

  // Trigger on_attack echo effects
  triggerAttackEffects(ctx, player);

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.pendingCombatContinue = true;
    ctx.state.turnPhase = "resolve_death_effects";
    return;
  }

  continueCombatAfterAttackers(ctx);
}

export function continueCombatAfterAttackers(ctx: GameContext) {
  const opponent = getOpponent(ctx, ctx.state.currentTurn);
  if (!opponent) return;

  const canAnyBlock = opponent.battlefield.some(
    (c) => c.cardType === "summoning" && !c.isTapped
  );

  if (canAnyBlock) {
    ctx.state.turnPhase = "declare_blockers";
  } else {
    ctx.state.blockingAssignments.clear();
    resolveCombatDamage(ctx);
  }
}

export function handleDeclareBlockers(ctx: GameContext, client: Client, message: { assignments: string[] }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "declare_blockers") return;

  // Only the defending player (opponent of current turn) can declare blockers
  if (ctx.state.currentTurn === client.sessionId) return;

  const defender = ctx.state.players.get(client.sessionId);
  if (!defender) return;

  const attacker = ctx.state.players.get(ctx.state.currentTurn);
  if (!attacker) return;

  // Validate assignments
  ctx.state.blockingAssignments.clear();
  for (const assignment of message.assignments) {
    const [blockerId, attackerId] = assignment.split(":");
    if (!blockerId || !attackerId) continue;

    const blocker = defender.battlefield.find((c) => c.instanceId === blockerId);
    if (!blocker || blocker.cardType !== "summoning" || blocker.isTapped) continue;

    const attackerCard = attacker.battlefield.find((c) => c.instanceId === attackerId);
    if (!attackerCard) continue;

    // Skyrunner can only be blocked by Skyrunner
    if (hasAbility(attackerCard, "skyrunner") && !hasAbility(blocker, "skyrunner")) continue;

    // Shadowwalker: can only be blocked by/block other shadowwalkers
    const attackerIsShadow = hasAbility(attackerCard, "shadowwalker");
    const blockerIsShadow = hasAbility(blocker, "shadowwalker");
    if (attackerIsShadow !== blockerIsShadow) continue;

    ctx.state.blockingAssignments.push(assignment);
  }

  resolveCombatDamage(ctx);
}
