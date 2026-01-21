import { useState, useCallback, useRef, useEffect } from "react";
import { Client, Room } from "colyseus.js";
import { GameState, Player, Card } from "shared";

// Plain object types for React state (derived from schema)
export interface CardState {
  id: string;
  instanceId: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  maxHealth: number;
  description: string;
  cardType: string;
  canAttack: boolean;
  hasAttacked: boolean;
}

export interface PlayerState {
  id: string;
  sessionId: string;
  nickname: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  hand: CardState[];
  battlefield: CardState[];
  deck: CardState[];
  connected: boolean;
}

export interface GameStateData {
  phase: string;
  currentTurn: string;
  turnNumber: number;
  players: Map<string, PlayerState>;
  winner: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

export function useColyseus() {
  const [room, setRoom] = useState<Room<GameState> | null>(null);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [mySessionId, setMySessionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const clientRef = useRef<Client | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new Client(SERVER_URL);
  }, []);

  // Helper to convert a card schema to plain object
  const cardToPlain = (c: Card): CardState => ({
    id: c.id,
    instanceId: c.instanceId,
    name: c.name,
    cost: c.cost,
    attack: c.attack,
    health: c.health,
    maxHealth: c.maxHealth,
    description: c.description,
    cardType: c.cardType,
    canAttack: c.canAttack,
    hasAttacked: c.hasAttacked,
  });

  // Convert Colyseus schema to plain object
  const schemaToPlain = useCallback((state: GameState): GameStateData => {
    const players = new Map<string, PlayerState>();

    // Debug: Check what methods are available on state.players
    console.log("[DEBUG] state.players type:", typeof state.players);
    console.log("[DEBUG] state.players:", state.players);
    console.log("[DEBUG] state.players.size:", state.players.size);
    console.log("[DEBUG] state.players keys:", Object.keys(state.players));
    console.log("[DEBUG] has forEach:", typeof state.players.forEach);
    console.log("[DEBUG] has entries:", typeof state.players.entries);

    // Try forEach which is the standard MapSchema iteration method
    state.players.forEach((player: Player, key: string) => {
      console.log("[DEBUG] forEach iteration - key:", key, "player:", player);
      players.set(key, {
        id: player.id,
        sessionId: player.sessionId,
        nickname: player.nickname,
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.mana,
        maxMana: player.maxMana,
        hand: Array.from(player.hand).filter((c): c is Card => c !== undefined).map(cardToPlain),
        battlefield: Array.from(player.battlefield).filter((c): c is Card => c !== undefined).map(cardToPlain),
        deck: Array.from(player.deck).filter((c): c is Card => c !== undefined).map(cardToPlain),
        connected: player.connected,
      });
    });

    console.log("[DEBUG] After forEach, players.size:", players.size);

    return {
      phase: state.phase,
      currentTurn: state.currentTurn,
      turnNumber: state.turnNumber,
      players,
      winner: state.winner,
    };
  }, []);

  const joinGame = useCallback(async (nickname: string) => {
    if (!clientRef.current) return;

    setConnectionState("connecting");
    setError("");

    try {
      const joinedRoom = await clientRef.current.joinOrCreate<GameState>("game", { nickname });

      setRoom(joinedRoom);
      setMySessionId(joinedRoom.sessionId);
      setConnectionState("connected");

      // Listen for state changes
      joinedRoom.onStateChange((state: GameState) => {
        console.log("[DEBUG] onStateChange fired");
        console.log("[DEBUG] Players size:", state.players.size);
        console.log("[DEBUG] Phase:", state.phase);
        state.players.forEach((player: Player, key: string) => {
          console.log(`[DEBUG] Player ${key}:`, player.sessionId, player.nickname);
        });
        const converted = schemaToPlain(state);
        console.log("[DEBUG] Converted players size:", converted.players.size);
        setGameState(converted);
      });

      joinedRoom.onLeave((code) => {
        console.log("Left room with code:", code);
        setConnectionState("disconnected");
        setRoom(null);
        setGameState(null);
      });

      joinedRoom.onError((code, message) => {
        console.error("Room error:", code, message);
        setError(`Error: ${message}`);
      });
    } catch (e) {
      console.error("Failed to join:", e);
      setError("Failed to connect to server");
      setConnectionState("disconnected");
    }
  }, [schemaToPlain]);

  const leaveGame = useCallback(() => {
    if (room) {
      room.leave();
      setRoom(null);
      setGameState(null);
      setConnectionState("disconnected");
    }
  }, [room]);

  const playCard = useCallback((cardId: string, targetId?: string) => {
    if (!room) return;
    room.send("play_card", { cardId, targetId });
  }, [room]);

  const attack = useCallback((attackerId: string, targetId: string) => {
    if (!room) return;
    room.send("attack", { attackerId, targetId });
  }, [room]);

  const endTurn = useCallback(() => {
    if (!room) return;
    room.send("end_turn", {});
  }, [room]);

  // Derived state helpers
  const myPlayer = gameState?.players.get(mySessionId);
  const opponent = gameState
    ? Array.from(gameState.players.values()).find((p) => p.sessionId !== mySessionId)
    : undefined;
  const isMyTurn = gameState?.currentTurn === mySessionId;

  return {
    // Connection
    connectionState,
    error,
    joinGame,
    leaveGame,
    mySessionId,

    // Game state
    gameState,
    myPlayer,
    opponent,
    isMyTurn,

    // Actions
    playCard,
    attack,
    endTurn,
  };
}
