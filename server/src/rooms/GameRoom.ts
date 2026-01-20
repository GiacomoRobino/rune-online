import { Room, Client } from "@colyseus/core";
import { ArraySchema } from "@colyseus/schema";
import { GameState, Player, Card } from "../schema";
import { generateStarterDeck, shuffleArray, CARD_POOL, type CardDefinition } from "shared";

const MAX_MANA = 10;
const STARTING_HAND_SIZE = 3;
const MAX_BATTLEFIELD_SIZE = 7;

export class GameRoom extends Room<GameState> {
  private playerOrder: string[] = [];

  onCreate() {
    this.setState(new GameState());
    this.maxClients = 2;

    // Register message handlers
    this.onMessage("play_card", (client, message) => {
      this.handlePlayCard(client, message);
    });

    this.onMessage("attack", (client, message) => {
      this.handleAttack(client, message);
    });

    this.onMessage("end_turn", (client) => {
      this.handleEndTurn(client);
    });
  }

  onJoin(client: Client, options: { nickname?: string }) {
    console.log(`${client.sessionId} joined as ${options.nickname || "Anonymous"}`);

    // Create player
    const player = new Player();
    player.id = client.sessionId;
    player.sessionId = client.sessionId;
    player.nickname = options.nickname || `Player ${this.state.players.size + 1}`;
    player.health = 30;
    player.maxHealth = 30;
    player.mana = 0;
    player.maxMana = 0;

    // Generate and shuffle deck
    const deckDefinitions = shuffleArray(generateStarterDeck());
    for (const cardDef of deckDefinitions) {
      const card = this.createCard(cardDef);
      player.deck.push(card);
    }

    this.state.players.set(client.sessionId, player);
    this.playerOrder.push(client.sessionId);

    // Start game when 2 players join
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

    // If game is in progress and a player leaves, other player wins
    if (this.state.phase === "playing") {
      const opponent = this.getOpponent(client.sessionId);
      if (opponent) {
        this.endGame(opponent.sessionId);
      }
    }
  }

  private startGame() {
    this.state.phase = "playing";
    this.state.turnNumber = 1;

    // Randomly choose who goes first
    const firstPlayerIndex = Math.floor(Math.random() * 2);
    this.state.currentTurn = this.playerOrder[firstPlayerIndex];

    // Draw starting hands
    this.state.players.forEach((player) => {
      for (let i = 0; i < STARTING_HAND_SIZE; i++) {
        this.drawCard(player);
      }
    });

    // Second player gets an extra card (coin equivalent)
    const secondPlayer = this.state.players.get(this.playerOrder[1 - firstPlayerIndex]);
    if (secondPlayer) {
      this.drawCard(secondPlayer);
    }

    // Start first turn
    this.startTurn();

    console.log(`Game started! ${this.state.currentTurn} goes first`);
  }

  private startTurn() {
    const currentPlayer = this.state.players.get(this.state.currentTurn);
    if (!currentPlayer) return;

    // Increase max mana (up to 10)
    if (currentPlayer.maxMana < MAX_MANA) {
      currentPlayer.maxMana++;
    }

    // Refresh mana
    currentPlayer.mana = currentPlayer.maxMana;

    // Draw a card
    this.drawCard(currentPlayer);

    // Reset attack flags for minions
    currentPlayer.battlefield.forEach((card) => {
      card.hasAttacked = false;
      card.canAttack = true; // minions can attack after their first turn
    });

    this.state.turnStartTime = new Date().toISOString();
  }

  private handlePlayCard(client: Client, message: { cardId: string; targetId?: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Find card in hand
    const cardIndex = player.hand.findIndex((c) => c.instanceId === message.cardId);
    if (cardIndex === -1) return;

    const card = player.hand[cardIndex];
    if (!card) return;

    // Check mana cost
    if (player.mana < card.cost) return;

    // Check battlefield limit for minions
    if (card.cardType === "minion" && player.battlefield.length >= MAX_BATTLEFIELD_SIZE) {
      return;
    }

    // Spend mana
    player.mana -= card.cost;

    // Remove from hand
    player.hand.splice(cardIndex, 1);

    if (card.cardType === "minion") {
      // Place on battlefield (with summoning sickness)
      card.canAttack = false;
      player.battlefield.push(card);

      // Handle battlecry
      this.handleCardEffect(card, player, message.targetId);
    } else if (card.cardType === "spell") {
      // Handle spell effect
      this.handleCardEffect(card, player, message.targetId);
    }

    this.checkWinCondition();
  }

  private handleCardEffect(card: Card, caster: Player, targetId?: string) {
    const cardDef = CARD_POOL.find((c: CardDefinition) => c.id === card.id);
    if (!cardDef?.effect) return;

    const opponent = this.getOpponent(caster.sessionId);
    if (!opponent) return;

    const action = cardDef.effect.action;

    switch (action.type) {
      case "damage": {
        if (action.target === "enemy" && targetId) {
          // Targeted damage
          if (targetId === "hero") {
            opponent.health -= action.amount;
          } else {
            const targetCard = opponent.battlefield.find((c) => c.instanceId === targetId);
            if (targetCard) {
              this.damageCard(targetCard, action.amount, opponent);
            }
          }
        } else if (action.target === "random_enemy") {
          // Random enemy (minion or hero)
          const targets = [...opponent.battlefield.map((c) => c.instanceId), "hero"];
          const randomTarget = targets[Math.floor(Math.random() * targets.length)];
          if (randomTarget === "hero") {
            opponent.health -= action.amount;
          } else {
            const targetCard = opponent.battlefield.find((c) => c.instanceId === randomTarget);
            if (targetCard) {
              this.damageCard(targetCard, action.amount, opponent);
            }
          }
        } else if (action.target === "all_enemies") {
          opponent.health -= action.amount;
          opponent.battlefield.forEach((c) => {
            this.damageCard(c, action.amount, opponent);
          });
        }
        break;
      }
      case "heal": {
        if (action.target === "self") {
          caster.health = Math.min(caster.health + action.amount, caster.maxHealth);
        }
        break;
      }
      case "draw": {
        for (let i = 0; i < action.amount; i++) {
          this.drawCard(caster);
        }
        break;
      }
      case "buff": {
        // For now, only buff targeted friendly minion
        if (targetId) {
          const targetCard = caster.battlefield.find((c) => c.instanceId === targetId);
          if (targetCard) {
            targetCard.attack += action.attack;
            targetCard.health += action.health;
            targetCard.maxHealth += action.health;
          }
        }
        break;
      }
    }
  }

  private handleAttack(client: Client, message: { attackerId: string; targetId: string }) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;

    const player = this.state.players.get(client.sessionId);
    const opponent = this.getOpponent(client.sessionId);
    if (!player || !opponent) return;

    // Find attacker
    const attacker = player.battlefield.find((c) => c.instanceId === message.attackerId);
    if (!attacker) return;
    if (!attacker.canAttack || attacker.hasAttacked) return;

    attacker.hasAttacked = true;

    if (message.targetId === "hero") {
      // Attack opponent hero
      opponent.health -= attacker.attack;
    } else {
      // Attack minion
      const defender = opponent.battlefield.find((c) => c.instanceId === message.targetId);
      if (!defender) return;

      // Both deal damage to each other
      this.damageCard(defender, attacker.attack, opponent);
      this.damageCard(attacker, defender.attack, player);
    }

    this.checkWinCondition();
  }

  private handleEndTurn(client: Client) {
    if (this.state.phase !== "playing") return;
    if (this.state.currentTurn !== client.sessionId) return;

    // Switch to other player
    const currentIndex = this.playerOrder.indexOf(this.state.currentTurn);
    const nextIndex = (currentIndex + 1) % 2;
    this.state.currentTurn = this.playerOrder[nextIndex];
    this.state.turnNumber++;

    this.startTurn();
  }

  private drawCard(player: Player) {
    if (player.deck.length === 0) {
      // Fatigue damage (no cards left)
      player.health -= 1;
      return;
    }

    if (player.hand.length >= 10) {
      // Hand full, burn the card
      player.deck.shift();
      return;
    }

    const card = player.deck.shift();
    if (card) {
      player.hand.push(card);
    }
  }

  private damageCard(card: Card, amount: number, owner: Player) {
    card.health -= amount;
    if (card.health <= 0) {
      // Remove from battlefield
      const index = owner.battlefield.findIndex((c) => c.instanceId === card.instanceId);
      if (index !== -1) {
        owner.battlefield.splice(index, 1);
      }
      // TODO: Handle deathrattle effects
    }
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

  private getOpponent(sessionId: string): Player | undefined {
    let opponent: Player | undefined;
    this.state.players.forEach((player, id) => {
      if (id !== sessionId) {
        opponent = player;
      }
    });
    return opponent;
  }

  private createCard(def: CardDefinition): Card {
    const card = new Card();
    card.id = def.id;
    card.instanceId = `${def.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    card.name = def.name;
    card.cost = def.cost;
    card.attack = def.attack;
    card.health = def.health;
    card.maxHealth = def.health;
    card.description = def.description || "";
    card.cardType = def.type;
    card.canAttack = false;
    card.hasAttacked = false;
    return card;
  }
}
