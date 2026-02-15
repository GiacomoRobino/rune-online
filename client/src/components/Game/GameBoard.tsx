import { PlayerState, PendingEffectState } from "../../hooks/useColyseus";
import { useGameInteractions } from "../../hooks/useGameInteractions";
import { GameEvent } from "../../types/animations";
import { LayoutCompact } from "./layouts/LayoutCompact";

interface GameBoardProps {
  myPlayer: PlayerState;
  opponent: PlayerState;
  isMyTurn: boolean;
  phase: string;
  turnPhase: string;
  turnNumber: number;
  winner: string;
  mySessionId: string;
  declaredAttackers: string[];
  onWriteRune: (runeId: string) => void;
  onSummon: (cardId: string, runeIds: string[], chosenSubtype?: string) => void;
  onPlayEcho: (cardId: string, runeIds: string[]) => void;
  onPlayMemory: (cardId: string, runeIds: string[], targetId?: string) => void;
  onDeclareAttackers: (attackerIds: string[]) => void;
  onDeclareBlockers: (assignments: string[]) => void;
  onEndTurn: () => void;
  onLeave: () => void;
  gameEvents: GameEvent[];
  pendingDeathEffects: PendingEffectState[];
  onResolveDeathTarget: (targetId: string) => void;
  onResolveDeckSearch: (cardId: string | null) => void;
}

export function GameBoard({
  myPlayer,
  opponent,
  isMyTurn,
  phase,
  turnPhase,
  turnNumber,
  winner,
  mySessionId,
  declaredAttackers,
  onWriteRune,
  onSummon,
  onPlayEcho,
  onPlayMemory,
  onDeclareAttackers,
  onDeclareBlockers,
  onEndTurn,
  onLeave,
  gameEvents,
  pendingDeathEffects,
  onResolveDeathTarget,
  onResolveDeckSearch,
}: GameBoardProps) {
  const interactions = useGameInteractions({
    myPlayer,
    isMyTurn,
    turnPhase,
    declaredAttackers,
    onSummon,
    onPlayEcho,
    onPlayMemory,
    onDeclareAttackers,
    onDeclareBlockers,
    pendingDeathEffects,
    mySessionId,
    onResolveDeathTarget,
    onResolveDeckSearch,
  });

  // Game ended
  if (phase === "ended") {
    const didWin = winner === mySessionId;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="stone-panel ornate-border rounded-xl p-8 text-center">
          <h1 className={`text-5xl font-bold mb-4 font-medieval-decorative ${didWin ? "text-gold-glow" : "text-blood-light"}`}
            style={didWin ? { textShadow: '0 0 20px rgba(201,168,76,0.6)' } : { textShadow: '0 0 20px rgba(139,0,0,0.6)' }}
          >
            {didWin ? "Victory!" : "Defeat"}
          </h1>
          <p className="text-parchment-muted mb-6 font-body text-lg">
            {didWin ? "Congratulations, you won!" : "Better luck next time!"}
          </p>
          <button onClick={onLeave} className="px-6 py-3 btn-stone rounded-lg text-sm">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // Waiting for opponent
  if (phase === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="stone-panel ornate-border rounded-xl p-8 text-center">
          <div className="animate-pulse">
            <h2 className="text-2xl text-gold font-medieval mb-4">Waiting for opponent...</h2>
            <p className="text-parchment-muted font-body">Share this page to play with a friend</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <LayoutCompact
      myPlayer={myPlayer}
      opponent={opponent}
      isMyTurn={isMyTurn}
      turnPhase={turnPhase}
      turnNumber={turnNumber}
      declaredAttackers={declaredAttackers}
      interactions={interactions}
      onWriteRune={onWriteRune}
      onEndTurn={onEndTurn}
      gameEvents={gameEvents}
    />
  );
}
