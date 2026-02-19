import { Card } from "../Card/Card";
import { CardState } from "../../hooks/useColyseus";

interface WriteRuneOverlayProps {
  cardName: string;
  runeType: string;
  runes: CardState[];
  onSelect: (runeId: string | null) => void;
}

export function WriteRuneOverlay({ cardName, runeType, runes, onSelect }: WriteRuneOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center">
      <div
        className="stone-panel ornate-border rounded-xl p-4 max-w-3xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-parchment font-medieval text-lg">
            {cardName}&apos;s death: Write a {runeType} rune
          </h2>
          <button
            onClick={() => onSelect(null)}
            className="px-3 py-1 btn-stone rounded text-sm"
          >
            Skip
          </button>
        </div>
        {runes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-stone-400 text-sm font-body italic mb-4">No {runeType} runes in deck</p>
            <button
              onClick={() => onSelect(null)}
              className="px-4 py-2 btn-stone rounded text-sm font-medieval"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {runes.map((rune) => (
              <div
                key={rune.instanceId}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => onSelect(rune.instanceId)}
              >
                <Card card={rune} size="sm" isPlayable />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
