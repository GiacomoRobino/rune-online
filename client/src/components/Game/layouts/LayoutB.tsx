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

import { LayoutProps } from "./types";

export function LayoutB({
  myPlayer, opponent, isMyTurn, turnPhase, turnNumber, declaredAttackers,
  interactions: gi, onWriteRune, onEndTurn, gameEvents,
}: LayoutProps) {
  const opponentUnattachedRunes = gi.getUnattachedRunes(opponent);

  return (
    <div className="min-h-screen flex">
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
      <div className="flex-1 flex flex-col p-3 gap-2 pt-14">
        {/* Opponent hand (face down) */}
        <div className="flex justify-center gap-1 mb-1">
          {opponent.hand.map((_, i) => (
            <Card key={i} card={{} as CardState} showBack size="sm" />
          ))}
        </div>

        {/* Opponent battlefield */}
        <div className="flex justify-center gap-6 flex-wrap min-h-[200px] rounded-lg p-4 items-start"
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
                    size="lg"
                  />
                  {gi.getAttachedRunes(opponent, card).length > 0 && (
                    <div className="grid grid-cols-2 gap-1 max-w-[130px]">
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
        <div className="divider-ornate my-1" />

        {/* My battlefield */}
        <div className="flex justify-center gap-6 flex-wrap min-h-[200px] rounded-lg p-4 items-start"
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
                    size="lg"
                  />
                  {gi.getAttachedRunes(myPlayer, card).length > 0 && (
                    <div className="grid grid-cols-2 gap-1 max-w-[130px]">
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

        {/* My hand */}
        <div className="flex justify-center gap-2 mb-2">
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
                    size="md"
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center">
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
        </div>
      </div>

      {/* Right panel: rune columns */}
      <div className="w-28 flex flex-col stone-panel border-l border-stone-700/50 p-2 pt-14 gap-2">
        {/* Opponent runes */}
        <div className="flex-1 overflow-y-auto">
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
        <div className="flex-1 overflow-y-auto">
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

      {/* Animation overlays */}
      <AnimationOverlay gameEvents={gameEvents} />
      <RuneAttachEffect gameEvents={gameEvents} />
    </div>
  );
}
