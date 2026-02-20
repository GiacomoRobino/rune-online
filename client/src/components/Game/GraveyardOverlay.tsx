import { Card } from "../Card/Card";
import { CardState, PlayerState } from "../../hooks/useColyseus";
import { CardSize } from "../Card/Card";

interface GraveyardOverlayProps {
  which: "mine" | "opponent";
  myPlayer: PlayerState;
  opponent: PlayerState;
  onClose: () => void;
  cardSize?: CardSize;
  onCardClick?: (cardId: string) => void;
  filterType?: string;
}

export function GraveyardOverlay({ which, myPlayer, opponent, onClose, cardSize = "sm", onCardClick, filterType }: GraveyardOverlayProps) {
  const cards: CardState[] = which === "mine" ? myPlayer.graveyard : opponent.graveyard;
  const title = which === "mine" ? "Your Graveyard" : "Opponent's Graveyard";

  return (
    <div
      className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="stone-panel ornate-border rounded-xl p-4 max-w-3xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-parchment font-medieval text-lg">{title} ({cards.length})</h2>
          <button onClick={onClose} className="px-3 py-1 btn-stone rounded text-sm">
            Close
          </button>
        </div>
        {cards.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-8 font-body italic">No cards in graveyard</p>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {cards.map((card) => {
              const isClickable = onCardClick && (!filterType || card.cardType === filterType);
              return (
                <div
                  key={card.instanceId}
                  className={isClickable ? "cursor-pointer hover:scale-105 transition-transform" : ""}
                  onClick={isClickable ? () => onCardClick(card.instanceId) : undefined}
                >
                  <Card card={card} size={cardSize} isPlayable={!!isClickable} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
