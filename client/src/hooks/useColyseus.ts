import { useState, useCallback, useRef, useEffect } from "react";
import { Client, Room } from "colyseus.js";

// Types matching server schema
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
  const [room, setRoom] = useState<Room | null>(null);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [mySessionId, setMySessionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const clientRef = useRef<Client | null>(null);

  // Initialize client
  useEffect(() => {
    clientRef.current = new Client(SERVER_URL);
  }, []);

  // Convert Colyseus schema to plain object
  const schemaToPlain = useCallback((state: any): GameStateData => {
    const players = new Map<string, PlayerState>();

    state.players.forEach((player: any, key: string) => {
      players.set(key, {
        id: player.id,
        sessionId: player.sessionId,
        nickname: player.nickname,
        health: player.health,
        maxHealth: player.maxHealth,
        mana: player.mana,
        maxMana: player.maxMana,
        hand: Array.from(player.hand).map((c: any) => ({ ...c })),
        battlefield: Array.from(player.battlefield).map((c: any) => ({ ...c })),
        deck: Array.from(player.deck).map((c: any) => ({ ...c })),
        connected: player.connected,
      });
    });

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
      const joinedRoom = await clientRef.current.joinOrCreate("game", { nickname });

      setRoom(joinedRoom);
      setMySessionId(joinedRoom.sessionId);
      setConnectionState("connected");

      // Listen for state changes
      joinedRoom.onStateChange((state) => {
        setGameState(schemaToPlain(state));
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
