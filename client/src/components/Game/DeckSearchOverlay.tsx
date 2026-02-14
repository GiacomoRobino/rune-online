import { Card } from "../Card/Card";
import { CardState } from "../../hooks/useColyseus";

interface DeckSearchOverlayProps {
  cardName: string;
  cards: CardState[];
  onSelect: (cardId: string | null) => void;
}

export function DeckSearchOverlay({ cardName, cards, onSelect }: DeckSearchOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center">
      <div
        className="stone-panel ornate-border rounded-xl p-4 max-w-3xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-parchment font-medieval text-lg">
            {cardName}&apos;s death: Search your deck
          </h2>
          <button
            onClick={() => onSelect(null)}
            className="px-3 py-1 btn-stone rounded text-sm"
          >
            Skip
          </button>
        </div>
        {cards.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-stone-400 text-sm font-body italic mb-4">No matching cards found in deck</p>
            <button
              onClick={() => onSelect(null)}
              className="px-4 py-2 btn-stone rounded text-sm font-medieval"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {cards.map((card) => (
              <div
                key={card.instanceId}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onSelect(card.instanceId)}
              >
                <Card card={card} size="sm" isPlayable />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
