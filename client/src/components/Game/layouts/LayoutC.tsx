import { Card } from "../../Card/Card";
import { CardState } from "../../../hooks/useColyseus";
import { RuneField } from "../RuneField";
import { RuneLinks } from "../RuneLinks";
import { SpellNameChecker } from "../SpellNameChecker";
import { ActionBar } from "../ActionBar";
import { GraveyardOverlay } from "../GraveyardOverlay";
import { RunePicker } from "../RunePicker";
import { LayoutProps } from "./types";

export function LayoutC({
  myPlayer, opponent, isMyTurn, turnPhase, turnNumber, declaredAttackers,
  interactions: gi, onWriteRune, onEndTurn,
}: LayoutProps) {
  const opponentUnattachedRunes = gi.getUnattachedRunes(opponent);

  const phaseLabel = gi.phaseLabel;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Compact top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-stone-700/30"
        style={{ background: 'linear-gradient(180deg, rgba(20,16,10,0.95), rgba(13,10,7,0.95))' }}
      >
        <div className="flex items-center gap-3">
          <div
            onClick={() => gi.handleHeroClick(false)}
            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
              gi.mode.type === "targeting_memory" ? "ring-target" : ""
            }`}
            style={{
              background: 'linear-gradient(135deg, #8b0000, #5c0000)',
              border: '2px solid #b22222',
            }}
          >
            <span className="text-parchment-light font-bold text-sm font-medieval">{opponent.health}</span>
          </div>
          <span className="text-parchment font-medieval text-sm">{opponent.nickname}</span>
          <button
            onClick={() => gi.setShowGraveyard("opponent")}
            className="px-1.5 py-0.5 rounded btn-stone text-[10px]"
          >
            &#x1F480; {opponent.graveyard.length}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded text-xs font-medieval ${isMyTurn ? "text-gold" : "text-stone-400"}`}
            style={{ background: 'rgba(201,168,76,0.1)' }}
          >
            {isMyTurn ? "Your Turn" : "Opponent's Turn"} &middot; {turnNumber}
          </span>
          <span className="text-stone-500 text-xs font-medieval">{phaseLabel}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => gi.setShowGraveyard("mine")}
            className="px-1.5 py-0.5 rounded btn-stone text-[10px]"
          >
            &#x1F480; {myPlayer.graveyard.length}
          </button>
          <span className="text-parchment font-medieval text-sm">{myPlayer.nickname}</span>
          <div
            onClick={() => gi.handleHeroClick(true)}
            className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer ${
              gi.mode.type === "targeting_memory" ? "ring-target" : ""
            }`}
            style={{
              background: 'linear-gradient(135deg, #2d5a27, #1a3a15)',
              border: '2px solid #3d7a35',
            }}
          >
            <span className="text-parchment-light font-bold text-sm font-medieval">{myPlayer.health}</span>
          </div>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col p-3 gap-2">
        {/* Opponent hand */}
        <div className="flex justify-center gap-1">
          {opponent.hand.map((_, i) => (
            <Card key={i} card={{} as CardState} showBack size="sm" />
          ))}
        </div>

        {/* Opponent battlefield + runes */}
        <div className="flex gap-2 flex-1">
          <div className="flex-1 flex justify-center gap-5 flex-wrap min-h-[190px] rounded-lg p-3 items-start"
            style={{
              background: 'linear-gradient(180deg, rgba(20,16,10,0.4), rgba(13,10,7,0.6))',
              border: '1px solid rgba(107,92,78,0.15)',
            }}
          >
            {opponent.battlefield.length === 0 ? (
              <div className="text-stone-600 flex items-center text-sm self-center font-body italic">No creatures</div>
            ) : (
              opponent.battlefield.map((card) => (
                <div key={card.instanceId} className="flex flex-col items-center gap-1">
                  <Card
                    card={card}
                    onClick={() => gi.handleEnemyCreatureClick(card)}
                    isTarget={gi.mode.type === "targeting_memory"}
                    isAttacker={declaredAttackers.includes(card.instanceId)}
                    isSelected={gi.inspectedCardId === card.instanceId}
                    size="lg"
                    artStyle="fullbleed"
                  />
                  {gi.getAttachedRunes(opponent, card).length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center max-w-[130px]">
                      {gi.getAttachedRunes(opponent, card).map((rune) => (
                        <Card key={rune.instanceId} card={rune} size="sm" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          {/* Opponent runes column */}
          <div className="w-20 overflow-y-auto">
            <RuneField
              runes={opponentUnattachedRunes}
              selectedRuneIds={[]}
              isSummoningMode={false}
              layout="vertical"
            />
          </div>
        </div>

        {/* Minimal gold line divider */}
        <div className="h-px" style={{ background: 'linear-gradient(90deg, transparent 5%, #c9a84c 30%, #c9a84c 70%, transparent 95%)' }} />

        {/* My battlefield + runes */}
        <div className="flex gap-2 flex-1">
          <div className="flex-1 flex justify-center gap-5 flex-wrap min-h-[190px] rounded-lg p-3 items-start"
            style={{
              background: 'linear-gradient(180deg, rgba(13,10,7,0.6), rgba(20,16,10,0.4))',
              border: '1px solid rgba(107,92,78,0.15)',
            }}
          >
            {myPlayer.battlefield.length === 0 ? (
              <div className="text-stone-600 flex items-center text-sm self-center font-body italic">Summon creatures here</div>
            ) : (
              myPlayer.battlefield.map((card) => (
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
                      gi.mode.selectedAttackerIds.includes(card.instanceId))
                    }
                    size="lg"
                    artStyle="fullbleed"
                  />
                  {gi.getAttachedRunes(myPlayer, card).length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-center max-w-[130px]">
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
              ))
            )}
          </div>
          {/* My runes column */}
          <div className="w-20 overflow-y-auto">
            <RuneField
              runes={gi.myUnattachedRunes}
              selectedRuneIds={gi.selectedRuneIds}
              onRuneClick={gi.handleRuneClick}
              isSummoningMode={gi.isSpelling}
              remainingLetters={gi.remainingNeeded}
              layout="vertical"
            />
          </div>
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

        {/* My hand — fullbleed style */}
        <div className="flex justify-center gap-2 mb-1">
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
                  artStyle="fullbleed"
                />
              </div>
            );
          })}
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

      {/* Graveyard overlay */}
      {gi.showGraveyard && (
        <GraveyardOverlay
          which={gi.showGraveyard}
          myPlayer={myPlayer}
          opponent={opponent}
          onClose={() => gi.setShowGraveyard(null)}
          cardSize="sm"
          artStyle="fullbleed"
        />
      )}

      {/* Rune links */}
      {gi.isSpelling && gi.selectedRuneIds.length > 0 && gi.mode.type !== "idle" && "card" in gi.mode && (
        <RuneLinks selectedRuneIds={gi.selectedRuneIds} targetCardId={gi.mode.card.instanceId} />
      )}
    </div>
  );
}
