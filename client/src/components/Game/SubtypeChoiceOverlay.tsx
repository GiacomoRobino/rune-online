interface SubtypeChoiceOverlayProps {
  cardName: string;
  options: string[];
  onSelect: (subtype: string) => void;
}

export function SubtypeChoiceOverlay({ cardName, options, onSelect }: SubtypeChoiceOverlayProps) {
  return (
    <div className="fixed inset-0 z-20 bg-black/70 flex items-center justify-center">
      <div
        className="stone-panel ornate-border rounded-xl p-6 max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-parchment font-medieval text-lg text-center mb-4">
          Choose a subtype for {cardName}
        </h2>
        <div className="flex justify-center gap-4">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className="px-6 py-3 btn-stone rounded-lg text-sm font-medieval hover:scale-105 transition-transform"
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
