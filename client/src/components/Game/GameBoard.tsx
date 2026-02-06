import { useState } from "react";
import { Card } from "../Card/Card";
import { RuneField } from "./RuneField";
import { SpellNameChecker } from "./SpellNameChecker";
import { PlayerState, CardState } from "../../hooks/useColyseus";

type InteractionMode =
  | { type: "idle" }
  | { type: "summoning"; card: CardState; selectedRuneIds: string[] }
  | { type: "echo"; card: CardState; selectedRuneIds: string[] }
  | { type: "targeting_memory"; card: CardState }
  | { type: "declare_attack"; selectedAttackerIds: string[] }
  | { type: "declare_block"; assignments: Map<string, string> }; // blockerId -> attackerId

interface GameBoardProps {
  myPlayer: PlayerState;
  opponent: PlayerState;
  isMyTurn: boolean;
  phase: string;
  turnPhase: string;
  turnNumber: number;
  winner: string;
  mySessionId: string;
  declaredAttackers: string[];
  onWriteRune: (runeId: string) => void;
  onSummon: (cardId: string, runeIds: string[]) => void;
  onPlayEcho: (cardId: string, runeIds: string[]) => void;
  onPlayMemory: (cardId: string, targetId?: string) => void;
  onDeclareAttackers: (attackerIds: string[]) => void;
  onDeclareBlockers: (assignments: string[]) => void;
  onEndTurn: () => void;
  onLeave: () => void;
}

export function GameBoard({
  myPlayer,
  opponent,
  isMyTurn,
  phase,
  turnPhase,
  turnNumber,
  winner,
  mySessionId,
  declaredAttackers,
  onWriteRune,
  onSummon,
  onPlayEcho,
  onPlayMemory,
  onDeclareAttackers,
  onDeclareBlockers,
  onEndTurn,
  onLeave,
}: GameBoardProps) {
  const [mode, setMode] = useState<InteractionMode>({ type: "idle" });

  // Game ended
  if (phase === "ended") {
    const didWin = winner === mySessionId;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-800/90 backdrop-blur rounded-xl p-8 text-center">
          <h1 className={`text-5xl font-bold mb-4 ${didWin ? "text-green-400" : "text-red-400"}`}>
            {didWin ? "Victory!" : "Defeat"}
          </h1>
          <p className="text-gray-300 mb-6">
            {didWin ? "Congratulations, you won!" : "Better luck next time!"}
          </p>
          <button onClick={onLeave} className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Waiting for opponent
  if (phase === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-gray-800/90 backdrop-blur rounded-xl p-8 text-center">
          <div className="animate-pulse">
            <h2 className="text-2xl text-white mb-4">Waiting for opponent...</h2>
            <p className="text-gray-400">Share this page to play with a friend</p>
          </div>
        </div>
      </div>
    );
  }

  // Is it blocking phase and I'm the defender?
  const isBlockingPhase = turnPhase === "declare_blockers" && !isMyTurn;

  // --- Hand click handlers ---
  const handleCardInHandClick = (card: CardState) => {
    if (!isMyTurn || turnPhase !== "main") return;

    if (card.cardType === "summoning" || card.cardType === "echo") {
      // Start summoning/echo flow
      setMode({
        type: card.cardType === "summoning" ? "summoning" : "echo",
        card,
        selectedRuneIds: [],
      });
    } else if (card.cardType === "memory") {
      // Check if memory needs a target
      const needsTarget = card.description.toLowerCase().includes("any target") ||
        card.description.toLowerCase().includes("damage");
      if (needsTarget) {
        setMode({ type: "targeting_memory", card });
      } else {
        onPlayMemory(card.instanceId);
        setMode({ type: "idle" });
      }
    }
  };

  // --- Rune click in summoning mode ---
  const handleRuneClick = (rune: CardState) => {
    if (mode.type !== "summoning" && mode.type !== "echo") return;
    if (rune.etchingCounters > 0 || rune.attachedToId !== "") return;

    const ids = [...mode.selectedRuneIds];
    const idx = ids.indexOf(rune.instanceId);
    if (idx !== -1) {
      ids.splice(idx, 1);
    } else {
      ids.push(rune.instanceId);
    }
    setMode({ ...mode, selectedRuneIds: ids });
  };

  // --- Confirm summoning/echo ---
  const handleConfirmSummon = () => {
    if (mode.type === "summoning") {
      onSummon(mode.card.instanceId, mode.selectedRuneIds);
    } else if (mode.type === "echo") {
      onPlayEcho(mode.card.instanceId, mode.selectedRuneIds);
    }
    setMode({ type: "idle" });
  };

  // --- Memory targeting ---
  const handleMemoryTarget = (targetId: string) => {
    if (mode.type !== "targeting_memory") return;
    onPlayMemory(mode.card.instanceId, targetId);
    setMode({ type: "idle" });
  };

  // --- Battlefield click ---
  const handleMyCreatureClick = (card: CardState) => {
    if (mode.type === "declare_attack") {
      // Toggle attacker
      const ids = [...mode.selectedAttackerIds];
      const idx = ids.indexOf(card.instanceId);
      if (idx !== -1) {
        ids.splice(idx, 1);
      } else if (card.canAttack && !card.hasAttacked && !card.isTapped) {
        ids.push(card.instanceId);
      }
      setMode({ type: "declare_attack", selectedAttackerIds: ids });
    } else if (mode.type === "declare_block" && isBlockingPhase) {
      // Select blocker — need to pick which attacker to block
      // Simple: block the first unblocked attacker
      const currentAssignments = new Map(mode.assignments);
      if (currentAssignments.has(card.instanceId)) {
        currentAssignments.delete(card.instanceId);
      } else {
        // Find an attacker to block (first unblocked one)
        const blockedAttackers = new Set(currentAssignments.values());
        const unblockedAttacker = declaredAttackers.find((a) => !blockedAttackers.has(a));
        if (unblockedAttacker && !card.isTapped) {
          currentAssignments.set(card.instanceId, unblockedAttacker);
        }
      }
      setMode({ type: "declare_block", assignments: currentAssignments });
    }
  };

  const handleEnemyCreatureClick = (card: CardState) => {
    if (mode.type === "targeting_memory") {
      handleMemoryTarget(card.instanceId);
    } else if (mode.type === "declare_block" && isBlockingPhase) {
      // Click an attacker to assign selected blocker to it
      // For now, handled via my creature click
    }
  };

  const handleHeroClick = (isOwn: boolean) => {
    if (mode.type === "targeting_memory") {
      handleMemoryTarget(isOwn ? "my_hero" : "opponent_hero");
    }
  };

  // --- Attack phase controls ---
  const enterAttackMode = () => {
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

  // Start blocking mode automatically when it's blocking phase
  if (isBlockingPhase && mode.type === "idle") {
    // Trigger block mode
    setTimeout(() => setMode({ type: "declare_block", assignments: new Map() }), 0);
  }

  // Check if a card can be played (has available runes to spell it)
  const canSpellCard = (card: CardState) => {
    if (card.cardType !== "summoning" && card.cardType !== "echo") return card.cardType === "memory";
    const needed = card.spellName.split("").sort();
    const available = myPlayer.runeField
      .filter((r) => r.attachedToId === "" && r.etchingCounters === 0)
      .map((r) => r.letter)
      .sort();

    // Check if available letters can spell the name
    const remaining = [...needed];
    for (const letter of available) {
      const idx = remaining.indexOf(letter);
      if (idx !== -1) remaining.splice(idx, 1);
    }
    return remaining.length === 0;
  };

  // Turn phase display
  const phaseLabel = turnPhase === "main" ? "Main Phase" :
    turnPhase === "declare_attackers" ? "Declaring Attackers" :
    turnPhase === "declare_blockers" ? "Blocking Phase" :
    turnPhase === "combat_damage" ? "Combat!" : turnPhase;

  return (
    <div className="min-h-screen flex flex-col p-3 gap-2">
      {/* Turn indicator */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <div className={`px-4 py-1.5 rounded-full font-semibold text-sm ${
          isMyTurn ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"
        }`}>
          {isMyTurn ? "Your Turn" : "Opponent's Turn"} - Turn {turnNumber}
        </div>
        <div className="px-3 py-1.5 rounded-full bg-gray-800 text-gray-400 text-sm">
          {phaseLabel}
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-10" />

      {/* Opponent section */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div
            onClick={() => handleHeroClick(false)}
            className={`w-14 h-14 rounded-full bg-gradient-to-br from-red-800 to-red-600 border-3 border-red-500 flex items-center justify-center cursor-pointer hover:border-red-400 transition-colors ${
              mode.type === "targeting_memory" ? "ring-2 ring-yellow-400" : ""
            }`}
          >
            <span className="text-white font-bold">{opponent.health}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{opponent.nickname}</p>
            <p className="text-gray-400 text-xs">
              Chaos: {opponent.chaosDeck.length} | Runes: {opponent.runesDeck.length}
            </p>
          </div>
        </div>
        <div className="text-gray-400 text-xs">
          Hand: {opponent.hand.length} | Graveyard: {opponent.graveyard.length}
        </div>
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex justify-center gap-1 mb-2">
        {opponent.hand.map((_, i) => (
          <div key={i} className="transform scale-50">
            <Card card={{} as CardState} showBack />
          </div>
        ))}
      </div>

      {/* Opponent rune field */}
      <RuneField
        runes={opponent.runeField}
        selectedRuneIds={[]}
        isSummoningMode={false}
        label="Opponent Runes"
      />

      {/* Opponent battlefield */}
      <div className="flex justify-center gap-3 min-h-[150px] bg-gray-900/30 rounded-lg p-3">
        {opponent.battlefield.length === 0 ? (
          <div className="text-gray-600 flex items-center text-sm">No creatures</div>
        ) : (
          opponent.battlefield.map((card) => (
            <Card
              key={card.instanceId}
              card={card}
              onClick={() => handleEnemyCreatureClick(card)}
              isTarget={mode.type === "targeting_memory"}
              isAttacker={declaredAttackers.includes(card.instanceId)}
            />
          ))
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700" />

      {/* My battlefield */}
      <div className="flex justify-center gap-3 min-h-[150px] bg-gray-900/30 rounded-lg p-3">
        {myPlayer.battlefield.length === 0 ? (
          <div className="text-gray-600 flex items-center text-sm">Summon creatures here</div>
        ) : (
          myPlayer.battlefield.map((card) => (
            <Card
              key={card.instanceId}
              card={card}
              onClick={() => handleMyCreatureClick(card)}
              isAttacker={
                mode.type === "declare_attack" &&
                mode.selectedAttackerIds.includes(card.instanceId)
              }
              isBlockCandidate={
                mode.type === "declare_block" &&
                mode.assignments.has(card.instanceId)
              }
              isSelected={
                mode.type === "declare_attack" &&
                mode.selectedAttackerIds.includes(card.instanceId)
              }
            />
          ))
        )}
      </div>

      {/* My rune field */}
      <RuneField
        runes={myPlayer.runeField}
        selectedRuneIds={
          (mode.type === "summoning" || mode.type === "echo") ? mode.selectedRuneIds : []
        }
        onRuneClick={handleRuneClick}
        isSummoningMode={mode.type === "summoning" || mode.type === "echo"}
        requiredLetters={
          (mode.type === "summoning" || mode.type === "echo") ? mode.card.spellName.split("") : []
        }
        label="My Runes"
      />

      {/* Spell name checker (when summoning/echo) */}
      {(mode.type === "summoning" || mode.type === "echo") && (
        <SpellNameChecker
          spellName={mode.card.spellName}
          selectedRunes={mode.selectedRuneIds
            .map((id) => myPlayer.runeField.find((r) => r.instanceId === id))
            .filter((r): r is CardState => r !== undefined)
          }
          onConfirm={handleConfirmSummon}
          onCancel={() => setMode({ type: "idle" })}
        />
      )}

      {/* Targeting indicator */}
      {mode.type === "targeting_memory" && (
        <div className="bg-yellow-900/50 border border-yellow-600 rounded-lg p-2 text-center text-yellow-300 text-sm">
          Select a target for {mode.card.name}
          <button
            onClick={() => setMode({ type: "idle" })}
            className="ml-3 px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white rounded text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Rune deck picker (when player has writes remaining) */}
      {myPlayer.runesWrittenThisTurn < myPlayer.maxRuneWritesThisTurn && myPlayer.runesDeck.length > 0 && (
        <div className="bg-indigo-950/50 border border-indigo-600 rounded-lg p-3">
          <div className="text-indigo-300 text-sm mb-2 font-semibold">
            Choose a rune to write ({myPlayer.maxRuneWritesThisTurn - myPlayer.runesWrittenThisTurn} remaining)
          </div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {/* Group runes by letter for cleaner display */}
            {(() => {
              const grouped = new Map<string, CardState[]>();
              for (const rune of myPlayer.runesDeck) {
                const key = `${rune.letter}-${rune.runeType}`;
                if (!grouped.has(key)) grouped.set(key, []);
                grouped.get(key)!.push(rune);
              }
              return Array.from(grouped.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, runes]) => {
                  const rune = runes[0];
                  return (
                    <button
                      key={key}
                      onClick={() => onWriteRune(rune.instanceId)}
                      className={`
                        w-10 h-14 rounded flex flex-col items-center justify-center cursor-pointer
                        transition-all hover:scale-110 border-2
                        ${rune.runeType === "blood" ? "bg-red-900 border-red-500 hover:bg-red-800" :
                          rune.runeType === "stone" ? "bg-gray-700 border-gray-400 hover:bg-gray-600" :
                          "bg-indigo-900 border-white hover:bg-indigo-800"}
                      `}
                    >
                      <span className="text-white font-bold text-lg">{rune.letter}</span>
                      <span className="text-gray-300 text-[8px]">x{runes.length}</span>
                    </button>
                  );
                });
            })()}
          </div>
        </div>
      )}

      {/* My hand */}
      <div className="flex justify-center gap-2 mb-2">
        {myPlayer.hand.map((card) => (
          <div
            key={card.instanceId}
            className="transform hover:-translate-y-2 transition-transform"
          >
            <Card
              card={card}
              onClick={() => handleCardInHandClick(card)}
              isPlayable={isMyTurn && turnPhase === "main" && canSpellCard(card)}
              isSelected={
                (mode.type === "summoning" || mode.type === "echo") &&
                mode.card.instanceId === card.instanceId
              }
              isInHand
            />
          </div>
        ))}
      </div>

      {/* My info + action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            onClick={() => handleHeroClick(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-green-800 to-green-600 border-3 border-green-500 flex items-center justify-center"
          >
            <span className="text-white font-bold">{myPlayer.health}</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{myPlayer.nickname}</p>
            <p className="text-gray-400 text-xs">
              Chaos: {myPlayer.chaosDeck.length} | Runes: {myPlayer.runesDeck.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Attack mode button */}
          {isMyTurn && turnPhase === "main" && mode.type === "idle" && (
            <button
              onClick={enterAttackMode}
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Attack
            </button>
          )}

          {/* Confirm attackers */}
          {mode.type === "declare_attack" && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode({ type: "idle" })}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAttackers}
                disabled={mode.selectedAttackerIds.length === 0}
                className={`px-4 py-2 rounded-lg font-semibold text-sm ${
                  mode.selectedAttackerIds.length > 0
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                Confirm Attackers ({mode.selectedAttackerIds.length})
              </button>
            </div>
          )}

          {/* Blocking controls */}
          {isBlockingPhase && mode.type === "declare_block" && (
            <button
              onClick={confirmBlockers}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              Confirm Blockers ({mode.assignments.size})
            </button>
          )}

          {/* End turn */}
          {isMyTurn && turnPhase === "main" && mode.type === "idle" && (
            <button
              onClick={onEndTurn}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold text-sm transition-colors"
            >
              End Turn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
