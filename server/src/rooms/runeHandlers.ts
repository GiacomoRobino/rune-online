import { Client } from "@colyseus/core";
import { Player } from "shared";
import { type GameContext } from "./context.js";
import { checkWinCondition } from "./utils.js";
import { sacrificeRunelessSummonings } from "./deathCleanup.js";
import { triggerWriteRuneEffects } from "./effects.js";

export function validateRuneSpelling(player: Player, spellName: string, runeIds: string[], bloodCost: number = 0, canOverpay: boolean = false): boolean {
  if (canOverpay) {
    // Overpay: need at least base cost, extra runes must also match spellName letters
    if (runeIds.length < spellName.length) return false;
    const nameLetters = new Set(spellName.split(""));
    for (const runeId of runeIds) {
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (!rune) return false;
      if (rune.etchingCounters > 0) return false;
      if (!nameLetters.has(rune.letter)) return false;
    }
    // Check base frequency met
    const neededFreq = new Map<string, number>();
    for (const ch of spellName) neededFreq.set(ch, (neededFreq.get(ch) || 0) + 1);
    const providedFreq = new Map<string, number>();
    for (const runeId of runeIds) {
      const rune = player.runeField.find((r) => r.instanceId === runeId)!;
      providedFreq.set(rune.letter, (providedFreq.get(rune.letter) || 0) + 1);
    }
    for (const [letter, count] of neededFreq) {
      if ((providedFreq.get(letter) || 0) < count) return false;
    }
    return true;
  }

  if (bloodCost > 0) {
    // Blood cost: pick any N runes whose letters are in the spell name pool
    if (runeIds.length !== bloodCost) return false;

    // Build frequency map of available letters in spellName
    const nameFreq = new Map<string, number>();
    for (const ch of spellName) {
      nameFreq.set(ch, (nameFreq.get(ch) || 0) + 1);
    }

    // Check each selected rune
    const usedFreq = new Map<string, number>();
    for (const runeId of runeIds) {
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (!rune) return false;
      if (rune.etchingCounters > 0) return false;
      const letter = rune.letter;
      if (!nameFreq.has(letter)) return false;
      const used = (usedFreq.get(letter) || 0) + 1;
      if (used > nameFreq.get(letter)!) return false;
      usedFreq.set(letter, used);
    }

    return true;
  }

  // Standard spelling: must provide ALL letters exactly
  if (runeIds.length !== spellName.length) return false;

  // Collect letters needed
  const needed = spellName.split("").slice().sort();

  // Collect letters from selected runes
  const provided: string[] = [];
  for (const runeId of runeIds) {
    const rune = player.runeField.find((r) => r.instanceId === runeId);
    if (!rune) return false;
    if (rune.etchingCounters > 0) return false; // still etching (stone)
    provided.push(rune.letter);
  }

  provided.sort();

  // Check match (order-independent)
  for (let i = 0; i < needed.length; i++) {
    if (needed[i] !== provided[i]) return false;
  }

  return true;
}

/** Detach a rune from whatever summoning/echo it's currently attached to. */
export function detachRuneFromCurrent(player: Player, runeId: string) {
  const rune = player.runeField.find((r) => r.instanceId === runeId);
  if (!rune || rune.attachedToId === "") return;

  const oldOwner = player.battlefield.find((c) => c.instanceId === rune.attachedToId);
  if (oldOwner) {
    const idx = oldOwner.attachedRuneIds.findIndex((id) => id === runeId);
    if (idx !== -1) {
      oldOwner.attachedRuneIds.splice(idx, 1);
    }
  }
  rune.attachedToId = "";
}

export function handleWriteRune(ctx: GameContext, client: Client, message: { runeId: string }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  // Only current player can write runes
  if (ctx.state.currentTurn !== client.sessionId) return;

  // Check write allowance
  if (player.runesWrittenThisTurn >= player.maxRuneWritesThisTurn) return;

  // Find the chosen rune in the deck
  const runeIndex = player.runesDeck.findIndex((r) => r.instanceId === message.runeId);
  if (runeIndex === -1) return;

  const rune = player.runesDeck.at(runeIndex);
  if (!rune) return;

  // Remove from deck
  player.runesDeck.splice(runeIndex, 1);

  // Blood runes cost 1 life to write
  if (rune.runeType === "blood") {
    player.health -= 1;
    player.lifeLostThisTurn += 1;
  }

  // Stone runes enter with 1 etching counter
  if (rune.runeType === "stone") {
    rune.etchingCounters = 1;
  }

  player.runeField.push(rune);
  player.runesWrittenThisTurn++;

  triggerWriteRuneEffects(ctx, player, rune.runeType);
  checkWinCondition(ctx);
}

export function handleAttachRune(ctx: GameContext, client: Client, message: { runeId: string; targetId: string }) {
  if (ctx.state.phase !== "playing") return;
  if (ctx.state.currentTurn !== client.sessionId) return;
  if (ctx.state.turnPhase !== "main") return;

  const player = ctx.state.players.get(client.sessionId);
  if (!player) return;

  const rune = player.runeField.find((r) => r.instanceId === message.runeId);
  if (!rune || rune.etchingCounters > 0) return;

  const target = player.battlefield.find((c) => c.instanceId === message.targetId);
  if (!target || (target.cardType !== "summoning" && target.cardType !== "echo")) return;

  detachRuneFromCurrent(player, rune.instanceId);
  rune.attachedToId = target.instanceId;
  target.attachedRuneIds.push(rune.instanceId);

  // Old summoning may have lost all runes -> sacrifice
  sacrificeRunelessSummonings(ctx, player);

  if (ctx.state.pendingDeathEffects.length > 0) {
    ctx.state.turnPhase = "resolve_death_effects";
  }
}
