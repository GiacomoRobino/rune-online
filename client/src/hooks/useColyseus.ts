import { useState, useCallback, useRef, useEffect } from "react";
import { Client, Room } from "colyseus.js";
import { GameState, Player, Card, PendingEffect } from "shared";
import { useGameEvents } from "./useGameEvents";

// Plain object types for React state
export interface CardState {
  id: string;
  instanceId: string;
  name: string;
  cardType: string;
  attack: number;
  health: number;
  maxHealth: number;
  description: string;
  spellName: string;
  bloodCost: number;
  abilities: string;
  subtypes: string;
  canAttack: boolean;
  hasAttacked: boolean;
  isTapped: boolean;
  hasAegis: boolean;
  damageMarked: number;
  canOverpay: boolean;
  subtypeChoices: string;
  runeType: string;
  letter: string;
  etchingCounters: number;
  attachedToId: string;
  attachedRuneIds: string[];
}

export interface PendingEffectState {
  id: string;
  ownerSessionId: string;
  effectType: string;
  damageAmount: number;
  cardName: string;
  searchFilter: string;
}

export interface PlayerState {
  id: string;
  sessionId: string;
  nickname: string;
  health: number;
  maxHealth: number;
  hand: CardState[];
  battlefield: CardState[];
  chaosDeck: CardState[];
  runesDeck: CardState[];
  runeField: CardState[];
  graveyard: CardState[];
  runesWrittenThisTurn: number;
  maxRuneWritesThisTurn: number;
  connected: boolean;
  mulligansRemaining: number;
}

export interface GameStateData {
  phase: string;
  currentTurn: string;
  turnNumber: number;
  players: Map<string, PlayerState>;
  winner: string;
  turnPhase: string;
  declaredAttackers: string[];
  blockingAssignments: string[];
  isFirstTurn: boolean;
  pendingDeathEffects: PendingEffectState[];
  endTurnTargetCardId: string;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "ws://localhost:2567";

export function useColyseus() {
  const [room, setRoom] = useState<Room<GameState> | null>(null);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [mySessionId, setMySessionId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [connectionState, setConnectionState] = useState<"disconnected" | "connecting" | "connected">("disconnected");

  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    clientRef.current = new Client(SERVER_URL);
  }, []);

  const cardToPlain = (c: Card): CardState => ({
    id: c.id,
    instanceId: c.instanceId,
    name: c.name,
    cardType: c.cardType,
    attack: c.attack,
    health: c.health,
    maxHealth: c.maxHealth,
    description: c.description,
    spellName: c.spellName,
    bloodCost: c.bloodCost,
    abilities: c.abilities,
    subtypes: c.subtypes,
    canAttack: c.canAttack,
    hasAttacked: c.hasAttacked,
    isTapped: c.isTapped,
    hasAegis: c.hasAegis,
    damageMarked: c.damageMarked,
    canOverpay: c.canOverpay,
    subtypeChoices: c.subtypeChoices,
    runeType: c.runeType,
    letter: c.letter,
    etchingCounters: c.etchingCounters,
    attachedToId: c.attachedToId,
    attachedRuneIds: Array.from(c.attachedRuneIds).filter((id): id is string => id !== undefined),
  });

  const schemaToPlain = useCallback((state: GameState): GameStateData => {
    const players = new Map<string, PlayerState>();

    state.players.forEach((player: Player, key: string) => {
      players.set(key, {
        id: player.id,
        sessionId: player.sessionId,
        nickname: player.nickname,
        health: player.health,
        maxHealth: player.maxHealth,
        hand: Array.from(player.hand).filter((c): c is Card => c !== undefined).map(cardToPlain),
        battlefield: Array.from(player.battlefield).filter((c): c is Card => c !== undefined).map(cardToPlain),
        chaosDeck: Array.from(player.chaosDeck).filter((c): c is Card => c !== undefined).map(cardToPlain),
        runesDeck: Array.from(player.runesDeck).filter((c): c is Card => c !== undefined).map(cardToPlain),
        runeField: Array.from(player.runeField).filter((c): c is Card => c !== undefined).map(cardToPlain),
        graveyard: Array.from(player.graveyard).filter((c): c is Card => c !== undefined).map(cardToPlain),
        runesWrittenThisTurn: player.runesWrittenThisTurn,
        maxRuneWritesThisTurn: player.maxRuneWritesThisTurn,
        connected: player.connected,
        mulligansRemaining: player.mulligansRemaining,
      });
    });

    return {
      phase: state.phase,
      currentTurn: state.currentTurn,
      turnNumber: state.turnNumber,
      players,
      winner: state.winner,
      turnPhase: state.turnPhase,
      declaredAttackers: Array.from(state.declaredAttackers).filter((id): id is string => id !== undefined),
      blockingAssignments: Array.from(state.blockingAssignments).filter((id): id is string => id !== undefined),
      isFirstTurn: state.isFirstTurn,
      pendingDeathEffects: Array.from(state.pendingDeathEffects)
        .filter((e): e is PendingEffect => e !== undefined)
        .map((e) => ({
          id: e.id,
          ownerSessionId: e.ownerSessionId,
          effectType: e.effectType,
          damageAmount: e.damageAmount,
          cardName: e.cardName,
          searchFilter: e.searchFilter,
        })),
      endTurnTargetCardId: state.endTurnTargetCardId,
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

      joinedRoom.onStateChange((state: GameState) => {
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

  // --- Actions ---

  const writeRune = useCallback((runeId: string) => {
    if (!room) return;
    room.send("write_rune", { runeId });
  }, [room]);

  const summonCreature = useCallback((cardId: string, runeIds: string[], chosenSubtype?: string, sacrificeTargetId?: string) => {
    if (!room) return;
    room.send("summon", { cardId, runeIds, chosenSubtype, sacrificeTargetId });
  }, [room]);

  const playEcho = useCallback((cardId: string, runeIds: string[]) => {
    if (!room) return;
    room.send("play_echo", { cardId, runeIds });
  }, [room]);

  const playMemory = useCallback((cardId: string, runeIds: string[], targetId?: string) => {
    if (!room) return;
    room.send("play_memory", { cardId, runeIds, targetId });
  }, [room]);

  const attachRune = useCallback((runeId: string, targetId: string) => {
    if (!room) return;
    room.send("attach_rune", { runeId, targetId });
  }, [room]);

  const declareAttackers = useCallback((attackerIds: string[]) => {
    if (!room) return;
    room.send("declare_attackers", { attackerIds });
  }, [room]);

  const declareBlockers = useCallback((assignments: string[]) => {
    if (!room) return;
    room.send("declare_blockers", { assignments });
  }, [room]);

  const endTurn = useCallback(() => {
    if (!room) return;
    room.send("end_turn", {});
  }, [room]);

  const resolveDeathTarget = useCallback((targetId: string) => {
    if (!room) return;
    room.send("resolve_death_target", { targetId });
  }, [room]);

  const resolveDeckSearch = useCallback((cardId: string | null) => {
    if (!room) return;
    room.send("resolve_deck_search", { cardId });
  }, [room]);

  const resolveEndTurnCancel = useCallback((runeId: string) => {
    if (!room) return;
    room.send("resolve_end_turn_cancel", { runeId });
  }, [room]);

  const mulligan = useCallback(() => {
    if (!room) return;
    room.send("mulligan", {});
  }, [room]);

  // Derived state helpers
  const myPlayer = gameState?.players.get(mySessionId);
  const opponent = gameState
    ? Array.from(gameState.players.values()).find((p) => p.sessionId !== mySessionId)
    : undefined;
  const isMyTurn = gameState?.currentTurn === mySessionId;

  const gameEvents = useGameEvents(gameState);

  return {
    connectionState,
    error,
    joinGame,
    leaveGame,
    mySessionId,
    gameState,
    myPlayer,
    opponent,
    isMyTurn,
    gameEvents,
    writeRune,
    summonCreature,
    playEcho,
    playMemory,
    attachRune,
    declareAttackers,
    declareBlockers,
    endTurn,
    resolveDeathTarget,
    resolveDeckSearch,
    resolveEndTurnCancel,
    mulligan,
  };
}
