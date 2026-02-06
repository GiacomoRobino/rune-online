import { Room, Client } from "@colyseus/core";
import { ArraySchema } from "@colyseus/schema";
import {
  GameState, Player, Card,
  generateChaosStarterDeck, generateRunesStarterDeck, shuffleArray,
  SUMMONING_POOL, MEMORY_POOL,
  type CardDefinition, type SummoningDefinition, type MemoryDefinition, type RuneDefinition,
} from "shared";

const STARTING_HAND_SIZE = 3;
const STARTING_RUNES = 3;
const MAX_BATTLEFIELD_SIZE = 7;

export class GameRoom extends Room<GameState> {
  private playerOrder: string[] = [];

  onCreate() {
    this.setState(new GameState());
    this.maxClients = 2;

    this.onMessage("write_rune", (client, message) => {
      this.handleWriteRune(client, message);
    });

    this.onMessage("summon", (client, message) => {
      this.handleSummon(client, message);
    });

    this.onMessage("play_echo", (client, message) => {
      this.handlePlayEcho(client, message);
    });

    this.onMessage("play_memory", (client, message) => {
      this.handlePlayMemory(client, message);
    });

    this.onMessage("attach_rune", (client, message) => {
      this.handleAttachRune(client, message);
    });

    this.onMessage("declare_attackers", (client, message) => {
      this.handleDeclareAttackers(client, message);
    });

    this.onMessage("declare_blockers", (client, message) => {
      this.handleDeclareBlockers(client, message);
    });

    this.onMessage("end_turn", (client) => {
      this.handleEndTurn(client);
    });
  }

  onJoin(client: Client, options: { nickname?: string }) {
    console.log(`${client.sessionId} joined as ${options.nickname || "Anonymous"}`);

    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.nickname = options.nickname || `Player ${this.state.players.size + 1}`;
    player.health = 20;
    player.maxHealth = 20;

    // Generate and shuffle Chaos deck
    const chaosDefs = shuffleArray(generateChaosStarterDeck());
    for (const def of chaosDefs) {
      player.chaosDeck.push(this.createCard(def));
    }

    // Generate Runes deck (player will choose which to write)
    const runeDefs = generateRunesStarterDeck();
    for (const def of runeDefs) {
      player.runesDeck.push(this.createCard(def));
    }

    this.state.players.set(client.sessionId, player);
    this.playerOrder.push(client.sessionId);

    if (this.state.players.size === 2) {
      this.startGame();
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`${client.sessionId} left (consented: ${consented})`);

    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.connected = false;
    }

    if (this.state.phase === "playing") {
      const opponent = this.getOpponent(client.sessionId);
      if (opponent) {
        this.endGame(opponent.sessionId);
      }
    }
  }

  // ─── GAME START ─────────────────────────────────────────

  private startGame() {
    this.state.phase = "playing";
    this.state.turnNumber = 1;
    this.state.isFirstTurn = true;

    // Random first player
    const firstPlayerIndex = Math.floor(Math.random() * 2);
    this.state.currentTurn = this.playerOrder[firstPlayerIndex];

    // Both players: draw 3 from Chaos deck, allow 3 rune writes
    this.state.players.forEach((player) => {
      for (let i = 0; i < STARTING_HAND_SIZE; i++) {
        this.drawChaosCard(player);
      }
      player.runesWrittenThisTurn = 0;
      player.maxRuneWritesThisTurn = STARTING_RUNES;
    });

    this.state.turnPhase = "main";
    this.state.turnStartTime = new Date().toISOString();
    console.log(`Game started! ${this.state.currentTurn} goes first`);
  }

  // ─── TURN STRUCTURE ─────────────────────────────────────

  private startTurn() {
    const currentPlayer = this.state.players.get(this.state.currentTurn);
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
    this.drawChaosCard(currentPlayer);

    // Allow 1 rune write this turn (player chooses)
    currentPlayer.runesWrittenThisTurn = 0;
    currentPlayer.maxRuneWritesThisTurn = 1;

    this.state.turnPhase = "main";
    this.state.turnStartTime = new Date().toISOString();
  }

  private handleEndTurn(client: Client) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.state.turnPhase !== "main") return;

    // Switch player
    const currentIndex = this.playerOrder.indexOf(this.state.currentTurn);
    const nextIndex = (currentIndex + 1) % 2;
    this.state.currentTurn = this.playerOrder[nextIndex];
    this.state.turnNumber++;
    this.state.isFirstTurn = false;

    this.startTurn();
  }

  // ─── RUNE WRITING ──────────────────────────────────────

  private handleWriteRune(client: Client, message: { runeId: string }) {
    if (this.state.phase !== "playing") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // On first turn both players can write; on later turns only current player
    if (!this.state.isFirstTurn && this.state.currentTurn !== client.sessionId) return;

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
    }

    // Stone runes enter with 1 etching counter
    if (rune.runeType === "stone") {
      rune.etchingCounters = 1;
    }

    player.runeField.push(rune);
    player.runesWrittenThisTurn++;

    this.checkWinCondition();
  }

  // ─── CARD DRAWING ──────────────────────────────────────

  private drawChaosCard(player: Player) {
    if (player.chaosDeck.length === 0) return; // no fatigue

    if (player.hand.length >= 10) {
      player.chaosDeck.shift(); // burn
      return;
    }

    const card = player.chaosDeck.shift();
    if (card) {
      player.hand.push(card);
    }
  }

  // ─── SUMMONING ─────────────────────────────────────────

  private handleSummon(client: Client, message: { cardId: string; runeIds: string[] }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.state.turnPhase !== "main") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Find card in hand
    const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
    if (cardIndex === -1) return;

    const card = player.hand.at(cardIndex);
    if (!card || card.cardType !== "summoning") return;

    // Check battlefield limit
    if (player.battlefield.length >= MAX_BATTLEFIELD_SIZE) return;

    // Validate rune spelling
    if (!this.validateRuneSpelling(player, card.spellName, message.runeIds)) return;

    // Attach runes to summoning
    for (const runeId of message.runeIds) {
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (rune) {
        rune.attachedToId = card.instanceId;
        card.attachedRuneIds.push(runeId);
      }
    }

    // Remove from hand, place on battlefield
    player.hand.splice(cardIndex, 1);
    card.canAttack = this.hasAbility(card, "rage");
    card.hasAttacked = false;
    card.isTapped = false;

    // Aegis
    if (this.hasAbility(card, "aegis")) {
      card.hasAegis = true;
    }

    player.battlefield.push(card);

    // Handle on_enter effects
    this.handleOnEnterEffect(card, player);

    this.checkWinCondition();
  }

  // ─── ECHO PLAY ─────────────────────────────────────────

  private handlePlayEcho(client: Client, message: { cardId: string; runeIds: string[] }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.state.turnPhase !== "main") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
    if (cardIndex === -1) return;

    const card = player.hand.at(cardIndex);
    if (!card || card.cardType !== "echo") return;

    if (!this.validateRuneSpelling(player, card.spellName, message.runeIds)) return;

    // Attach runes
    for (const runeId of message.runeIds) {
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (rune) {
        rune.attachedToId = card.instanceId;
        card.attachedRuneIds.push(runeId);
      }
    }

    player.hand.splice(cardIndex, 1);
    player.battlefield.push(card);

    this.checkWinCondition();
  }

  // ─── MEMORY PLAY ───────────────────────────────────────

  private handlePlayMemory(client: Client, message: { cardId: string; targetId?: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.state.turnPhase !== "main") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
    if (cardIndex === -1) return;

    const card = player.hand.at(cardIndex);
    if (!card || card.cardType !== "memory") return;

    // Remove from hand
    player.hand.splice(cardIndex, 1);

    // Execute effect
    this.handleMemoryEffect(card, player, message.targetId);

    // Send to graveyard
    player.graveyard.push(card);

    this.checkWinCondition();
  }

  // ─── RUNE ATTACHMENT ───────────────────────────────────

  private handleAttachRune(client: Client, message: { runeId: string; targetId: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const rune = player.runeField.find((r) => r.instanceId === message.runeId);
    if (!rune || rune.attachedToId !== "" || rune.etchingCounters > 0) return;

    const target = player.battlefield.find((c) => c.instanceId === message.targetId);
    if (!target || (target.cardType !== "summoning" && target.cardType !== "echo")) return;

    rune.attachedToId = target.instanceId;
    target.attachedRuneIds.push(rune.instanceId);
  }

  // ─── COMBAT: DECLARE ATTACKERS ─────────────────────────

  private handleDeclareAttackers(client: Client, message: { attackerIds: string[] }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.state.turnPhase !== "main") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Validate attackers
    const validAttackerIds: string[] = [];
    for (const id of message.attackerIds) {
      const card = player.battlefield.find((c) => c.instanceId === id);
      if (!card) continue;
      if (card.cardType !== "summoning") continue;
      if (card.isTapped || card.hasAttacked || !card.canAttack) continue;
      if (this.hasAbility(card, "defender")) continue;
      validAttackerIds.push(id);
    }

    if (validAttackerIds.length === 0) return;

    // Tap attackers (unless Warden)
    for (const id of validAttackerIds) {
      const card = player.battlefield.find((c) => c.instanceId === id);
      if (card && !this.hasAbility(card, "warden")) {
        card.isTapped = true;
      }
      if (card) {
        card.hasAttacked = true;
      }
    }

    // Store declared attackers
    this.state.declaredAttackers.clear();
    for (const id of validAttackerIds) {
      this.state.declaredAttackers.push(id);
    }

    // Check if opponent has any creatures that can block
    const opponent = this.getOpponent(client.sessionId);
    if (!opponent) return;

    const canAnyBlock = opponent.battlefield.some(
      (c) => c.cardType === "summoning" && !c.isTapped
    );

    if (canAnyBlock) {
      this.state.turnPhase = "declare_blockers";
    } else {
      // No blockers possible, resolve immediately
      this.state.blockingAssignments.clear();
      this.resolveCombatDamage();
    }
  }

  // ─── COMBAT: DECLARE BLOCKERS ──────────────────────────

  private handleDeclareBlockers(client: Client, message: { assignments: string[] }) {
    if (this.state.phase !== "playing") return;
    if (this.state.turnPhase !== "declare_blockers") return;

    // Only the defending player (opponent of current turn) can declare blockers
    if (this.state.currentTurn === client.sessionId) return;

    const defender = this.state.players.get(client.sessionId);
    if (!defender) return;

    const attacker = this.state.players.get(this.state.currentTurn);
    if (!attacker) return;

    // Validate assignments
    this.state.blockingAssignments.clear();
    for (const assignment of message.assignments) {
      const [blockerId, attackerId] = assignment.split(":");
      if (!blockerId || !attackerId) continue;

      const blocker = defender.battlefield.find((c) => c.instanceId === blockerId);
      if (!blocker || blocker.cardType !== "summoning" || blocker.isTapped) continue;

      const attackerCard = attacker.battlefield.find((c) => c.instanceId === attackerId);
      if (!attackerCard) continue;

      // Skyrunner can only be blocked by Skyrunner
      if (this.hasAbility(attackerCard, "skyrunner") && !this.hasAbility(blocker, "skyrunner")) continue;

      // Shadowwalker can't be blocked
      if (this.hasAbility(attackerCard, "shadowwalker")) continue;

      this.state.blockingAssignments.push(assignment);
    }

    this.resolveCombatDamage();
  }

  // ─── COMBAT: RESOLVE DAMAGE ────────────────────────────

  private resolveCombatDamage() {
    this.state.turnPhase = "combat_damage";

    const attackingPlayer = this.state.players.get(this.state.currentTurn);
    if (!attackingPlayer) return;

    const defendingPlayer = this.getOpponent(this.state.currentTurn);
    if (!defendingPlayer) return;

    // Build blocking map: attackerId -> blockerId[]
    const blockMap = new Map<string, string[]>();
    for (let i = 0; i < this.state.blockingAssignments.length; i++) {
      const assignment = this.state.blockingAssignments.at(i);
      if (!assignment) continue;
      const [blockerId, attackerId] = assignment.split(":");
      if (!blockerId || !attackerId) continue;
      if (!blockMap.has(attackerId)) {
        blockMap.set(attackerId, []);
      }
      blockMap.get(attackerId)!.push(blockerId);
    }

    // Process each attacker
    for (let i = 0; i < this.state.declaredAttackers.length; i++) {
      const attackerId = this.state.declaredAttackers.at(i);
      if (!attackerId) continue;
      const attackerCard = attackingPlayer.battlefield.find((c) => c.instanceId === attackerId);
      if (!attackerCard) continue;

      const blockerIds = blockMap.get(attackerId) || [];

      if (blockerIds.length === 0) {
        // Unblocked — damage to defending player
        defendingPlayer.health -= attackerCard.attack;
      } else {
        // Blocked — combat with blockers
        let remainingAttack = attackerCard.attack;
        const isDuelist = this.hasAbility(attackerCard, "duelist");

        for (const blockerId of blockerIds) {
          const blocker = defendingPlayer.battlefield.find((c) => c.instanceId === blockerId);
          if (!blocker) continue;

          if (isDuelist) {
            // Duelist: attacker deals damage first
            this.applyDamageToCreature(blocker, remainingAttack, defendingPlayer);
            remainingAttack -= blocker.health > 0 ? 0 : remainingAttack; // excess carries
            // Blocker only hits back if it survives
            if (blocker.health > 0) {
              this.applyDamageToCreature(attackerCard, blocker.attack, attackingPlayer);
            }
          } else {
            // Simultaneous damage
            this.applyDamageToCreature(blocker, remainingAttack, defendingPlayer);
            this.applyDamageToCreature(attackerCard, blocker.attack, attackingPlayer);
          }

          // Track remaining damage for Fury
          if (blocker.health <= 0) {
            remainingAttack = Math.max(0, remainingAttack - blocker.maxHealth);
          } else {
            remainingAttack = 0;
          }
        }

        // Fury: excess damage goes to defending player
        if (this.hasAbility(attackerCard, "fury") && remainingAttack > 0) {
          defendingPlayer.health -= remainingAttack;
        }
      }
    }

    // Clean up dead creatures
    this.cleanupDeadCreatures(attackingPlayer);
    this.cleanupDeadCreatures(defendingPlayer);

    // Clear combat state
    this.state.declaredAttackers.clear();
    this.state.blockingAssignments.clear();
    this.state.turnPhase = "main";

    this.checkWinCondition();
  }

  // ─── CREATURE DEATH & RUNE PERSISTENCE ─────────────────

  private cleanupDeadCreatures(player: Player) {
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
      // Handle on_death effects
      this.handleOnDeathEffect(card, player);

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
        if (card.cardType === "summoning" && card.attachedRuneIds.length === 0 && !this.hasAbility(card, "unbounded")) {
          player.battlefield.splice(i, 1);
          player.graveyard.push(card);
          sacrificed = true;
        }
      }
    }
  }

  // ─── EFFECTS ───────────────────────────────────────────

  private handleOnEnterEffect(card: Card, caster: Player) {
    const def = this.findDefinition(card);
    if (!def || !('effect' in def) || !def.effect) return;
    if (def.effect.type !== "on_enter") return;

    this.executeEffect(def.effect.action, caster);
  }

  private handleOnDeathEffect(card: Card, owner: Player) {
    const def = this.findDefinition(card);
    if (!def || !('effect' in def) || !def.effect) return;
    if (def.effect.type !== "on_death") return;

    // Revenge: deal attack damage to opponent
    if (this.hasAbility(card, "revenge")) {
      const opponent = this.getOpponent(owner.sessionId);
      if (opponent) {
        opponent.health -= card.attack;
      }
    }
  }

  private handleMemoryEffect(card: Card, caster: Player, targetId?: string) {
    const def = this.findDefinition(card);
    if (!def || !('effect' in def) || !def.effect) return;

    this.executeEffect(def.effect.action, caster, targetId);
  }

  private executeEffect(action: { type: string; [key: string]: any }, caster: Player, targetId?: string) {
    const opponent = this.getOpponent(caster.sessionId);
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
            const target = this.findCardOnAnyBattlefield(targetId);
            if (target) {
              const owner = this.findOwner(targetId);
              if (owner) {
                this.applyDamageToCreature(target, amount, owner);
                this.cleanupDeadCreatures(owner);
              }
            }
          }
        } else if (action.target === "enemy") {
          if (targetId === "opponent_hero" || targetId === "hero") {
            opponent.health -= amount;
          } else if (targetId) {
            const target = opponent.battlefield.find((c) => c.instanceId === targetId);
            if (target) {
              this.applyDamageToCreature(target, amount, opponent);
              this.cleanupDeadCreatures(opponent);
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
              this.applyDamageToCreature(target, amount, opponent);
              this.cleanupDeadCreatures(opponent);
            }
          }
        } else if (action.target === "all_enemies") {
          opponent.health -= amount;
          opponent.battlefield.forEach((c) => {
            this.applyDamageToCreature(c, amount, opponent);
          });
          this.cleanupDeadCreatures(opponent);
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
          this.drawChaosCard(caster);
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

  // ─── DAMAGE HELPERS ────────────────────────────────────

  private applyDamageToCreature(card: Card, amount: number, owner: Player) {
    if (amount <= 0) return;

    // Aegis: first damage instance is prevented
    if (card.hasAegis) {
      card.hasAegis = false;
      return;
    }

    // Veil check is for targeting, not damage application

    card.health -= amount;
  }

  // ─── VALIDATION ────────────────────────────────────────

  private validateRuneSpelling(player: Player, spellName: string, runeIds: string[]): boolean {
    if (runeIds.length !== spellName.length) return false;

    // Collect letters needed
    const needed = spellName.split("").slice().sort();

    // Collect letters from selected runes
    const provided: string[] = [];
    for (const runeId of runeIds) {
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (!rune) return false;
      if (rune.attachedToId !== "") return false; // already attached
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

  // ─── ABILITY HELPERS ───────────────────────────────────

  private hasAbility(card: Card, keyword: string): boolean {
    if (!card.abilities) return false;
    return card.abilities.split(",").some((a) => a.trim() === keyword);
  }

  private findDefinition(card: Card): CardDefinition | undefined {
    const summoning = SUMMONING_POOL.find((d) => d.id === card.id);
    if (summoning) return summoning;
    const memory = MEMORY_POOL.find((d) => d.id === card.id);
    if (memory) return memory;
    return undefined;
  }

  private findCardOnAnyBattlefield(instanceId: string): Card | undefined {
    let found: Card | undefined;
    this.state.players.forEach((player) => {
      const card = player.battlefield.find((c) => c.instanceId === instanceId);
      if (card) found = card;
    });
    return found;
  }

  private findOwner(instanceId: string): Player | undefined {
    let owner: Player | undefined;
    this.state.players.forEach((player) => {
      const card = player.battlefield.find((c) => c.instanceId === instanceId);
      if (card) owner = player;
    });
    return owner;
  }

  // ─── UTILITY ───────────────────────────────────────────

  private getOpponent(sessionId: string): Player | undefined {
    let opponent: Player | undefined;
    this.state.players.forEach((player, id) => {
      if (id !== sessionId) {
        opponent = player;
      }
    });
    return opponent;
  }

  private checkWinCondition() {
    this.state.players.forEach((player, sessionId) => {
      if (player.health <= 0) {
        const opponent = this.getOpponent(sessionId);
        if (opponent) {
          this.endGame(opponent.sessionId);
        }
      }
    });
  }

  private endGame(winnerId: string) {
    this.state.phase = "ended";
    this.state.winner = winnerId;
    console.log(`Game ended! Winner: ${winnerId}`);
  }

  private createCard(def: CardDefinition): Card {
    const card = new Card();
    card.id = def.id;
    card.instanceId = `${def.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    card.name = def.name;
    card.cardType = def.type;

    if (def.type === "summoning") {
      card.attack = def.attack;
      card.health = def.health;
      card.maxHealth = def.health;
      card.spellName = def.spellName;
      card.abilities = def.abilities;
      card.description = def.description || "";
    } else if (def.type === "echo") {
      card.spellName = def.spellName;
      card.description = def.description;
      card.abilities = def.abilities;
    } else if (def.type === "memory") {
      card.description = def.description;
    } else if (def.type === "rune") {
      card.letter = def.letter;
      card.runeType = def.runeType;
    }

    return card;
  }
}
