import { Room, Client } from "@colyseus/core";
import { ArraySchema } from "@colyseus/schema";
import {
  GameState, Player, Card, PendingEffect,
  generateTestChaosDeck, generateTestRunesDeck, shuffleArray,
  SUMMONING_POOL, MEMORY_POOL, ECHO_POOL, CARD_REGISTRY,
  type CardDefinition, type SummoningDefinition, type MemoryDefinition, type RuneDefinition, type EchoDefinition,
} from "shared";

const STARTING_HAND_SIZE = 3;
const STARTING_RUNES = 3;
const MAX_BATTLEFIELD_SIZE = 7;

export class GameRoom extends Room<GameState> {
  private playerOrder: string[] = [];
  private pendingFinishEndTurn: boolean = false;

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

    this.onMessage("resolve_death_target", (client, message) => {
      this.handleResolveDeathTarget(client, message);
    });

    this.onMessage("resolve_deck_search", (client, message) => {
      this.handleResolveDeckSearch(client, message);
    });

    this.onMessage("resolve_end_turn_cancel", (client, message) => {
      this.handleResolveEndTurnCancel(client, message);
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

    // Generate and shuffle Chaos deck (using test deck)
    const chaosDefs = shuffleArray(generateTestChaosDeck());
    for (const def of chaosDefs) {
      player.chaosDeck.push(this.createCard(def));
    }

    // Generate Runes deck (using test deck — A, R, T only)
    const runeDefs = generateTestRunesDeck();
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

    // Random first player
    const firstPlayerIndex = Math.floor(Math.random() * 2);
    this.state.currentTurn = this.playerOrder[firstPlayerIndex];

    // Both players: draw 3 from Chaos deck
    this.state.players.forEach((player) => {
      for (let i = 0; i < STARTING_HAND_SIZE; i++) {
        this.drawChaosCard(player);
      }
    });

    // First player gets 3 starting rune writes
    const firstPlayer = this.state.players.get(this.state.currentTurn);
    if (firstPlayer) {
      firstPlayer.runesWrittenThisTurn = 0;
      firstPlayer.maxRuneWritesThisTurn = STARTING_RUNES;
    }

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

    // Allow rune writes: 3 on player's first turn, 1 otherwise
    currentPlayer.runesWrittenThisTurn = 0;
    currentPlayer.maxRuneWritesThisTurn = this.state.turnNumber <= 2 ? STARTING_RUNES : 1;

    this.state.turnPhase = "main";
    this.state.turnStartTime = new Date().toISOString();
  }

  private handleEndTurn(client: Client) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;
    if (this.state.turnPhase !== "main") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Check for end-of-turn effects (cancel_rune on cards with attached runes)
    const cardsWithEndTurnEffect = Array.from(player.battlefield)
      .filter((c): c is Card => c !== undefined)
      .filter((c) => {
        const def = this.findDefinition(c);
        if (!def || !("effect" in def) || !def.effect) return false;
        return def.effect.type === "end_turn" && def.effect.action.type === "cancel_rune" && c.attachedRuneIds.length > 0;
      });

    if (cardsWithEndTurnEffect.length > 0) {
      this.state.endTurnTargetCardId = cardsWithEndTurnEffect[0].instanceId;
      this.state.turnPhase = "end_turn_cancel_rune";
      return;
    }

    this.finishEndTurn();
  }

  private finishEndTurn() {
    // Heal all summonings for both players
    this.state.players.forEach((player) => {
      player.battlefield.forEach((card) => {
        card.health = card.maxHealth;
      });
    });

    // Switch player
    const currentIndex = this.playerOrder.indexOf(this.state.currentTurn);
    const nextIndex = (currentIndex + 1) % 2;
    this.state.currentTurn = this.playerOrder[nextIndex];
    this.state.turnNumber++;

    this.startTurn();
  }

  // ─── RUNE WRITING ──────────────────────────────────────

  private handleWriteRune(client: Client, message: { runeId: string }) {
    if (this.state.phase !== "playing") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Only current player can write runes
    if (this.state.currentTurn !== client.sessionId) return;

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

  private handleSummon(client: Client, message: { cardId: string; runeIds: string[]; chosenSubtype?: string }) {
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
    if (!this.validateRuneSpelling(player, card.spellName, message.runeIds, card.bloodCost, card.canOverpay)) return;

    // Detach runes from old summonings, then attach to new one
    for (const runeId of message.runeIds) {
      this.detachRuneFromCurrent(player, runeId);
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

    // Handle choose_subtype before placing on battlefield
    const summonDef = this.findDefinition(card);
    if (summonDef && 'effect' in summonDef && summonDef.effect &&
        summonDef.effect.type === "on_enter" && summonDef.effect.action.type === "choose_subtype") {
      const action = summonDef.effect.action;
      if (!message.chosenSubtype || !action.options.includes(message.chosenSubtype)) return;
      card.subtypes = message.chosenSubtype;
      // Apply abilities granted by the chosen subtype
      if (action.abilities && action.abilities[message.chosenSubtype]) {
        const extra = action.abilities[message.chosenSubtype];
        card.abilities = card.abilities ? `${card.abilities},${extra}` : extra;
        // Re-evaluate canAttack in case rage was granted
        card.canAttack = this.hasAbility(card, "rage");
        if (this.hasAbility(card, "aegis")) card.hasAegis = true;
      }
    }

    player.battlefield.push(card);

    // Old summonings may have lost runes → sacrifice
    this.sacrificeRunelessSummonings(player);

    // Handle on_enter effects
    this.handleOnEnterEffect(card, player);

    this.recalculateOngoingEffects();
    this.checkWinCondition();

    if (this.state.pendingDeathEffects.length > 0) {
      this.state.turnPhase = "resolve_death_effects";
    }
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

    if (!this.validateRuneSpelling(player, card.spellName, message.runeIds, card.bloodCost)) return;

    player.hand.splice(cardIndex, 1);
    player.battlefield.push(card);

    // Attach runes AFTER card is on battlefield so Colyseus tracks nested changes
    for (const runeId of message.runeIds) {
      this.detachRuneFromCurrent(player, runeId);
      const rune = player.runeField.find((r) => r.instanceId === runeId);
      if (rune) {
        rune.attachedToId = card.instanceId;
        card.attachedRuneIds.push(runeId);
      }
    }

    // Old summonings may have lost runes → sacrifice
    this.sacrificeRunelessSummonings(player);

    this.recalculateOngoingEffects();
    this.checkWinCondition();

    if (this.state.pendingDeathEffects.length > 0) {
      this.state.turnPhase = "resolve_death_effects";
    }
  }

  // ─── MEMORY PLAY ───────────────────────────────────────

  private handlePlayMemory(client: Client, message: { cardId: string; runeIds: string[]; targetId?: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.turnPhase !== "main") return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
    if (cardIndex === -1) return;

    const card = player.hand.at(cardIndex);
    if (!card || card.cardType !== "memory") return;

    // Validate rune spelling
    if (!this.validateRuneSpelling(player, card.spellName, message.runeIds, card.bloodCost)) return;

    // Cancel (remove) selected runes from rune field
    for (const runeId of message.runeIds) {
      this.detachRuneFromCurrent(player, runeId);
      const runeIndex = player.runeField.findIndex((r) => r.instanceId === runeId);
      if (runeIndex !== -1) {
        player.runeField.splice(runeIndex, 1);
      }
    }

    // Rune removal may orphan summonings
    this.sacrificeRunelessSummonings(player);

    // Remove from hand
    player.hand.splice(cardIndex, 1);

    // Execute effect
    this.handleMemoryEffect(card, player, message.targetId);

    // Send to graveyard
    player.graveyard.push(card);

    this.recalculateOngoingEffects();
    this.checkWinCondition();

    if (this.state.pendingDeathEffects.length > 0) {
      this.state.turnPhase = "resolve_death_effects";
    }
  }

  // ─── RUNE ATTACHMENT ───────────────────────────────────

  private handleAttachRune(client: Client, message: { runeId: string; targetId: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const rune = player.runeField.find((r) => r.instanceId === message.runeId);
    if (!rune || rune.etchingCounters > 0) return;

    const target = player.battlefield.find((c) => c.instanceId === message.targetId);
    if (!target || (target.cardType !== "summoning" && target.cardType !== "echo")) return;

    this.detachRuneFromCurrent(player, rune.instanceId);
    rune.attachedToId = target.instanceId;
    target.attachedRuneIds.push(rune.instanceId);

    // Old summoning may have lost all runes → sacrifice
    this.sacrificeRunelessSummonings(player);

    if (this.state.pendingDeathEffects.length > 0) {
      this.state.turnPhase = "resolve_death_effects";
    }
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

      // Shadowwalker: can only be blocked by/block other shadowwalkers
      const attackerIsShadow = this.hasAbility(attackerCard, "shadowwalker");
      const blockerIsShadow = this.hasAbility(blocker, "shadowwalker");
      if (attackerIsShadow !== blockerIsShadow) continue;

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
        // Lifedrinker: heal attacker's owner
        if (this.hasAbility(attackerCard, "lifedrinker")) {
          attackingPlayer.health = Math.min(
            attackingPlayer.health + attackerCard.attack,
            attackingPlayer.maxHealth
          );
        }
      } else {
        // Blocked — combat with blockers
        let remainingAttack = attackerCard.attack;
        const isDuelist = this.hasAbility(attackerCard, "duelist");

        for (const blockerId of blockerIds) {
          const blocker = defendingPlayer.battlefield.find((c) => c.instanceId === blockerId);
          if (!blocker) continue;

          if (isDuelist) {
            // Duelist: attacker deals damage first
            const dmgToBlocker = this.applyDamageToCreature(blocker, remainingAttack, defendingPlayer);
            remainingAttack -= blocker.health > 0 ? 0 : remainingAttack; // excess carries
            // Lifedrinker: heal attacker's owner by damage dealt to blocker
            if (this.hasAbility(attackerCard, "lifedrinker") && dmgToBlocker > 0) {
              attackingPlayer.health = Math.min(
                attackingPlayer.health + dmgToBlocker,
                attackingPlayer.maxHealth
              );
            }
            // Blocker only hits back if it survives
            if (blocker.health > 0) {
              const dmgToAttacker = this.applyDamageToCreature(attackerCard, blocker.attack, attackingPlayer);
              // Lifedrinker: heal blocker's owner by damage dealt to attacker
              if (this.hasAbility(blocker, "lifedrinker") && dmgToAttacker > 0) {
                defendingPlayer.health = Math.min(
                  defendingPlayer.health + dmgToAttacker,
                  defendingPlayer.maxHealth
                );
              }
            }
          } else {
            // Simultaneous damage
            const dmgToBlocker = this.applyDamageToCreature(blocker, remainingAttack, defendingPlayer);
            const dmgToAttacker = this.applyDamageToCreature(attackerCard, blocker.attack, attackingPlayer);
            // Lifedrinker: heal attacker's owner
            if (this.hasAbility(attackerCard, "lifedrinker") && dmgToBlocker > 0) {
              attackingPlayer.health = Math.min(
                attackingPlayer.health + dmgToBlocker,
                attackingPlayer.maxHealth
              );
            }
            // Lifedrinker: heal blocker's owner
            if (this.hasAbility(blocker, "lifedrinker") && dmgToAttacker > 0) {
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
        if (this.hasAbility(attackerCard, "fury") && remainingAttack > 0) {
          defendingPlayer.health -= remainingAttack;
        }
      }
    }

    // Clean up dead creatures
    this.cleanupDeadCreatures(attackingPlayer);
    this.cleanupDeadCreatures(defendingPlayer);

    // Recalculate ongoing effects (echoes may have died)
    this.recalculateOngoingEffects();

    // Clear combat state
    this.state.declaredAttackers.clear();
    this.state.blockingAssignments.clear();

    this.checkWinCondition();

    if (this.state.pendingDeathEffects.length > 0) {
      this.state.turnPhase = "resolve_death_effects";
    } else {
      this.state.turnPhase = "main";
    }
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
        if ((card.cardType === "summoning" || card.cardType === "echo") && card.attachedRuneIds.length === 0 && !this.hasAbility(card, "unbounded")) {
          player.battlefield.splice(i, 1);
          player.graveyard.push(card);
          sacrificed = true;
        }
      }
    }
  }

  // ─── ONGOING EFFECTS (ECHO AURAS) ─────────────────────

  /** Recalculate all ongoing buff effects from echoes on the battlefield. */
  private recalculateOngoingEffects() {
    this.state.players.forEach((player) => {
      // Sum friendly ongoing buffs from this player's echoes
      let buffAttack = 0;
      let buffHealth = 0;

      player.battlefield.forEach((card) => {
        if (card.cardType !== "echo") return;
        const def = this.findDefinition(card);
        if (!def || !("effect" in def) || !def.effect) return;
        if (def.effect.type !== "ongoing" || def.effect.action.type !== "buff") return;
        if (def.effect.action.target === "all_friendly" || def.effect.action.target === "all") {
          buffAttack += def.effect.action.attack;
          buffHealth += def.effect.action.health;
        }
      });

      // Sum debuffs from opponent's echoes targeting "all_enemy" or "all"
      const opponent = this.getOpponent(player.sessionId);
      if (opponent) {
        opponent.battlefield.forEach((card) => {
          if (card.cardType !== "echo") return;
          const def = this.findDefinition(card);
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
        if (this.hasAbility(card, "bloodmaster")) {
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
    this.state.players.forEach((player) => {
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
        this.handleOnDeathEffect(card, player);
        player.graveyard.push(card);
      }
      if (dead.length > 0) {
        this.sacrificeRunelessSummonings(player);
      }
    });

    if (this.state.pendingDeathEffects.length > 0) {
      this.state.turnPhase = "resolve_death_effects";
    }
  }

  // ─── EFFECTS ───────────────────────────────────────────

  private handleOnEnterEffect(card: Card, caster: Player) {
    const def = this.findDefinition(card);
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
        const copy = this.createCard(def);
        copy.canAttack = this.hasAbility(copy, "rage");
        copy.hasAegis = this.hasAbility(copy, "aegis");

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

    this.executeEffect(def.effect.action, caster);
  }

  private handleOnDeathEffect(card: Card, owner: Player) {
    // Revenge: immediate (no targeting needed)
    if (this.hasAbility(card, "revenge")) {
      const opponent = this.getOpponent(owner.sessionId);
      if (opponent) {
        opponent.health -= card.attack;
      }
    }

    // Deathstrike: queue targeted damage
    if (this.hasAbility(card, "deathstrike")) {
      const effect = new PendingEffect();
      effect.id = `de_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      effect.ownerSessionId = owner.sessionId;
      effect.effectType = "death_damage";
      effect.damageAmount = card.attack;
      effect.cardName = card.name;
      this.state.pendingDeathEffects.push(effect);
    }

    // On-death search_deck effect
    const def = this.findDefinition(card);
    if (def && 'effect' in def && def.effect && def.effect.type === "on_death") {
      if (def.effect.action.type === "search_deck") {
        const effect = new PendingEffect();
        effect.id = `de_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        effect.ownerSessionId = owner.sessionId;
        effect.effectType = "search_deck";
        effect.cardName = card.name;
        effect.searchFilter = def.effect.action.values.join(",");
        this.state.pendingDeathEffects.push(effect);
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

  private applyDamageToCreature(card: Card, amount: number, _owner: Player): number {
    if (amount <= 0) return 0;

    // Aegis: first damage instance is prevented
    if (card.hasAegis) {
      card.hasAegis = false;
      return 0;
    }

    // Veil check is for targeting, not damage application

    card.health -= amount;
    return amount;
  }

  // ─── VALIDATION ────────────────────────────────────────

  private validateRuneSpelling(player: Player, spellName: string, runeIds: string[], bloodCost: number = 0, canOverpay: boolean = false): boolean {
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

  // ─── RUNE TRANSFER HELPERS ──────────────────────────────

  /** Detach a rune from whatever summoning/echo it's currently attached to. */
  private detachRuneFromCurrent(player: Player, runeId: string) {
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

  /** Sacrifice any summoning that has 0 attached runes (unless Unbounded). */
  private sacrificeRunelessSummonings(player: Player) {
    let sacrificed = true;
    while (sacrificed) {
      sacrificed = false;
      for (let i = player.battlefield.length - 1; i >= 0; i--) {
        const card = player.battlefield.at(i);
        if (!card) continue;
        if ((card.cardType === "summoning" || card.cardType === "echo") && card.attachedRuneIds.length === 0 && !this.hasAbility(card, "unbounded")) {
          player.battlefield.splice(i, 1);
          this.handleOnDeathEffect(card, player);
          player.graveyard.push(card);
          sacrificed = true;
        }
      }
    }
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
    const echo = ECHO_POOL.find((d) => d.id === card.id);
    if (echo) return echo;
    const registry = CARD_REGISTRY.find((d) => d.id === card.id);
    if (registry) return registry;
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

  // ─── DEATH EFFECT RESOLUTION ──────────────────────────

  private handleResolveDeathTarget(client: Client, message: { targetId: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.turnPhase !== "resolve_death_effects") return;

    const effect = this.state.pendingDeathEffects.at(0);
    if (!effect || effect.effectType !== "death_damage" || effect.ownerSessionId !== client.sessionId) return;

    const caster = this.state.players.get(client.sessionId);
    if (!caster) return;
    const opponent = this.getOpponent(client.sessionId);

    const targetId = message.targetId;
    if (targetId === "opponent_hero") {
      if (opponent) opponent.health -= effect.damageAmount;
    } else if (targetId === "my_hero") {
      caster.health -= effect.damageAmount;
    } else {
      const target = this.findCardOnAnyBattlefield(targetId);
      if (target) {
        const owner = this.findOwner(targetId);
        if (owner) {
          this.applyDamageToCreature(target, effect.damageAmount, owner);
          this.cleanupDeadCreatures(owner);
          this.recalculateOngoingEffects();
        }
      }
    }

    this.state.pendingDeathEffects.splice(0, 1);
    this.checkWinCondition();
    this.advanceDeathEffectQueue();
  }

  private handleResolveDeckSearch(client: Client, message: { cardId: string | null }) {
    if (this.state.phase !== "playing") return;
    if (this.state.turnPhase !== "resolve_death_effects") return;

    const effect = this.state.pendingDeathEffects.at(0);
    if (!effect || effect.effectType !== "search_deck" || effect.ownerSessionId !== client.sessionId) return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    if (message.cardId) {
      const cardIndex = player.chaosDeck.findIndex((c) => c.instanceId === message.cardId);
      if (cardIndex !== -1) {
        const card = player.chaosDeck.at(cardIndex);
        if (card) {
          // Validate subtype match
          const filterValues = effect.searchFilter.split(",");
          const cardSubtypes = card.subtypes ? card.subtypes.split(",") : [];
          const matches = cardSubtypes.some((st) => filterValues.includes(st));
          if (matches && player.hand.length < 10) {
            player.chaosDeck.splice(cardIndex, 1);
            player.hand.push(card);
          }
        }
      }
    }

    this.state.pendingDeathEffects.splice(0, 1);
    this.advanceDeathEffectQueue();
  }

  private handleResolveEndTurnCancel(client: Client, message: { runeId: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.turnPhase !== "end_turn_cancel_rune") return;
    if (this.state.currentTurn !== client.sessionId) return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Find the rune on player's runeField
    const runeIndex = player.runeField.findIndex((r) => r.instanceId === message.runeId);
    if (runeIndex === -1) return;

    const rune = player.runeField.at(runeIndex);
    if (!rune) return;

    // Validate: rune must be attached to the target card
    if (rune.attachedToId !== this.state.endTurnTargetCardId) return;

    // Remove rune from runeField
    player.runeField.splice(runeIndex, 1);

    // Remove runeId from the card's attachedRuneIds
    const card = player.battlefield.find((c) => c.instanceId === this.state.endTurnTargetCardId);
    if (card) {
      const idx = card.attachedRuneIds.findIndex((id) => id === message.runeId);
      if (idx !== -1) {
        card.attachedRuneIds.splice(idx, 1);
      }
    }

    // Sacrifice runeless summonings
    this.sacrificeRunelessSummonings(player);

    // Check if more cards still need rune cancellation (exclude the just-processed card)
    const processedCardId = this.state.endTurnTargetCardId;
    const remaining = Array.from(player.battlefield)
      .filter((c): c is Card => c !== undefined)
      .filter((c) => {
        if (c.instanceId === processedCardId) return false;
        const def = this.findDefinition(c);
        if (!def || !("effect" in def) || !def.effect) return false;
        return def.effect.type === "end_turn" && def.effect.action.type === "cancel_rune" && c.attachedRuneIds.length > 0;
      });

    if (remaining.length > 0) {
      this.state.endTurnTargetCardId = remaining[0].instanceId;
    } else {
      this.state.endTurnTargetCardId = "";
      // Check for pending death effects (from sacrifice)
      if (this.state.pendingDeathEffects.length > 0) {
        this.state.turnPhase = "resolve_death_effects";
        // Mark that we need to finishEndTurn after death effects resolve
        this.pendingFinishEndTurn = true;
      } else {
        this.finishEndTurn();
      }
    }
  }

  private advanceDeathEffectQueue() {
    if (this.state.pendingDeathEffects.length > 0) {
      // Stay in resolve_death_effects; skip disconnected players' effects
      const next = this.state.pendingDeathEffects.at(0);
      if (next) {
        const owner = this.state.players.get(next.ownerSessionId);
        if (!owner || !owner.connected) {
          this.state.pendingDeathEffects.splice(0, 1);
          this.advanceDeathEffectQueue();
          return;
        }
      }
      this.state.turnPhase = "resolve_death_effects";
    } else {
      if (this.pendingFinishEndTurn) {
        this.pendingFinishEndTurn = false;
        this.finishEndTurn();
      } else {
        this.state.turnPhase = "main";
      }
    }
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
      card.baseAttack = def.attack;
      card.baseHealth = def.health;
      card.spellName = def.spellName;
      card.bloodCost = def.bloodCost || 0;
      card.canOverpay = def.canOverpay || false;
      card.abilities = def.abilities;
      card.subtypes = def.subtypes || "";
      card.description = def.description || "";
      if (def.effect && def.effect.type === "on_enter" && def.effect.action.type === "choose_subtype") {
        card.subtypeChoices = def.effect.action.options.join(",");
      }
    } else if (def.type === "echo") {
      card.spellName = def.spellName;
      card.bloodCost = def.bloodCost || 0;
      card.description = def.description;
      card.abilities = def.abilities;
    } else if (def.type === "memory") {
      card.spellName = def.spellName;
      card.bloodCost = def.bloodCost || 0;
      card.description = def.description;
    } else if (def.type === "rune") {
      card.letter = def.letter;
      card.runeType = def.runeType;
    }

    return card;
  }
}
