import { useState } from "react";
import { Card } from "../Card/Card";
import { RuneField } from "./RuneField";
import { SpellNameChecker } from "./SpellNameChecker";
import { PlayerState, CardState } from "../../hooks/useColyseus";

type InteractionMode =
  | { type: "idle" }
  | { type: "summoning"; card: CardState; selectedRuneIds: string[] }
  | { type: "echo"; card: CardState; selectedRuneIds: string[] }
  | { type: "memory"; card: CardState; selectedRuneIds: string[] }
  | { type: "targeting_memory"; card: CardState; selectedRuneIds: string[] }
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
  onPlayMemory: (cardId: string, runeIds: string[], targetId?: string) => void;
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
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const [showGraveyard, setShowGraveyard] = useState<"mine" | "opponent" | null>(null);

  // Game ended
  if (phase === "ended") {
    const didWin = winner === mySessionId;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="stone-panel ornate-border rounded-xl p-8 text-center">
          <h1 className={`text-5xl font-bold mb-4 font-medieval-decorative ${didWin ? "text-gold-glow" : "text-blood-light"}`}
            style={didWin ? { textShadow: '0 0 20px rgba(201,168,76,0.6)' } : { textShadow: '0 0 20px rgba(139,0,0,0.6)' }}
          >
            {didWin ? "Victory!" : "Defeat"}
          </h1>
          <p className="text-parchment-muted mb-6 font-body text-lg">
            {didWin ? "Congratulations, you won!" : "Better luck next time!"}
          </p>
          <button onClick={onLeave} className="px-6 py-3 btn-stone rounded-lg text-sm">
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
        <div className="stone-panel ornate-border rounded-xl p-8 text-center">
          <div className="animate-pulse">
            <h2 className="text-2xl text-gold font-medieval mb-4">Waiting for opponent...</h2>
            <p className="text-parchment-muted font-body">Share this page to play with a friend</p>
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
    setInspectedCardId(null);

    if (card.cardType === "summoning" || card.cardType === "echo") {
      // Start summoning/echo flow
      setMode({
        type: card.cardType === "summoning" ? "summoning" : "echo",
        card,
        selectedRuneIds: [],
      });
    } else if (card.cardType === "memory") {
      // Start memory rune selection flow
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
      // Check if memory needs a target
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
      // Toggle inspect to see attached runes
      setInspectedCardId((prev) => prev === card.instanceId ? null : card.instanceId);
      return;
    }
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

  // Start blocking mode automatically when it's blocking phase
  if (isBlockingPhase && mode.type === "idle") {
    // Trigger block mode
    setTimeout(() => setMode({ type: "declare_block", assignments: new Map() }), 0);
  }

  // Check if a card can be played (has available runes to spell it)
  const canSpellCard = (card: CardState) => {
    if (card.cardType !== "summoning" && card.cardType !== "echo" && card.cardType !== "memory") return false;
    const needed = card.spellName.split("").sort();
    const available = myPlayer.runeField
      .filter((r) => r.etchingCounters === 0)
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

  // Compute remainingNeeded once from ALL runes for correct highlighting
  const isSpelling = mode.type === "summoning" || mode.type === "echo" || mode.type === "memory";
  const selectedRuneIds = isSpelling ? mode.selectedRuneIds : [];
  const remainingNeeded = (() => {
    if (!isSpelling) return [];
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

  // Split runes into attached (per creature) and unattached
  const getAttachedRunes = (player: PlayerState, card: CardState) =>
    player.runeField.filter((r) => card.attachedRuneIds.includes(r.instanceId));
  const getUnattachedRunes = (player: PlayerState) =>
    player.runeField.filter((r) => !r.attachedToId);

  const myUnattachedRunes = getUnattachedRunes(myPlayer);
  const opponentUnattachedRunes = getUnattachedRunes(opponent);

  // Helper: is a rune available for spelling selection?
  const isRuneAvailable = (rune: CardState) => {
    if (rune.etchingCounters > 0) return false;
    if (!isSpelling) return false;
    if (selectedRuneIds.includes(rune.instanceId)) return true;
    return remainingNeeded.includes(rune.letter);
  };

  // Turn phase display
  const phaseLabel = turnPhase === "main" ? "Main Phase" :
    turnPhase === "declare_attackers" ? "Declaring Attackers" :
    turnPhase === "declare_blockers" ? "Blocking Phase" :
    turnPhase === "combat_damage" ? "Combat!" : turnPhase;

  const bannerClip = { clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)' };

  return (
    <div className="min-h-screen flex flex-col p-3 gap-2">
      {/* Turn indicator */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        <div
          className={`px-6 py-1.5 font-semibold text-sm font-medieval ${
            isMyTurn ? "btn-stone text-gold shadow-gold-glow" : "stone-panel text-stone-400"
          }`}
          style={bannerClip}
        >
          {isMyTurn ? "Your Turn" : "Opponent's Turn"} - Turn {turnNumber}
        </div>
        <div
          className="px-5 py-1.5 stone-panel text-parchment-muted text-sm font-medieval"
          style={bannerClip}
        >
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
            className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              mode.type === "targeting_memory" ? "ring-target" : ""
            }`}
            style={{
              background: 'linear-gradient(135deg, #8b0000, #5c0000)',
              border: '3px solid #b22222',
              boxShadow: '0 0 8px rgba(139,0,0,0.4)',
            }}
          >
            <span className="text-parchment-light font-bold font-medieval">{opponent.health}</span>
          </div>
          <div>
            <p className="text-parchment font-medieval text-sm">{opponent.nickname}</p>
            <p className="text-stone-400 text-xs font-body">
              Chaos: {opponent.chaosDeck.length} | Runes: {opponent.runesDeck.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-stone-400 text-xs font-body">
          <span>Hand: {opponent.hand.length}</span>
          <button
            onClick={() => setShowGraveyard("opponent")}
            className="flex items-center gap-1 px-2 py-1 rounded btn-stone text-xs"
          >
            <span>&#x1F480;</span> {opponent.graveyard.length}
          </button>
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

      {/* Board: battlefield area + vertical divider + unattached runes column */}
      <div className="flex gap-0 flex-1">
        {/* Battlefield area */}
        <div className="flex-1 flex flex-col">
          {/* Opponent creatures with attached runes below */}
          <div className="flex justify-center gap-4 flex-wrap min-h-[150px] stone-panel rounded-lg p-3 items-start">
            {opponent.battlefield.length === 0 ? (
              <div className="text-stone-500 flex items-center text-sm self-center font-body italic">No creatures</div>
            ) : (
              opponent.battlefield.map((card) => (
                <div key={card.instanceId} className="flex flex-col items-center gap-1">
                  <Card
                    card={card}
                    onClick={() => handleEnemyCreatureClick(card)}
                    isTarget={mode.type === "targeting_memory"}
                    isAttacker={declaredAttackers.includes(card.instanceId)}
                    isSelected={inspectedCardId === card.instanceId}
                  />
                  {/* Attached runes below creature */}
                  {getAttachedRunes(opponent, card).length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center max-w-[100px]">
                      {getAttachedRunes(opponent, card).map((rune) => (
                        <Card key={rune.instanceId} card={rune} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Horizontal divider */}
          <div className="divider-ornate my-1" />

          {/* My creatures with attached runes below */}
          <div className="flex justify-center gap-4 flex-wrap min-h-[150px] stone-panel rounded-lg p-3 items-start">
            {myPlayer.battlefield.length === 0 ? (
              <div className="text-stone-500 flex items-center text-sm self-center font-body italic">Summon creatures here</div>
            ) : (
              myPlayer.battlefield.map((card) => (
                <div key={card.instanceId} className="flex flex-col items-center gap-1">
                  <Card
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
                      inspectedCardId === card.instanceId ||
                      (mode.type === "declare_attack" &&
                      mode.selectedAttackerIds.includes(card.instanceId))
                    }
                  />
                  {/* Attached runes below creature — clickable during summoning */}
                  {getAttachedRunes(myPlayer, card).length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center max-w-[100px]">
                      {getAttachedRunes(myPlayer, card).map((rune) => (
                        <Card
                          key={rune.instanceId}
                          card={rune}
                          onClick={() => handleRuneClick(rune)}
                          isSelected={selectedRuneIds.includes(rune.instanceId)}
                          isPlayable={isRuneAvailable(rune)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Vertical divider */}
        <div className="mx-2 w-px" style={{ background: 'linear-gradient(180deg, transparent 0%, #c9a84c 30%, #c9a84c 70%, transparent 100%)' }} />

        {/* Unattached runes column */}
        <div className="w-24 flex flex-col">
          {/* Opponent unattached runes */}
          <div className="flex-1 min-h-[150px]">
            <RuneField
              runes={opponentUnattachedRunes}
              selectedRuneIds={[]}
              isSummoningMode={false}
              label="Free Runes"
              layout="vertical"
            />
          </div>

          {/* Horizontal divider */}
          <div className="divider-ornate my-1" />

          {/* My unattached runes */}
          <div className="flex-1 min-h-[150px]">
            <RuneField
              runes={myUnattachedRunes}
              selectedRuneIds={selectedRuneIds}
              onRuneClick={handleRuneClick}
              isSummoningMode={isSpelling}
              remainingLetters={remainingNeeded}
              label="Free Runes"
              layout="vertical"
            />
          </div>
        </div>
      </div>

      {/* Spell name checker (when summoning/echo/memory) */}
      {(mode.type === "summoning" || mode.type === "echo" || mode.type === "memory") && (
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
        <div className="stone-panel metal-border rounded-lg p-2 text-center text-gold text-sm font-medieval">
          Select a target for {mode.card.name}
          <button
            onClick={() => setMode({ type: "idle" })}
            className="ml-3 px-2 py-0.5 btn-stone rounded text-xs"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Rune deck picker (when player has writes remaining) */}
      {myPlayer.runesWrittenThisTurn < myPlayer.maxRuneWritesThisTurn && myPlayer.runesDeck.length > 0 && (
        <div className="stone-panel metal-border rounded-lg p-3">
          <div className="text-gold text-sm mb-2 font-medieval">
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
                      className="w-10 h-14 rounded flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110"
                      style={{
                        background: rune.runeType === "blood" ? 'linear-gradient(135deg, #5c0000, #3a0000)' :
                          rune.runeType === "stone" ? 'linear-gradient(135deg, #4a3c30, #2a2018)' :
                          'linear-gradient(135deg, #1e170f, #14100a)',
                        border: `2px solid ${rune.runeType === "blood" ? '#8b0000' : rune.runeType === "stone" ? '#6b5c4e' : '#4a3c30'}`,
                      }}
                    >
                      <span className="text-gold font-bold text-lg font-medieval">{rune.letter}</span>
                      <span className="text-stone-400 text-[8px] font-body">x{runes.length}</span>
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
                (mode.type === "summoning" || mode.type === "echo" || mode.type === "memory") &&
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
            className="w-14 h-14 rounded-full flex items-center justify-center cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #2d5a27, #1a3a15)',
              border: '3px solid #3d7a35',
              boxShadow: '0 0 6px rgba(61,122,53,0.3)',
            }}
          >
            <span className="text-parchment-light font-bold font-medieval">{myPlayer.health}</span>
          </div>
          <div>
            <p className="text-parchment font-medieval text-sm">{myPlayer.nickname}</p>
            <p className="text-stone-400 text-xs font-body">
              Chaos: {myPlayer.chaosDeck.length} | Runes: {myPlayer.runesDeck.length}
            </p>
          </div>
          <button
            onClick={() => setShowGraveyard("mine")}
            className="flex items-center gap-1 px-2 py-1 rounded btn-stone text-xs"
          >
            <span>&#x1F480;</span> {myPlayer.graveyard.length}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Attack mode button */}
          {isMyTurn && turnPhase === "main" && mode.type === "idle" && (
            <button
              onClick={enterAttackMode}
              className="px-4 py-2 btn-blood rounded-lg text-sm"
            >
              Attack
            </button>
          )}

          {/* Confirm attackers */}
          {mode.type === "declare_attack" && (
            <div className="flex gap-2">
              <button
                onClick={() => setMode({ type: "idle" })}
                className="px-3 py-2 btn-stone rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmAttackers}
                disabled={mode.selectedAttackerIds.length === 0}
                className={`px-4 py-2 rounded-lg text-sm ${
                  mode.selectedAttackerIds.length > 0
                    ? "btn-blood"
                    : "btn-stone opacity-50"
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
              className="px-4 py-2 btn-stone rounded-lg text-sm"
            >
              Confirm Blockers ({mode.assignments.size})
            </button>
          )}

          {/* End turn */}
          {isMyTurn && turnPhase === "main" && mode.type === "idle" && (
            <button
              onClick={onEndTurn}
              className="px-4 py-2 btn-stone rounded-lg text-sm"
            >
              End Turn
            </button>
          )}
        </div>
      </div>

      {/* Graveyard overlay */}
      {showGraveyard && (() => {
        const cards = showGraveyard === "mine" ? myPlayer.graveyard : opponent.graveyard;
        const title = showGraveyard === "mine" ? "Your Graveyard" : "Opponent's Graveyard";
        return (
          <div
            className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center"
            onClick={() => setShowGraveyard(null)}
          >
            <div
              className="stone-panel ornate-border rounded-xl p-4 max-w-3xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-parchment font-medieval text-lg">{title} ({cards.length})</h2>
                <button
                  onClick={() => setShowGraveyard(null)}
                  className="px-3 py-1 btn-stone rounded text-sm"
                >
                  Close
                </button>
              </div>
              {cards.length === 0 ? (
                <p className="text-stone-400 text-sm text-center py-8 font-body italic">No cards in graveyard</p>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center">
                  {cards.map((card) => (
                    <Card key={card.instanceId} card={card} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
