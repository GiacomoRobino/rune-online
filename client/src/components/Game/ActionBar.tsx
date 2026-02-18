import { InteractionMode } from "../../hooks/useGameInteractions";

interface ActionBarProps {
  mode: InteractionMode;
  isMyTurn: boolean;
  turnPhase: string;
  isBlockingPhase: boolean;
  enterAttackMode: () => void;
  confirmAttackers: () => void;
  confirmBlockers: () => void;
  cancelMode: () => void;
  onEndTurn: () => void;
  mulligansRemaining: number;
  onMulligan: () => void;
}

export function ActionBar({
  mode,
  isMyTurn,
  turnPhase,
  isBlockingPhase,
  enterAttackMode,
  confirmAttackers,
  confirmBlockers,
  cancelMode,
  onEndTurn,
  mulligansRemaining,
  onMulligan,
}: ActionBarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Attack mode button */}
      {isMyTurn && turnPhase === "main" && mode.type === "idle" && (
        <button onClick={enterAttackMode} className="px-4 py-2 btn-blood rounded-lg text-sm">
          Attack
        </button>
      )}

      {/* Confirm attackers */}
      {mode.type === "declare_attack" && (
        <div className="flex gap-2">
          <button onClick={cancelMode} className="px-3 py-2 btn-stone rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={confirmAttackers}
            disabled={mode.selectedAttackerIds.length === 0}
            className={`px-4 py-2 rounded-lg text-sm ${
              mode.selectedAttackerIds.length > 0 ? "btn-blood" : "btn-stone opacity-50"
            }`}
          >
            Confirm Attackers ({mode.selectedAttackerIds.length})
          </button>
        </div>
      )}

      {/* Blocking controls */}
      {isBlockingPhase && mode.type === "declare_block" && (
        <button onClick={confirmBlockers} className="px-4 py-2 btn-stone rounded-lg text-sm">
          Confirm Blockers ({mode.assignments.size})
        </button>
      )}

      {/* Mulligan */}
      {isMyTurn && turnPhase === "main" && mode.type === "idle" && mulligansRemaining > 0 && (
        <button onClick={onMulligan} className="px-4 py-2 btn-stone rounded-lg text-sm">
          Mulligan ({mulligansRemaining})
        </button>
      )}

      {/* End turn */}
      {isMyTurn && turnPhase === "main" && mode.type === "idle" && (
        <button onClick={onEndTurn} className="px-4 py-2 btn-stone rounded-lg text-sm">
          End Turn
        </button>
      )}
    </div>
  );
}
