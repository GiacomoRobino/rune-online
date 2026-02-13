import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Card } from "../../Card/Card";
import { CardState } from "../../../hooks/useColyseus";
import { RuneField } from "../RuneField";
import { RuneLinks } from "../RuneLinks";
import { SpellNameChecker } from "../SpellNameChecker";
import { TurnBanner } from "../TurnBanner";
import { ActionBar } from "../ActionBar";
import { GraveyardOverlay } from "../GraveyardOverlay";
import { RunePicker } from "../RunePicker";
import { AnimationOverlay } from "../AnimationOverlay";
import { RuneAttachEffect } from "../RuneAttachEffect";
import { BlockerLinks } from "../BlockerLinks";

import { LayoutProps } from "./types";

export function LayoutCompact({
  myPlayer, opponent, isMyTurn, turnPhase, turnNumber, declaredAttackers,
  interactions: gi, onWriteRune, onEndTurn, gameEvents,
}: LayoutProps) {
  const opponentUnattachedRunes = gi.getUnattachedRunes(opponent);

  const [handOpen, setHandOpen] = useState(false);
  const [handLocked, setHandLocked] = useState(false);

  // Auto-open hand when spelling
  useEffect(() => {
    if (gi.isSpelling) {
      setHandOpen(true);
    }
  }, [gi.isSpelling]);

  const closeHandIfUnlocked = () => {
    if (!handLocked && !gi.isSpelling) {
      setHandOpen(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex">
      <TurnBanner isMyTurn={isMyTurn} turnNumber={turnNumber} phaseLabel={gi.phaseLabel} />

      {/* Left panel: player info */}
      <div className="w-48 flex flex-col stone-panel border-r border-stone-700/50 p-3 gap-4 pt-14">
        {/* Opponent info */}
        <div className="flex flex-col items-center gap-2">
          <div
            onClick={() => gi.handleHeroClick(false)}
            className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
              gi.mode.type === "targeting_memory" ? "ring-target" : ""
            }`}
            style={{
              background: 'linear-gradient(135deg, #8b0000, #5c0000)',
              border: '3px solid #b22222',
              boxShadow: '0 0 8px rgba(139,0,0,0.4)',
            }}
          >
            <span className="text-parchment-light font-bold text-lg font-medieval">{opponent.health}</span>
          </div>
          <p className="text-parchment font-medieval text-sm text-center">{opponent.nickname}</p>
          <p className="text-stone-400 text-xs font-body text-center">
            Chaos: {opponent.chaosDeck.length} | Runes: {opponent.runesDeck.length}
          </p>
          <button
            onClick={() => gi.setShowGraveyard("opponent")}
            className="flex items-center gap-1 px-2 py-1 rounded btn-stone text-xs"
          >
            <span>&#x1F480;</span> {opponent.graveyard.length}
          </button>
          <div className="text-stone-400 text-xs font-body">Hand: {opponent.hand.length}</div>
        </div>

        <div className="divider-ornate" />

        {/* My info */}
        <div className="flex flex-col items-center gap-2 mt-auto">
          <div
            onClick={() => gi.handleHeroClick(true)}
            className={`w-16 h-16 rounded-full flex items-center justify-center cursor-pointer ${
              gi.mode.type === "targeting_memory" ? "ring-target" : ""
            }`}
            style={{
              background: 'linear-gradient(135deg, #2d5a27, #1a3a15)',
              border: '3px solid #3d7a35',
              boxShadow: '0 0 6px rgba(61,122,53,0.3)',
            }}
          >
            <span className="text-parchment-light font-bold text-lg font-medieval">{myPlayer.health}</span>
          </div>
          <p className="text-parchment font-medieval text-sm text-center">{myPlayer.nickname}</p>
          <p className="text-stone-400 text-xs font-body text-center">
            Chaos: {myPlayer.chaosDeck.length} | Runes: {myPlayer.runesDeck.length}
          </p>
          <button
            onClick={() => gi.setShowGraveyard("mine")}
            className="flex items-center gap-1 px-2 py-1 rounded btn-stone text-xs"
          >
            <span>&#x1F480;</span> {myPlayer.graveyard.length}
          </button>
        </div>
      </div>

      {/* Center arena */}
      <div className="flex-1 flex flex-col p-3 gap-2 pt-14 min-h-0 overflow-hidden">
        {/* Opponent hand (small icons) */}
        <div className="flex justify-center gap-1 shrink-0">
          {opponent.hand.map((_, i) => (
            <div
              key={i}
              className="w-5 h-7 rounded-sm"
              style={{
                background: 'linear-gradient(135deg, #4a3728, #2a1f16)',
                border: '1px solid #6b5c4e',
              }}
            />
          ))}
        </div>

        {/* Opponent battlefield */}
        <div className="flex-1 min-h-0 overflow-y-auto flex justify-center gap-4 flex-wrap rounded-lg p-3 items-start content-start"
          onClick={closeHandIfUnlocked}
          style={{
            background: 'linear-gradient(145deg, rgba(30,23,15,0.6) 0%, rgba(20,16,10,0.8) 100%)',
            border: '1px solid rgba(107,92,78,0.2)',
          }}
        >
          {opponent.battlefield.length === 0 ? (
            <div className="text-stone-500 flex items-center text-sm self-center font-body italic">No creatures</div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {opponent.battlefield.map((card) => (
                <div key={card.instanceId} className="flex flex-col items-center gap-1">
                  <Card
                    card={card}
                    onClick={() => gi.handleEnemyCreatureClick(card)}
                    isTarget={gi.mode.type === "targeting_memory"}
                    isAttacker={declaredAttackers.includes(card.instanceId)}
                    isSelected={gi.inspectedCardId === card.instanceId}
                    size="md"
                  />
                  {gi.getAttachedRunes(opponent, card).length > 0 && (
                    <div className="grid grid-cols-2 gap-0.5 max-w-[100px]">
                      {gi.getAttachedRunes(opponent, card).map((rune) => (
                        <Card key={rune.instanceId} card={rune} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Ornate divider */}
        <div className="divider-ornate my-0.5 shrink-0" />

        {/* My battlefield */}
        <div className="flex-1 min-h-0 overflow-y-auto flex justify-center gap-4 flex-wrap rounded-lg p-3 items-start content-start"
          onClick={closeHandIfUnlocked}
          style={{
            background: 'linear-gradient(145deg, rgba(30,23,15,0.6) 0%, rgba(20,16,10,0.8) 100%)',
            border: '1px solid rgba(107,92,78,0.2)',
          }}
        >
          {myPlayer.battlefield.length === 0 ? (
            <div className="text-stone-500 flex items-center text-sm self-center font-body italic">Summon creatures here</div>
          ) : (
            <AnimatePresence mode="popLayout" initial={false}>
              {myPlayer.battlefield.map((card) => (
                <div key={card.instanceId} className="flex flex-col items-center gap-1">
                  <Card
                    card={card}
                    onClick={() => gi.handleMyCreatureClick(card)}
                    isAttacker={
                      gi.mode.type === "declare_attack" &&
                      gi.mode.selectedAttackerIds.includes(card.instanceId)
                    }
                    isBlockCandidate={
                      gi.mode.type === "declare_block" &&
                      gi.mode.assignments.has(card.instanceId)
                    }
                    isSelected={
                      gi.inspectedCardId === card.instanceId ||
                      (gi.mode.type === "declare_attack" &&
                      gi.mode.selectedAttackerIds.includes(card.instanceId)) ||
                      (gi.mode.type === "declare_block" &&
                      gi.mode.selectedBlockerId === card.instanceId)
                    }
                    size="md"
                  />
                  {gi.getAttachedRunes(myPlayer, card).length > 0 && (
                    <div className="grid grid-cols-2 gap-0.5 max-w-[100px]">
                      {gi.getAttachedRunes(myPlayer, card).map((rune) => (
                        <Card
                          key={rune.instanceId}
                          card={rune}
                          onClick={() => gi.handleRuneClick(rune)}
                          isSelected={gi.selectedRuneIds.includes(rune.instanceId)}
                          isPlayable={gi.isRuneAvailable(rune)}
                          size="sm"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Bottom fixed section */}
        <div className="shrink-0 relative">
          {/* Hand popup overlay */}
          {handOpen && (
            <div className="absolute bottom-full left-0 right-0 bg-stone-900/90 rounded-t-lg p-3 z-10">
              {/* Lock button */}
              <button
                onClick={() => setHandLocked((l) => !l)}
                className="absolute top-2 right-2 px-1.5 py-0.5 btn-stone rounded text-xs"
                title={handLocked ? "Unlock hand" : "Lock hand open"}
              >
                {handLocked ? "\u{1F512}" : "\u{1F513}"}
              </button>

              <div className="flex justify-center gap-1.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {myPlayer.hand.map((card) => {
                    const isSelectedInHand = gi.isSpelling && gi.mode.type !== "idle" && "card" in gi.mode && gi.mode.card.instanceId === card.instanceId;
                    return (
                      <div
                        key={card.instanceId}
                        className={`transform transition-transform ${isSelectedInHand ? "-translate-y-2" : "hover:-translate-y-2"}`}
                      >
                        <Card
                          card={card}
                          onClick={() => gi.handleCardInHandClick(card)}
                          isPlayable={turnPhase === "main" && gi.canSpellCard(card) && (isMyTurn || card.cardType === "memory")}
                          isSelected={
                            (gi.mode.type === "summoning" || gi.mode.type === "echo" || gi.mode.type === "memory") &&
                            gi.mode.card.instanceId === card.instanceId
                          }
                          isInHand
                          size="sm"
                        />
                      </div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Spell name checker */}
          {(gi.mode.type === "summoning" || gi.mode.type === "echo" || gi.mode.type === "memory") && (
            <SpellNameChecker
              spellName={gi.mode.card.spellName}
              selectedRunes={gi.selectedRuneIds
                .map((id) => myPlayer.runeField.find((r) => r.instanceId === id))
                .filter((r): r is CardState => r !== undefined)
              }
              onConfirm={gi.handleConfirmSummon}
              onCancel={gi.cancelMode}
            />
          )}

          {/* Blocker selection prompt */}
          {gi.mode.type === "declare_block" && gi.mode.selectedBlockerId && (
            <div className="stone-panel metal-border rounded-lg p-2 text-center text-gold text-sm font-medieval">
              Select an attacker to block
            </div>
          )}

          {/* Targeting indicator */}
          {gi.mode.type === "targeting_memory" && (
            <div className="stone-panel metal-border rounded-lg p-2 text-center text-gold text-sm font-medieval">
              Select a target for {gi.mode.card.name}
              <button onClick={gi.cancelMode} className="ml-3 px-2 py-0.5 btn-stone rounded text-xs">
                Cancel
              </button>
            </div>
          )}

          {/* Rune picker */}
          <RunePicker myPlayer={myPlayer} onWriteRune={onWriteRune} />

          {/* Action buttons + hand toggle */}
          <div className="flex justify-center items-center gap-2">
            <ActionBar
              mode={gi.mode}
              isMyTurn={isMyTurn}
              turnPhase={turnPhase}
              isBlockingPhase={gi.isBlockingPhase}
              enterAttackMode={gi.enterAttackMode}
              confirmAttackers={gi.confirmAttackers}
              confirmBlockers={gi.confirmBlockers}
              cancelMode={gi.cancelMode}
              onEndTurn={onEndTurn}
            />
            <button
              onClick={() => setHandOpen((o) => !o)}
              className="btn-stone px-3 py-1.5 rounded text-sm font-medieval"
            >
              Hand ({myPlayer.hand.length})
            </button>
          </div>
        </div>
      </div>

      {/* Right panel: rune columns */}
      <div className="w-28 flex flex-col stone-panel border-l border-stone-700/50 p-2 pt-14 gap-2">
        {/* Opponent runes */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <RuneField
            runes={opponentUnattachedRunes}
            selectedRuneIds={[]}
            isSummoningMode={false}
            label="Opp Runes"
            layout="vertical"
          />
        </div>

        <div className="divider-ornate" />

        {/* My runes */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <RuneField
            runes={gi.myUnattachedRunes}
            selectedRuneIds={gi.selectedRuneIds}
            onRuneClick={gi.handleRuneClick}
            isSummoningMode={gi.isSpelling}
            remainingLetters={gi.remainingNeeded}
            label="Your Runes"
            layout="vertical"
          />
        </div>
      </div>

      {/* Graveyard overlay */}
      {gi.showGraveyard && (
        <GraveyardOverlay
          which={gi.showGraveyard}
          myPlayer={myPlayer}
          opponent={opponent}
          onClose={() => gi.setShowGraveyard(null)}
          cardSize="sm"
        />
      )}

      {/* Rune links */}
      {gi.isSpelling && gi.selectedRuneIds.length > 0 && gi.mode.type !== "idle" && "card" in gi.mode && (
        <RuneLinks selectedRuneIds={gi.selectedRuneIds} targetCardId={gi.mode.card.instanceId} />
      )}

      {/* Blocker → attacker links */}
      {gi.mode.type === "declare_block" && gi.mode.assignments.size > 0 && (
        <BlockerLinks assignments={gi.mode.assignments} />
      )}

      {/* Animation overlays */}
      <AnimationOverlay gameEvents={gameEvents} />
      <RuneAttachEffect gameEvents={gameEvents} />
    </div>
  );
}
