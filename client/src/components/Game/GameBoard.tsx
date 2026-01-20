import { useState } from "react";
import { Card } from "../Card/Card";
import { PlayerState, CardState } from "../../hooks/useColyseus";

interface GameBoardProps {
  myPlayer: PlayerState;
  opponent: PlayerState;
  isMyTurn: boolean;
  phase: string;
  turnNumber: number;
  winner: string;
  mySessionId: string;
  onPlayCard: (cardId: string, targetId?: string) => void;
  onAttack: (attackerId: string, targetId: string) => void;
  onEndTurn: () => void;
  onLeave: () => void;
}

export function GameBoard({
  myPlayer,
  opponent,
  isMyTurn,
  phase,
  turnNumber,
  winner,
  mySessionId,
  onPlayCard,
  onAttack,
  onEndTurn,
  onLeave,
}: GameBoardProps) {
  const [selectedAttacker, setSelectedAttacker] = useState<string | null>(null);

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
          <button
            onClick={onLeave}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold"
          >
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

  const handleCardInHandClick = (card: CardState) => {
    if (!isMyTurn) return;
    if (card.cost > myPlayer.mana) return;

    // For spells that need targets, we'd implement targeting here
    // For now, play directly
    onPlayCard(card.instanceId);
  };

  const handleBattlefieldMinionClick = (card: CardState, isOwn: boolean) => {
    if (!isMyTurn) return;

    if (isOwn) {
      // Select as attacker
      if (card.canAttack && !card.hasAttacked) {
        setSelectedAttacker(card.instanceId);
      }
    } else {
      // If we have an attacker selected, attack this minion
      if (selectedAttacker) {
        onAttack(selectedAttacker, card.instanceId);
        setSelectedAttacker(null);
      }
    }
  };

  const handleHeroClick = (isOwn: boolean) => {
    if (!isMyTurn) return;

    // If clicking enemy hero with attacker selected
    if (!isOwn && selectedAttacker) {
      onAttack(selectedAttacker, "hero");
      setSelectedAttacker(null);
    }
  };

  const canPlayCard = (card: CardState) => {
    return isMyTurn && card.cost <= myPlayer.mana;
  };

  return (
    <div className="min-h-screen flex flex-col p-4">
      {/* Turn indicator */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-10">
        <div
          className={`px-6 py-2 rounded-full font-semibold ${
            isMyTurn ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300"
          }`}
        >
          {isMyTurn ? "Your Turn" : "Opponent's Turn"} - Turn {turnNumber}
        </div>
      </div>

      {/* Opponent section */}
      <div className="flex-1 flex flex-col">
        {/* Opponent info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {/* Opponent hero */}
            <div
              onClick={() => handleHeroClick(false)}
              className={`w-16 h-16 rounded-full bg-gradient-to-br from-red-800 to-red-600 border-4 border-red-500 flex items-center justify-center cursor-pointer hover:border-red-400 transition-colors ${
                selectedAttacker ? "ring-2 ring-yellow-400" : ""
              }`}
            >
              <span className="text-white font-bold">{opponent.health}</span>
            </div>
            <div>
              <p className="text-white font-semibold">{opponent.nickname}</p>
              <p className="text-blue-400 text-sm">
                {opponent.mana}/{opponent.maxMana} Mana
              </p>
            </div>
          </div>
          <div className="text-gray-400 text-sm">
            Hand: {opponent.hand.length} | Deck: {opponent.deck.length}
          </div>
        </div>

        {/* Opponent hand (face down) */}
        <div className="flex justify-center gap-2 mb-4">
          {opponent.hand.map((_, i) => (
            <div key={i} className="transform scale-75">
              <Card card={{} as CardState} showBack />
            </div>
          ))}
        </div>

        {/* Opponent battlefield */}
        <div className="flex justify-center gap-3 min-h-[160px] bg-gray-900/30 rounded-lg p-4 mb-4">
          {opponent.battlefield.length === 0 ? (
            <div className="text-gray-600 flex items-center">No minions</div>
          ) : (
            opponent.battlefield.map((card) => (
              <Card
                key={card.instanceId}
                card={card}
                onClick={() => handleBattlefieldMinionClick(card, false)}
                isTarget={!!selectedAttacker}
              />
            ))
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700 my-2" />

        {/* My battlefield */}
        <div className="flex justify-center gap-3 min-h-[160px] bg-gray-900/30 rounded-lg p-4 mb-4">
          {myPlayer.battlefield.length === 0 ? (
            <div className="text-gray-600 flex items-center">Play minions here</div>
          ) : (
            myPlayer.battlefield.map((card) => (
              <Card
                key={card.instanceId}
                card={card}
                onClick={() => handleBattlefieldMinionClick(card, true)}
                isAttacker={selectedAttacker === card.instanceId}
              />
            ))
          )}
        </div>

        {/* My hand */}
        <div className="flex justify-center gap-2 mb-4">
          {myPlayer.hand.map((card) => (
            <div
              key={card.instanceId}
              className="transform hover:-translate-y-2 transition-transform"
            >
              <Card
                card={card}
                onClick={() => handleCardInHandClick(card)}
                isPlayable={canPlayCard(card)}
                isInHand
              />
            </div>
          ))}
        </div>

        {/* My info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* My hero */}
            <div
              onClick={() => handleHeroClick(true)}
              className="w-16 h-16 rounded-full bg-gradient-to-br from-green-800 to-green-600 border-4 border-green-500 flex items-center justify-center"
            >
              <span className="text-white font-bold">{myPlayer.health}</span>
            </div>
            <div>
              <p className="text-white font-semibold">{myPlayer.nickname}</p>
              <div className="flex items-center gap-1">
                {Array.from({ length: myPlayer.maxMana }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      i < myPlayer.mana ? "bg-blue-500" : "bg-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-gray-400 text-sm">
              Deck: {myPlayer.deck.length}
            </div>
            {isMyTurn && (
              <button
                onClick={onEndTurn}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition-colors"
              >
                End Turn
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
