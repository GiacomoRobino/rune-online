import { Client } from "@colyseus/core";
import { Card } from "shared";
import { type GameContext } from "./context.js";
import { drawChaosCard, findDefinition, hasAbility } from "./utils.js";
import { handleOnDeathEffect, sacrificeRunelessSummonings } from "./deathCleanup.js";

const STARTING_HAND_SIZE = 3;
const STARTING_RUNES = 3;

export function startGame(ctx: GameContext) {
  ctx.state.phase = "playing";
  ctx.state.turnNumber = 1;

  // Random first player
  const firstPlayerIndex = Math.floor(Math.random() * 2);
  ctx.state.currentTurn = ctx.playerOrder[firstPlayerIndex];

  // Both players: draw 3 from Chaos deck
  ctx.state.players.forEach((player) => {
    for (let i = 0; i < STARTING_HAND_SIZE; i++) {
      drawChaosCard(player);
    }
  });

  // First player gets 3 starting rune writes
  const firstPlayer = ctx.state.players.get(ctx.state.currentTurn);
  if (firstPlayer) {
    firstPlayer.runesWrittenThisTurn = 0;
    firstPlayer.maxRuneWritesThisTurn = STARTING_RUNES;
  }

  ctx.state.turnPhase = "main";
  ctx.state.turnStartTime = new Date().toISOString();
  console.log(`Game started! ${ctx.state.currentTurn} goes first`);
}

export function startTurn(ctx: GameContext) {
  const currentPlayer = ctx.state.players.get(ctx.state.currentTurn);
  if (!currentPlayer) return;

  // Remove etching counters from stone runes
  currentPlayer.runeField.forEach((rune) => {
    if (rune.etchingCounters > 0) {
      rune.etchingCounters--;
    }
  });

  // Untap all creatures
  currentPlayer.battlefield.forEach((card) => {
    card.isTapped = false;
    card.hasAttacked = false;
    card.canAttack = true;
  });

  // Draw 1 from Chaos deck
  drawChaosCard(currentPlayer);

  // Allow rune writes: 3 on player's first turn, 1 otherwise
  currentPlayer.runesWrittenThisTurn = 0;
  currentPlayer.maxRuneWritesThisTurn = ctx.state.turnNumber <= 2 ? STARTING_RUNES : 1;

  ctx.state.turnPhase = "main";
  ctx.state.turnStartTime = new Date().toISOString();
}

export function handleEndTurn(ctx: GameContext, client: Client) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.currentTurn !== client.sessionId) return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  // Handle ephemeral creatures: sacrifice at end of owner's turn
  const ephemerals = Array.from(player.battlefield)
    .filter((c): c is Card => c !== undefined)
    .filter((c) => hasAbility(c, "ephemeral"));

  for (const card of ephemerals) {
    const idx = player.battlefield.findIndex((c) => c.instanceId === card.instanceId);
    if (idx === -1) continue;

    // Detach all runes (stay on runeField)
    for (let i = 0; i < card.attachedRuneIds.length; i++) {
      const runeId = card.attachedRuneIds.at(i);
      if (!runeId) continue;
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (rune) {
        rune.attachedToId = "";
      }
    }
    card.attachedRuneIds.clear();

    // Remove from battlefield, fire death effects, send to graveyard
    player.battlefield.splice(idx, 1);
    handleOnDeathEffect(ctx, card, player);
    player.graveyard.push(card);
  }

  if (ephemerals.length > 0) {
    // Cascade: orphaned summonings may need sacrifice
    sacrificeRunelessSummonings(ctx, player);

    if (ctx.state.pendingDeathEffects.length > 0) {
      ctx.state.turnPhase = "resolve_death_effects";
      ctx.pendingFinishEndTurn = true;
      return;
    }
  }

  // Check for end-of-turn effects (cancel_rune on cards with attached runes)
  const cardsWithEndTurnEffect = Array.from(player.battlefield)
    .filter((c): c is Card => c !== undefined)
    .filter((c) => {
      const def = findDefinition(c);
      if (!def || !("effect" in def) || !def.effect) return false;
      return def.effect.type === "end_turn" && def.effect.action.type === "cancel_rune" && c.attachedRuneIds.length > 0;
    });

  if (cardsWithEndTurnEffect.length > 0) {
    ctx.state.endTurnTargetCardId = cardsWithEndTurnEffect[0].instanceId;
    ctx.state.turnPhase = "end_turn_cancel_rune";
    return;
  }

  finishEndTurn(ctx);
}

export function finishEndTurn(ctx: GameContext) {
  // Heal all summonings for both players
  ctx.state.players.forEach((player) => {
    player.battlefield.forEach((card) => {
      card.health = card.maxHealth;
    });
  });

  // Switch player
  const currentIndex = ctx.playerOrder.indexOf(ctx.state.currentTurn);
  const nextIndex = (currentIndex + 1) % 2;
  ctx.state.currentTurn = ctx.playerOrder[nextIndex];
  ctx.state.turnNumber++;

  startTurn(ctx);
}
