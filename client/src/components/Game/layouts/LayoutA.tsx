import { Card } from "../../Card/Card";
import { CardState } from "../../../hooks/useColyseus";
import { RuneField } from "../RuneField";
import { RuneLinks } from "../RuneLinks";
import { SpellNameChecker } from "../SpellNameChecker";
import { TurnBanner } from "../TurnBanner";
import { PlayerInfo } from "../PlayerInfo";
import { ActionBar } from "../ActionBar";
import { GraveyardOverlay } from "../GraveyardOverlay";
import { RunePicker } from "../RunePicker";
import { LayoutProps } from "./types";

export function LayoutA({
  myPlayer, opponent, isMyTurn, turnPhase, turnNumber, declaredAttackers,
  interactions: gi, onWriteRune, onEndTurn,
}: LayoutProps) {
  const opponentUnattachedRunes = gi.getUnattachedRunes(opponent);

  return (
    <div className="min-h-screen flex flex-col p-3 gap-2">
      <TurnBanner isMyTurn={isMyTurn} turnNumber={turnNumber} phaseLabel={gi.phaseLabel} />

      {/* Spacer for fixed header */}
      <div className="h-10" />

      {/* Opponent section */}
      <div className="flex items-center justify-between mb-1">
        <PlayerInfo
          player={opponent}
          isOpponent
          isTargeting={gi.mode.type === "targeting_memory"}
          onHeroClick={() => gi.handleHeroClick(false)}
          onGraveyardClick={() => gi.setShowGraveyard("opponent")}
        />
        <div className="text-stone-400 text-xs font-body">
          Hand: {opponent.hand.length}
        </div>
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex justify-center gap-1 mb-1">
        {opponent.hand.map((_, i) => (
          <Card key={i} card={{} as CardState} showBack size="sm" />
        ))}
      </div>

      {/* Opponent creatures with attached runes */}
      <div className="flex justify-center gap-6 flex-wrap min-h-[200px] stone-panel rounded-lg p-4 items-start">
        {opponent.battlefield.length === 0 ? (
          <div className="text-stone-500 flex items-center text-sm self-center font-body italic">No creatures</div>
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

      {/* Horizontal rune tray */}
      <div className="flex items-stretch gap-0">
        {/* Opponent free runes */}
        <div className="flex-1">
          <RuneField
            runes={opponentUnattachedRunes}
            selectedRuneIds={[]}
            isSummoningMode={false}
            label="Opponent Runes"
            layout="horizontal"
          />
        </div>

        {/* Vertical gold divider */}
        <div className="mx-2 w-px self-stretch" style={{ background: 'linear-gradient(180deg, transparent 0%, #c9a84c 30%, #c9a84c 70%, transparent 100%)' }} />

        {/* My free runes */}
        <div className="flex-1">
          <RuneField
            runes={gi.myUnattachedRunes}
            selectedRuneIds={gi.selectedRuneIds}
            onRuneClick={gi.handleRuneClick}
            isSummoningMode={gi.isSpelling}
            remainingLetters={gi.remainingNeeded}
            label="Your Runes"
            layout="horizontal"
          />
        </div>
      </div>

      {/* My creatures with attached runes */}
      <div className="flex justify-center gap-6 flex-wrap min-h-[200px] stone-panel rounded-lg p-4 items-start">
        {myPlayer.battlefield.length === 0 ? (
          <div className="text-stone-500 flex items-center text-sm self-center font-body italic">Summon creatures here</div>
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

      {/* My hand */}
      <div className="flex justify-center gap-2 mb-2">
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
      </div>

      {/* My info + action buttons */}
      <div className="flex items-center justify-between">
        <PlayerInfo
          player={myPlayer}
          isOpponent={false}
          isTargeting={gi.mode.type === "targeting_memory"}
          onHeroClick={() => gi.handleHeroClick(true)}
          onGraveyardClick={() => gi.setShowGraveyard("mine")}
        />
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
    </div>
  );
}
