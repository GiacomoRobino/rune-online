import { PlayerState, CardState } from "../../hooks/useColyseus";

interface RunePickerProps {
  myPlayer: PlayerState;
  onWriteRune: (runeId: string) => void;
}

export function RunePicker({ myPlayer, onWriteRune }: RunePickerProps) {
  if (myPlayer.runesWrittenThisTurn >= myPlayer.maxRuneWritesThisTurn || myPlayer.runesDeck.length === 0) {
    return null;
  }

  const grouped = new Map<string, CardState[]>();
  for (const rune of myPlayer.runesDeck) {
    const key = `${rune.letter}-${rune.runeType}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(rune);
  }

  return (
    <div className="stone-panel metal-border rounded-lg p-3">
      <div className="text-gold text-sm mb-2 font-medieval">
        Choose a rune to write ({myPlayer.maxRuneWritesThisTurn - myPlayer.runesWrittenThisTurn} remaining)
      </div>
      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
        {Array.from(grouped.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, runes]) => {
            const rune = runes[0];
            return (
              <button
                key={key}
                onClick={() => onWriteRune(rune.instanceId)}
                className="w-10 h-14 rounded flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-110"
                style={{
                  background: rune.runeType === "blood" ? 'linear-gradient(135deg, #5c0000, #3a0000)' :
                    rune.runeType === "stone" ? 'linear-gradient(135deg, #4a3c30, #2a2018)' :
                    'linear-gradient(135deg, #1e170f, #14100a)',
                  border: `2px solid ${rune.runeType === "blood" ? '#8b0000' : rune.runeType === "stone" ? '#6b5c4e' : '#4a3c30'}`,
                }}
              >
                <span className="text-gold font-bold text-lg font-medieval">{rune.letter}</span>
                <span className="text-stone-400 text-[8px] font-body">x{runes.length}</span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
