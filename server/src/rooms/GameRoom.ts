import { Room, Client } from "@colyseus/core";
import {
  GameState, Player,
  shuffleArray, buildDecksFromList,
  type JoinOptions,
} from "shared";
import { type GameContext } from "./context.js";
import { createCard, endGame, getOpponent } from "./utils.js";
import { handleWriteRune, handleAttachRune } from "./runeHandlers.js";
import { startGame, handleEndTurn, handleMulliganKeep, handleMulliganRedraw } from "./lifecycle.js";
import { handleSummon, handlePlayEcho, handlePlayMemory } from "./cardPlay.js";
import { handleDeclareAttackers, handleDeclareBlockers } from "./combatDeclare.js";
import { handleResolveDeathTarget, handleResolveDeckSearch, handleResolveWriteRune, handleResolveEndTurnCancel, handleResolveDeathPreventionCancel } from "./deathResolution.js";
import { getDeck, getAvailableDecks } from "../deckLoader.js";

export class GameRoom extends Room<GameState> {
  private ctx: GameContext = { state: null as any, playerOrder: [], pendingFinishEndTurn: false, pendingCombatContinue: false };

  onCreate() {
    this.setState(new GameState());
    this.ctx.state = this.state;
    this.maxClients = 2;

    this.onMessage("write_rune", (client, message) => handleWriteRune(this.ctx, client, message));
    this.onMessage("summon", (client, message) => handleSummon(this.ctx, client, message));
    this.onMessage("play_echo", (client, message) => handlePlayEcho(this.ctx, client, message));
    this.onMessage("play_memory", (client, message) => handlePlayMemory(this.ctx, client, message));
    this.onMessage("attach_rune", (client, message) => handleAttachRune(this.ctx, client, message));
    this.onMessage("declare_attackers", (client, message) => handleDeclareAttackers(this.ctx, client, message));
    this.onMessage("declare_blockers", (client, message) => handleDeclareBlockers(this.ctx, client, message));
    this.onMessage("end_turn", (client) => handleEndTurn(this.ctx, client));
    this.onMessage("mulligan_keep", (client) => handleMulliganKeep(this.ctx, client));
    this.onMessage("mulligan_redraw", (client) => handleMulliganRedraw(this.ctx, client));
    this.onMessage("resolve_death_target", (client, message) => handleResolveDeathTarget(this.ctx, client, message));
    this.onMessage("resolve_deck_search", (client, message) => handleResolveDeckSearch(this.ctx, client, message));
    this.onMessage("resolve_write_rune", (client, message) => handleResolveWriteRune(this.ctx, client, message));
    this.onMessage("resolve_end_turn_cancel", (client, message) => handleResolveEndTurnCancel(this.ctx, client, message));
    this.onMessage("resolve_death_prevention_cancel", (client, message) => handleResolveDeathPreventionCancel(this.ctx, client, message));
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`${client.sessionId} joined as ${options.nickname || "Anonymous"} with deck "${options.deckName}"`);

    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.nickname = options.nickname || `Player ${this.state.players.size + 1}`;
    player.health = 20;
    player.maxHealth = 20;

    // Look up selected deck, fall back to first available
    const deckEntries = getDeck(options.deckName) ?? getDeck(getAvailableDecks()[0]!);
    if (!deckEntries) {
      throw new Error("No decks available");
    }
    const { chaosDeck: chaosDefs, runesDeck: runeDefs } = buildDecksFromList(deckEntries);

    // Shuffle and load chaos deck
    for (const def of shuffleArray(chaosDefs)) {
      player.chaosDeck.push(createCard(def));
    }

    // Load runes deck
    for (const def of runeDefs) {
      player.runesDeck.push(createCard(def));
    }

    this.state.players.set(client.sessionId, player);
    this.ctx.playerOrder.push(client.sessionId);

    if (this.state.players.size === 2) {
      startGame(this.ctx);
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`${client.sessionId} left (consented: ${consented})`);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
    }

    if (this.state.phase === "playing" || this.state.phase === "mulligan") {
      const opponent = getOpponent(this.ctx, client.sessionId);
      if (opponent) {
        endGame(this.ctx, opponent.sessionId);
      }
    }
  }
}
