import { CardState } from "../../hooks/useColyseus";

interface SpellNameCheckerProps {
  spellName: string;
  bloodCost: number;
  canOverpay?: boolean;
  selectedRunes: CardState[];
  onConfirm: () => void;
  onCancel: () => void;
}

export function SpellNameChecker({
  spellName,
  bloodCost,
  canOverpay,
  selectedRunes,
  onConfirm,
  onCancel,
}: SpellNameCheckerProps) {
  const provided = selectedRunes.map((r) => r.letter);

  if (bloodCost > 0) {
    // Blood cost mode: generic rune slots
    const isComplete = selectedRunes.length === bloodCost;
    const validLetters = [...new Set(spellName.split(""))].join(", ");

    return (
      <div className="stone-panel metal-border rounded-lg p-3 flex items-center gap-3">
        <div className="text-gold-dim text-sm font-medieval">Blood Cost:</div>
        <div className="flex gap-1">
          {Array.from({ length: bloodCost }).map((_, i) => {
            const rune = selectedRunes[i];
            const isFilled = !!rune;

            return (
              <div
                key={i}
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg font-medieval
                  ${isFilled ? "text-red-400 border-red-700 shadow-metal" : "text-stone-500 border-stone-600 shadow-stone-inset"}
                  border
                `}
                style={isFilled ? { background: 'linear-gradient(135deg, #3a1010, #2a0808)' } : { background: '#14100a' }}
              >
                {rune ? rune.letter : "?"}
              </div>
            );
          })}
        </div>
        <div className="text-stone-500 text-xs font-body">({validLetters})</div>
        <div className="flex gap-2 ml-auto">
          <button onClick={onCancel} className="px-3 py-1 btn-stone rounded text-sm">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={!isComplete}
            className={`px-3 py-1 rounded text-sm font-semibold ${isComplete ? "btn-stone shadow-gold-glow" : "btn-stone opacity-50"}`}
          >
            Cast
          </button>
        </div>
      </div>
    );
  }

  // Standard spell name mode
  const needed = spellName.split("");

  // Check which letters are fulfilled
  const remaining = [...needed];
  for (const letter of provided) {
    const idx = remaining.indexOf(letter);
    if (idx !== -1) remaining.splice(idx, 1);
  }

  const isComplete = canOverpay
    ? remaining.length === 0
    : remaining.length === 0 && provided.length === needed.length;

  return (
    <div className="stone-panel metal-border rounded-lg p-3 flex items-center gap-3">
      <div className="text-gold-dim text-sm font-medieval">Spell:</div>
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
                w-8 h-8 rounded flex items-center justify-center font-bold text-lg font-medieval
                ${isFilled ? "text-gold border-gold-dark shadow-metal" : "text-stone-500 border-stone-600 shadow-stone-inset"}
                border
              `}
              style={isFilled ? { background: 'linear-gradient(135deg, #2a2018, #1e170f)' } : { background: '#14100a' }}
            >
              {letter}
            </div>
          );
        })}
      </div>
      {canOverpay && provided.length > needed.length && (
        <div className="text-gold text-sm font-medieval">
          +{provided.length - needed.length} {provided.length - needed.length === 1 ? "copy" : "copies"}
        </div>
      )}
      <div className="flex gap-2 ml-auto">
        <button
          onClick={onCancel}
          className="px-3 py-1 btn-stone rounded text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!isComplete}
          className={`px-3 py-1 rounded text-sm font-semibold ${
            isComplete
              ? "btn-stone shadow-gold-glow"
              : "btn-stone opacity-50"
          }`}
        >
          Summon
        </button>
      </div>
    </div>
  );
}
