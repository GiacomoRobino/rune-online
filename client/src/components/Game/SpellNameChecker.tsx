import { CardState } from "../../hooks/useColyseus";

interface SpellNameCheckerProps {
  spellName: string;
  selectedRunes: CardState[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function SpellNameChecker({
  spellName,
  selectedRunes,
  onConfirm,
  onCancel,
}: SpellNameCheckerProps) {
  const needed = spellName.split("");
  const provided = selectedRunes.map((r) => r.letter);

  // Check which letters are fulfilled
  const remaining = [...needed];
  for (const letter of provided) {
    const idx = remaining.indexOf(letter);
    if (idx !== -1) remaining.splice(idx, 1);
  }

  const isComplete = remaining.length === 0 && provided.length === needed.length;

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 flex items-center gap-3">
      <div className="text-gray-400 text-sm">Spell:</div>
      <div className="flex gap-1">
        {needed.map((letter, i) => {
          // Check if this letter slot is filled
          const tempRemaining = [...needed.slice(0, i)];
          const tempProvided = [...provided];
          for (const l of tempRemaining) {
            const idx = tempProvided.indexOf(l);
            if (idx !== -1) tempProvided.splice(idx, 1);
          }
          const isFilled = tempProvided.includes(letter);

          return (
            <div
              key={i}
              className={`
                w-8 h-8 rounded flex items-center justify-center font-bold text-lg
                ${isFilled ? "bg-green-700 text-green-200" : "bg-gray-700 text-gray-400"}
                border ${isFilled ? "border-green-500" : "border-gray-500"}
              `}
            >
              {letter}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!isComplete}
          className={`px-3 py-1 rounded text-sm font-semibold ${
            isComplete
              ? "bg-green-600 hover:bg-green-500 text-white"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          Summon
        </button>
      </div>
    </div>
  );
}
