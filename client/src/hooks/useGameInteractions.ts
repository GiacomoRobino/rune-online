import { useState, useEffect } from "react";
import { PlayerState, CardState, PendingEffectState } from "./useColyseus";

export type InteractionMode =
  | { type: "idle" }
  | { type: "summoning"; card: CardState; selectedRuneIds: string[] }
  | { type: "echo"; card: CardState; selectedRuneIds: string[] }
  | { type: "memory"; card: CardState; selectedRuneIds: string[] }
  | { type: "targeting_memory"; card: CardState; selectedRuneIds: string[] }
  | { type: "declare_attack"; selectedAttackerIds: string[] }
  | { type: "declare_block"; assignments: Map<string, string>; selectedBlockerId: string | null } // blockerId -> attackerId
  | { type: "targeting_death_effect"; effectId: string; cardName: string; damageAmount: number }
  | { type: "searching_deck"; effectId: string; cardName: string; searchFilter: string }
  | { type: "choosing_subtype"; card: CardState; selectedRuneIds: string[]; options: string[] }
  | { type: "choosing_sacrifice_target"; card: CardState; selectedRuneIds: string[] }
  | { type: "cancel_rune"; cardInstanceId: string };

export interface GameInteractionsProps {
  myPlayer: PlayerState;
  opponentBattlefield: CardState[];
  isMyTurn: boolean;
  turnPhase: string;
  declaredAttackers: string[];
  onSummon: (cardId: string, runeIds: string[], chosenSubtype?: string, sacrificeTargetId?: string) => void;
  onPlayEcho: (cardId: string, runeIds: string[]) => void;
  onPlayMemory: (cardId: string, runeIds: string[], targetId?: string) => void;
  onDeclareAttackers: (attackerIds: string[]) => void;
  onDeclareBlockers: (assignments: string[]) => void;
  pendingDeathEffects: PendingEffectState[];
  mySessionId: string;
  onResolveDeathTarget: (targetId: string) => void;
  onResolveDeckSearch: (cardId: string | null) => void;
  onResolveEndTurnCancel: (runeId: string) => void;
  endTurnTargetCardId: string;
}

export function useGameInteractions({
  myPlayer,
  opponentBattlefield,
  isMyTurn,
  turnPhase,
  declaredAttackers,
  onSummon,
  onPlayEcho,
  onPlayMemory,
  onDeclareAttackers,
  onDeclareBlockers,
  pendingDeathEffects,
  mySessionId,
  onResolveDeathTarget,
  onResolveDeckSearch,
  onResolveEndTurnCancel,
  endTurnTargetCardId,
}: GameInteractionsProps) {
  const [mode, setMode] = useState<InteractionMode>({ type: "idle" });
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const [showGraveyard, setShowGraveyard] = useState<"mine" | "opponent" | null>(null);
  const [deckSearchCards, setDeckSearchCards] = useState<CardState[]>([]);

  const isBlockingPhase = turnPhase === "declare_blockers" && !isMyTurn;

  const hasAbility = (card: CardState, keyword: string): boolean =>
    card.abilities.split(",").some((a) => a.trim() === keyword);

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

  // --- Rune click in summoning/echo/memory/cancel_rune mode ---
  const handleRuneClick = (rune: CardState) => {
    // Cancel rune mode: click an attached rune to cancel it
    if (mode.type === "cancel_rune") {
      if (rune.attachedToId === mode.cardInstanceId) {
        onResolveEndTurnCancel(rune.instanceId);
        setMode({ type: "idle" });
      }
      return;
    }

    if (mode.type !== "summoning" && mode.type !== "echo" && mode.type !== "memory") return;
    if (rune.etchingCounters > 0) return;

    const ids = [...mode.selectedRuneIds];
    const idx = ids.indexOf(rune.instanceId);
    if (idx !== -1) {
      ids.splice(idx, 1);
    } else {
      // Cap at bloodCost if applicable (no cap for canOverpay — unlimited runes matching spellName)
      if (!mode.card.canOverpay && mode.card.bloodCost > 0 && ids.length >= mode.card.bloodCost) return;
      ids.push(rune.instanceId);
    }
    setMode({ ...mode, selectedRuneIds: ids });
  };

  // --- Confirm summoning/echo/memory ---
  const handleConfirmSummon = () => {
    if (mode.type === "summoning") {
      if (mode.card.subtypeChoices) {
        setMode({
          type: "choosing_subtype",
          card: mode.card,
          selectedRuneIds: mode.selectedRuneIds,
          options: mode.card.subtypeChoices.split(","),
        });
        return;
      }
      if (hasAbility(mode.card, "devour")) {
        const friendlySummonings = myPlayer.battlefield.filter((c) => c.cardType === "summoning");
        if (friendlySummonings.length === 0) return;
        setMode({
          type: "choosing_sacrifice_target",
          card: mode.card,
          selectedRuneIds: mode.selectedRuneIds,
        });
        return;
      }
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
    if (mode.type === "choosing_sacrifice_target") {
      if (card.cardType === "summoning") {
        onSummon(mode.card.instanceId, mode.selectedRuneIds, undefined, card.instanceId);
        setMode({ type: "idle" });
      }
      return;
    }
    if (mode.type === "targeting_death_effect") {
      handleDeathEffectTarget(card.instanceId);
      return;
    }
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
          // Only one attacker — auto-assign (with ability checks)
          const attacker = opponentBattlefield.find(c => c.instanceId === declaredAttackers[0]);
          if (attacker) {
            if (hasAbility(attacker, "skyrunner") && !hasAbility(card, "skyrunner")) return;
            if (hasAbility(attacker, "shadowwalker") !== hasAbility(card, "shadowwalker")) return;
          }
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
    } else if (mode.type === "targeting_death_effect") {
      handleDeathEffectTarget(card.instanceId);
    } else if (mode.type === "declare_block" && mode.selectedBlockerId && declaredAttackers.includes(card.instanceId)) {
      // Assign the pending blocker to this attacker (with ability checks)
      const blocker = myPlayer.battlefield.find(c => c.instanceId === mode.selectedBlockerId);
      if (blocker) {
        if (hasAbility(card, "skyrunner") && !hasAbility(blocker, "skyrunner")) return;
        if (hasAbility(card, "shadowwalker") !== hasAbility(blocker, "shadowwalker")) return;
      }
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
    } else if (mode.type === "targeting_death_effect") {
      handleDeathEffectTarget(isOwn ? "my_hero" : "opponent_hero");
    }
  };

  // --- Death effect handlers ---
  const handleDeathEffectTarget = (targetId: string) => {
    if (mode.type !== "targeting_death_effect") return;
    onResolveDeathTarget(targetId);
    setMode({ type: "idle" });
  };

  const handleDeckSearchSelect = (cardId: string | null) => {
    onResolveDeckSearch(cardId);
    setDeckSearchCards([]);
    setMode({ type: "idle" });
  };

  const handleSubtypeChoice = (subtype: string) => {
    if (mode.type !== "choosing_subtype") return;
    onSummon(mode.card.instanceId, mode.selectedRuneIds, subtype);
    setMode({ type: "idle" });
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

  // Auto-enter death effect resolution mode
  useEffect(() => {
    if (turnPhase === "resolve_death_effects" && pendingDeathEffects.length > 0) {
      const first = pendingDeathEffects[0];
      if (first.ownerSessionId === mySessionId) {
        if (first.effectType === "death_damage") {
          setMode({
            type: "targeting_death_effect",
            effectId: first.id,
            cardName: first.cardName,
            damageAmount: first.damageAmount,
          });
        } else if (first.effectType === "search_deck") {
          const filterValues = first.searchFilter.split(",");
          const matching = myPlayer.chaosDeck.filter((c) => {
            const subs = c.subtypes ? c.subtypes.split(",") : [];
            return subs.some((st) => filterValues.includes(st));
          });
          setDeckSearchCards(matching);
          setMode({
            type: "searching_deck",
            effectId: first.id,
            cardName: first.cardName,
            searchFilter: first.searchFilter,
          });
        }
      }
    }
  }, [turnPhase, pendingDeathEffects, mySessionId, myPlayer.chaosDeck]);

  // Auto-exit death effect mode when phase leaves resolve_death_effects
  useEffect(() => {
    if (turnPhase !== "resolve_death_effects" && (mode.type === "targeting_death_effect" || mode.type === "searching_deck")) {
      setMode({ type: "idle" });
      setDeckSearchCards([]);
    }
  }, [turnPhase, mode.type]);

  // Auto-enter cancel rune mode
  useEffect(() => {
    if (turnPhase === "end_turn_cancel_rune" && endTurnTargetCardId && isMyTurn && mode.type !== "cancel_rune") {
      setMode({ type: "cancel_rune", cardInstanceId: endTurnTargetCardId });
    }
  }, [turnPhase, endTurnTargetCardId, isMyTurn, mode.type]);

  // Auto-exit cancel rune mode when phase leaves end_turn_cancel_rune
  useEffect(() => {
    if (turnPhase !== "end_turn_cancel_rune" && mode.type === "cancel_rune") {
      setMode({ type: "idle" });
    }
  }, [turnPhase, mode.type]);

  // Check if a card can be played
  const canSpellCard = (card: CardState) => {
    if (card.cardType !== "summoning" && card.cardType !== "echo" && card.cardType !== "memory") return false;
    if (hasAbility(card, "devour") && !myPlayer.battlefield.some((c) => c.cardType === "summoning")) return false;
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

    if (mode.card.canOverpay) {
      // Overpay: check if base spell is satisfied yet
      const baseNeeded = mode.card.spellName.split("");
      const tempRemaining = [...baseNeeded];
      for (const id of mode.selectedRuneIds) {
        const sel = myPlayer.runeField.find((r) => r.instanceId === id);
        if (sel) {
          const i = tempRemaining.indexOf(sel.letter);
          if (i !== -1) tempRemaining.splice(i, 1);
        }
      }
      // If base not yet met, only allow needed letters
      if (tempRemaining.length > 0) return tempRemaining.includes(rune.letter);
      // Base met — allow any spellName letter for extra copies
      return mode.card.spellName.includes(rune.letter);
    }

    return remainingNeeded.includes(rune.letter);
  };

  // Turn phase display
  const phaseLabel = turnPhase === "main" ? "Main Phase" :
    turnPhase === "declare_attackers" ? "Declaring Attackers" :
    turnPhase === "declare_blockers" ? "Blocking Phase" :
    turnPhase === "combat_damage" ? "Combat!" :
    turnPhase === "resolve_death_effects" ? "Death Effects" :
    turnPhase === "end_turn_cancel_rune" ? "Cancel Rune" : turnPhase;

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
    handleDeathEffectTarget,
    handleDeckSearchSelect,
    handleSubtypeChoice,
    deckSearchCards,
  };
}

export type GameInteractions = ReturnType<typeof useGameInteractions>;
