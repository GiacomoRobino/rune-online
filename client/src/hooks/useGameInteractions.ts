import { useState, useEffect } from "react";
import { PlayerState, CardState } from "./useColyseus";

export type InteractionMode =
  | { type: "idle" }
  | { type: "summoning"; card: CardState; selectedRuneIds: string[] }
  | { type: "echo"; card: CardState; selectedRuneIds: string[] }
  | { type: "memory"; card: CardState; selectedRuneIds: string[] }
  | { type: "targeting_memory"; card: CardState; selectedRuneIds: string[] }
  | { type: "declare_attack"; selectedAttackerIds: string[] }
  | { type: "declare_block"; assignments: Map<string, string>; selectedBlockerId: string | null }; // blockerId -> attackerId

export interface GameInteractionsProps {
  myPlayer: PlayerState;
  isMyTurn: boolean;
  turnPhase: string;
  declaredAttackers: string[];
  onSummon: (cardId: string, runeIds: string[]) => void;
  onPlayEcho: (cardId: string, runeIds: string[]) => void;
  onPlayMemory: (cardId: string, runeIds: string[], targetId?: string) => void;
  onDeclareAttackers: (attackerIds: string[]) => void;
  onDeclareBlockers: (assignments: string[]) => void;
}

export function useGameInteractions({
  myPlayer,
  isMyTurn,
  turnPhase,
  declaredAttackers,
  onSummon,
  onPlayEcho,
  onPlayMemory,
  onDeclareAttackers,
  onDeclareBlockers,
}: GameInteractionsProps) {
  const [mode, setMode] = useState<InteractionMode>({ type: "idle" });
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const [showGraveyard, setShowGraveyard] = useState<"mine" | "opponent" | null>(null);

  const isBlockingPhase = turnPhase === "declare_blockers" && !isMyTurn;

  // --- Hand click handlers ---
  const handleCardInHandClick = (card: CardState) => {
    setInspectedCardId(null);

    if (card.cardType === "summoning" || card.cardType === "echo") {
      if (!isMyTurn || turnPhase !== "main") return;
      setMode({
        type: card.cardType === "summoning" ? "summoning" : "echo",
        card,
        selectedRuneIds: [],
      });
    } else if (card.cardType === "memory") {
      if (turnPhase !== "main") return;
      setMode({
        type: "memory",
        card,
        selectedRuneIds: [],
      });
    }
  };

  // --- Rune click in summoning/echo/memory mode ---
  const handleRuneClick = (rune: CardState) => {
    if (mode.type !== "summoning" && mode.type !== "echo" && mode.type !== "memory") return;
    if (rune.etchingCounters > 0) return;

    const ids = [...mode.selectedRuneIds];
    const idx = ids.indexOf(rune.instanceId);
    if (idx !== -1) {
      ids.splice(idx, 1);
    } else {
      // Cap at bloodCost if applicable
      if (mode.card.bloodCost > 0 && ids.length >= mode.card.bloodCost) return;
      ids.push(rune.instanceId);
    }
    setMode({ ...mode, selectedRuneIds: ids });
  };

  // --- Confirm summoning/echo/memory ---
  const handleConfirmSummon = () => {
    if (mode.type === "summoning") {
      onSummon(mode.card.instanceId, mode.selectedRuneIds);
    } else if (mode.type === "echo") {
      onPlayEcho(mode.card.instanceId, mode.selectedRuneIds);
    } else if (mode.type === "memory") {
      const needsTarget = mode.card.description.toLowerCase().includes("any target") ||
        mode.card.description.toLowerCase().includes("damage");
      if (needsTarget) {
        setMode({ type: "targeting_memory", card: mode.card, selectedRuneIds: mode.selectedRuneIds });
        return;
      } else {
        onPlayMemory(mode.card.instanceId, mode.selectedRuneIds);
      }
    }
    setMode({ type: "idle" });
  };

  // --- Memory targeting ---
  const handleMemoryTarget = (targetId: string) => {
    if (mode.type !== "targeting_memory") return;
    onPlayMemory(mode.card.instanceId, mode.selectedRuneIds, targetId);
    setMode({ type: "idle" });
  };

  // --- Battlefield click ---
  const handleMyCreatureClick = (card: CardState) => {
    if (mode.type === "idle") {
      setInspectedCardId((prev) => prev === card.instanceId ? null : card.instanceId);
      return;
    }
    if (mode.type === "declare_attack") {
      const ids = [...mode.selectedAttackerIds];
      const idx = ids.indexOf(card.instanceId);
      if (idx !== -1) {
        ids.splice(idx, 1);
      } else if (card.canAttack && !card.hasAttacked && !card.isTapped) {
        ids.push(card.instanceId);
      }
      setMode({ type: "declare_attack", selectedAttackerIds: ids });
    } else if (mode.type === "declare_block" && isBlockingPhase) {
      const currentAssignments = new Map(mode.assignments);
      if (currentAssignments.has(card.instanceId)) {
        // Already assigned — unassign (toggle off)
        currentAssignments.delete(card.instanceId);
        setMode({ type: "declare_block", assignments: currentAssignments, selectedBlockerId: null });
      } else if (!card.isTapped) {
        if (declaredAttackers.length === 1) {
          // Only one attacker — auto-assign
          currentAssignments.set(card.instanceId, declaredAttackers[0]);
          setMode({ type: "declare_block", assignments: currentAssignments, selectedBlockerId: null });
        } else {
          // Multiple attackers — select blocker and wait for attacker click
          setMode({ type: "declare_block", assignments: currentAssignments, selectedBlockerId: card.instanceId });
        }
      }
    }
  };

  const handleEnemyCreatureClick = (card: CardState) => {
    if (mode.type === "targeting_memory") {
      handleMemoryTarget(card.instanceId);
    } else if (mode.type === "declare_block" && mode.selectedBlockerId && declaredAttackers.includes(card.instanceId)) {
      // Assign the pending blocker to this attacker
      const currentAssignments = new Map(mode.assignments);
      currentAssignments.set(mode.selectedBlockerId, card.instanceId);
      setMode({ type: "declare_block", assignments: currentAssignments, selectedBlockerId: null });
    } else if (mode.type === "idle") {
      setInspectedCardId((prev) => prev === card.instanceId ? null : card.instanceId);
    }
  };

  const handleHeroClick = (isOwn: boolean) => {
    if (mode.type === "targeting_memory") {
      handleMemoryTarget(isOwn ? "my_hero" : "opponent_hero");
    }
  };

  // --- Attack phase controls ---
  const enterAttackMode = () => {
    setInspectedCardId(null);
    setMode({ type: "declare_attack", selectedAttackerIds: [] });
  };

  const confirmAttackers = () => {
    if (mode.type === "declare_attack" && mode.selectedAttackerIds.length > 0) {
      onDeclareAttackers(mode.selectedAttackerIds);
      setMode({ type: "idle" });
    }
  };

  const confirmBlockers = () => {
    if (mode.type === "declare_block") {
      const assignments = Array.from(mode.assignments.entries()).map(
        ([blockerId, attackerId]) => `${blockerId}:${attackerId}`
      );
      onDeclareBlockers(assignments);
      setMode({ type: "idle" });
    }
  };

  const cancelMode = () => setMode({ type: "idle" });

  // Auto-enter blocking mode when blocking phase starts
  useEffect(() => {
    if (isBlockingPhase && mode.type === "idle") {
      setMode({ type: "declare_block", assignments: new Map(), selectedBlockerId: null });
    }
  }, [isBlockingPhase]);

  // Auto-exit blocking mode when blocking phase ends
  useEffect(() => {
    if (!isBlockingPhase && mode.type === "declare_block") {
      setMode({ type: "idle" });
    }
  }, [isBlockingPhase, mode.type]);

  // Check if a card can be played
  const canSpellCard = (card: CardState) => {
    if (card.cardType !== "summoning" && card.cardType !== "echo" && card.cardType !== "memory") return false;
    const available = myPlayer.runeField.filter((r) => r.etchingCounters === 0);

    if (card.bloodCost > 0) {
      // Blood cost: need at least bloodCost runes whose letters are in spellName (respecting frequency)
      const nameFreq = new Map<string, number>();
      for (const ch of card.spellName) {
        nameFreq.set(ch, (nameFreq.get(ch) || 0) + 1);
      }
      let matchCount = 0;
      const usedFreq = new Map<string, number>();
      for (const rune of available) {
        const maxForLetter = nameFreq.get(rune.letter) || 0;
        const usedForLetter = usedFreq.get(rune.letter) || 0;
        if (maxForLetter > usedForLetter) {
          matchCount++;
          usedFreq.set(rune.letter, usedForLetter + 1);
        }
      }
      return matchCount >= card.bloodCost;
    }

    // Standard spelling
    const needed = card.spellName.split("").sort();
    const availableLetters = available.map((r) => r.letter).sort();

    const remaining = [...needed];
    for (const letter of availableLetters) {
      const idx = remaining.indexOf(letter);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    return remaining.length === 0;
  };

  // Computed values
  const isSpelling = mode.type === "summoning" || mode.type === "echo" || mode.type === "memory";
  const selectedRuneIds = isSpelling ? mode.selectedRuneIds : [];
  const remainingNeeded = (() => {
    if (!isSpelling) return [];
    if (mode.card.bloodCost > 0) {
      // For blood cost, return placeholder slots for remaining picks
      const remaining = mode.card.bloodCost - mode.selectedRuneIds.length;
      return Array(Math.max(0, remaining)).fill("*");
    }
    const needed = [...mode.card.spellName.split("")];
    for (const id of mode.selectedRuneIds) {
      const rune = myPlayer.runeField.find((r) => r.instanceId === id);
      if (rune) {
        const idx = needed.indexOf(rune.letter);
        if (idx !== -1) needed.splice(idx, 1);
      }
    }
    return needed;
  })();

  // Helpers
  const getAttachedRunes = (player: PlayerState, card: CardState) =>
    player.runeField.filter((r) => card.attachedRuneIds.includes(r.instanceId));
  const getUnattachedRunes = (player: PlayerState) =>
    player.runeField.filter((r) => !r.attachedToId);

  const myUnattachedRunes = getUnattachedRunes(myPlayer);

  const isRuneAvailable = (rune: CardState) => {
    if (rune.etchingCounters > 0) return false;
    if (!isSpelling) return false;
    if (selectedRuneIds.includes(rune.instanceId)) return true;

    if (mode.card.bloodCost > 0) {
      // Blood cost: rune letter must be in spellName, respecting frequency
      if (mode.selectedRuneIds.length >= mode.card.bloodCost) return false;
      const nameFreq = new Map<string, number>();
      for (const ch of mode.card.spellName) {
        nameFreq.set(ch, (nameFreq.get(ch) || 0) + 1);
      }
      if (!nameFreq.has(rune.letter)) return false;
      // Count how many of this letter are already selected
      let usedCount = 0;
      for (const id of mode.selectedRuneIds) {
        const sel = myPlayer.runeField.find((r) => r.instanceId === id);
        if (sel && sel.letter === rune.letter) usedCount++;
      }
      return usedCount < nameFreq.get(rune.letter)!;
    }

    return remainingNeeded.includes(rune.letter);
  };

  // Turn phase display
  const phaseLabel = turnPhase === "main" ? "Main Phase" :
    turnPhase === "declare_attackers" ? "Declaring Attackers" :
    turnPhase === "declare_blockers" ? "Blocking Phase" :
    turnPhase === "combat_damage" ? "Combat!" : turnPhase;

  return {
    mode,
    inspectedCardId,
    showGraveyard,
    setShowGraveyard,
    isBlockingPhase,
    handleCardInHandClick,
    handleRuneClick,
    handleConfirmSummon,
    handleMemoryTarget,
    handleMyCreatureClick,
    handleEnemyCreatureClick,
    handleHeroClick,
    enterAttackMode,
    confirmAttackers,
    confirmBlockers,
    cancelMode,
    canSpellCard,
    isSpelling,
    selectedRuneIds,
    remainingNeeded,
    getAttachedRunes,
    getUnattachedRunes,
    myUnattachedRunes,
    isRuneAvailable,
    phaseLabel,
  };
}

export type GameInteractions = ReturnType<typeof useGameInteractions>;
