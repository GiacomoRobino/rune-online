import { PlayerState } from "../../hooks/useColyseus";
import { Card } from "../Card/Card";

interface MulliganScreenProps {
  myPlayer: PlayerState;
  opponent: PlayerState;
  onKeep: () => void;
  onRedraw: () => void;
}

export function MulliganScreen({ myPlayer, opponent, onKeep, onRedraw }: MulliganScreenProps) {
  const hasKept = myPlayer.hasKeptHand;
  const opponentKept = opponent.hasKeptHand;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl text-gold font-medieval-decorative" style={{ textShadow: '0 0 16px rgba(201,168,76,0.5)' }}>
        Mulligan Phase
      </h1>

      {/* Opponent status */}
      <div className="text-parchment-muted font-body text-sm">
        {opponentKept ? (
          <span className="text-gold">{opponent.nickname} has kept their hand</span>
        ) : (
          <span>{opponent.nickname} is deciding...</span>
        )}
      </div>

      {/* Hand display */}
      <div className="stone-panel ornate-border rounded-xl p-6">
        <p className="text-parchment font-medieval text-center mb-4">Your Hand</p>
        <div className="flex justify-center gap-3">
          {myPlayer.hand.map((card) => (
            <Card key={card.instanceId} card={card} size="md" />
          ))}
        </div>
      </div>

      {/* Action buttons */}
      {!hasKept ? (
        <div className="flex gap-4">
          {myPlayer.mulligansRemaining > 0 && (
            <button onClick={onRedraw} className="px-6 py-3 btn-blood rounded-lg font-medieval text-lg">
              Mulligan ({myPlayer.mulligansRemaining})
            </button>
          )}
          <button onClick={onKeep} className="px-6 py-3 btn-stone rounded-lg font-medieval text-lg">
            Keep Hand
          </button>
        </div>
      ) : (
        <div className="animate-pulse">
          <p className="text-gold font-medieval text-lg">Waiting for opponent...</p>
        </div>
      )}
    </div>
  );
}
