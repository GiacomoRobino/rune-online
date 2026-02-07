import { Card } from "../Card/Card";
import { CardState } from "../../hooks/useColyseus";

interface RuneFieldProps {
  runes: CardState[];
  selectedRuneIds: string[];
  onRuneClick?: (rune: CardState) => void;
  isSummoningMode: boolean;
  requiredLetters?: string[];
  highlightedRuneIds?: string[];
  label?: string;
}

export function RuneField({
  runes,
  selectedRuneIds,
  onRuneClick,
  isSummoningMode,
  requiredLetters = [],
  highlightedRuneIds = [],
  label,
}: RuneFieldProps) {
  // During summoning mode, highlight runes whose letter is still needed
  const remainingNeeded = [...requiredLetters];
  for (const id of selectedRuneIds) {
    const rune = runes.find((r) => r.instanceId === id);
    if (rune) {
      const idx = remainingNeeded.indexOf(rune.letter);
      if (idx !== -1) remainingNeeded.splice(idx, 1);
    }
  }

  const isRuneAvailable = (rune: CardState) => {
    if (rune.etchingCounters > 0) return false;
    if (!isSummoningMode) return false;
    if (selectedRuneIds.includes(rune.instanceId)) return true;
    return remainingNeeded.includes(rune.letter);
  };

  return (
    <div className="w-full">
      {label && (
        <div className="text-gray-400 text-xs mb-1">{label}</div>
      )}
      <div className="flex flex-wrap gap-1 min-h-[28px] bg-gray-900/30 rounded p-2">
        {runes.length === 0 && (
          <div className="text-gray-600 text-xs">No runes</div>
        )}
        {runes.map((rune) => (
          <Card
            key={rune.instanceId}
            card={rune}
            onClick={() => onRuneClick?.(rune)}
            isSelected={selectedRuneIds.includes(rune.instanceId)}
            isPlayable={isRuneAvailable(rune)}
            isHighlighted={highlightedRuneIds.includes(rune.instanceId)}
          />
        ))}
      </div>
    </div>
  );
}
