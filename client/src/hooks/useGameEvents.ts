import { useRef, useMemo } from "react";
import { GameStateData, PlayerState, CardState } from "./useColyseus";
import { GameEvent, Zone } from "../types/animations";

const CARD_ZONES: Zone[] = ["hand", "battlefield", "runeField", "graveyard"];

/** Build a map of instanceId -> { zone, card } for a single player */
function buildCardMap(player: PlayerState): Map<string, { zone: Zone; card: CardState }> {
  const map = new Map<string, { zone: Zone; card: CardState }>();
  for (const zone of CARD_ZONES) {
    for (const card of player[zone]) {
      map.set(card.instanceId, { zone, card });
    }
  }
  return map;
}

/** Build a map of instanceId -> attachedToId for runes */
function buildRuneAttachMap(player: PlayerState): Map<string, string> {
  const map = new Map<string, string>();
  for (const rune of player.runeField) {
    if (rune.attachedToId) {
      map.set(rune.instanceId, rune.attachedToId);
    }
  }
  return map;
}

export function useGameEvents(gameState: GameStateData | null): GameEvent[] {
  const prevStateRef = useRef<GameStateData | null>(null);

  const events = useMemo(() => {
    const result: GameEvent[] = [];
    const prev = prevStateRef.current;

    if (!gameState) {
      prevStateRef.current = gameState;
      return result;
    }

    if (!prev) {
      prevStateRef.current = gameState;
      return result;
    }

    // Detect turn changes
    if (gameState.turnNumber !== prev.turnNumber) {
      result.push({ type: "TURN_CHANGED", turnNumber: gameState.turnNumber, currentTurn: gameState.currentTurn });
    }

    // Detect phase changes
    if (gameState.turnPhase !== prev.turnPhase) {
      result.push({ type: "PHASE_CHANGED", oldPhase: prev.turnPhase, newPhase: gameState.turnPhase });
    }

    // Per-player diffs
    for (const [sessionId, player] of gameState.players) {
      const prevPlayer = prev.players.get(sessionId);
      if (!prevPlayer) continue;

      // Player health changes
      if (player.health !== prevPlayer.health) {
        result.push({
          type: "PLAYER_HEALTH_CHANGED",
          playerSessionId: sessionId,
          oldValue: prevPlayer.health,
          newValue: player.health,
        });
      }

      const currCards = buildCardMap(player);
      const prevCards = buildCardMap(prevPlayer);

      // Cards that entered a zone (in current but not in prev, or changed zone)
      for (const [instanceId, { zone }] of currCards) {
        const prevEntry = prevCards.get(instanceId);
        if (!prevEntry) {
          result.push({ type: "CARD_ENTERED_ZONE", instanceId, zone, playerSessionId: sessionId });
        } else if (prevEntry.zone !== zone) {
          result.push({ type: "CARD_LEFT_ZONE", instanceId, zone: prevEntry.zone, playerSessionId: sessionId });
          result.push({ type: "CARD_ENTERED_ZONE", instanceId, zone, playerSessionId: sessionId });
        }
      }

      // Cards that left entirely
      for (const [instanceId, { zone }] of prevCards) {
        if (!currCards.has(instanceId)) {
          result.push({ type: "CARD_LEFT_ZONE", instanceId, zone, playerSessionId: sessionId });
        }
      }

      // Stat changes on battlefield cards
      for (const card of player.battlefield) {
        const prevEntry = prevCards.get(card.instanceId);
        if (!prevEntry || prevEntry.zone !== "battlefield") continue;
        const prevCard = prevEntry.card;

        if (card.attack !== prevCard.attack) {
          result.push({ type: "STAT_CHANGED", instanceId: card.instanceId, stat: "attack", oldValue: prevCard.attack, newValue: card.attack });
        }
        if (card.health !== prevCard.health) {
          result.push({ type: "STAT_CHANGED", instanceId: card.instanceId, stat: "health", oldValue: prevCard.health, newValue: card.health });
        }
      }

      // Rune attach/detach
      const currAttach = buildRuneAttachMap(player);
      const prevAttach = buildRuneAttachMap(prevPlayer);

      for (const [runeId, targetId] of currAttach) {
        const prevTarget = prevAttach.get(runeId);
        if (!prevTarget) {
          result.push({ type: "RUNE_ATTACHED", runeInstanceId: runeId, targetInstanceId: targetId });
        } else if (prevTarget !== targetId) {
          result.push({ type: "RUNE_DETACHED", runeInstanceId: runeId, fromInstanceId: prevTarget });
          result.push({ type: "RUNE_ATTACHED", runeInstanceId: runeId, targetInstanceId: targetId });
        }
      }

      for (const [runeId, prevTarget] of prevAttach) {
        if (!currAttach.has(runeId)) {
          result.push({ type: "RUNE_DETACHED", runeInstanceId: runeId, fromInstanceId: prevTarget });
        }
      }
    }

    prevStateRef.current = gameState;
    return result;
  }, [gameState]);

  return events;
}
