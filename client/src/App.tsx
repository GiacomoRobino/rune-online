import { useColyseus } from "./hooks/useColyseus";
import { Lobby } from "./components/Lobby/Lobby";
import { GameBoard } from "./components/Game/GameBoard";


function App() {
  const {
    connectionState,
    error,
    joinGame,
    leaveGame,
    decks,
    mySessionId,
    gameState,
    myPlayer,
    opponent,
    isMyTurn,
    writeRune,
    summonCreature,
    playEcho,
    playMemory,
    declareAttackers,
    declareBlockers,
    endTurn,
    resolveDeathTarget,
    resolveDeckSearch,
    resolveWriteRune,
    resolveEndTurnCancel,
    gameEvents,
    mulligan,
  } = useColyseus();

  // Show lobby if not connected or no game state
  if (connectionState === "disconnected" || !gameState) {
    return (
      <Lobby
        onJoin={joinGame}
        connectionState={connectionState}
        error={error}
        decks={decks}
      />
    );
  }

  // Show game board
  if (myPlayer && opponent) {
    return (
      <GameBoard
        myPlayer={myPlayer}
        opponent={opponent}
        isMyTurn={isMyTurn}
        phase={gameState.phase}
        turnPhase={gameState.turnPhase}
        turnNumber={gameState.turnNumber}
        winner={gameState.winner}
        mySessionId={mySessionId}
        declaredAttackers={gameState.declaredAttackers}
        onWriteRune={writeRune}
        onSummon={summonCreature}
        onPlayEcho={playEcho}
        onPlayMemory={playMemory}
        onDeclareAttackers={declareAttackers}
        onDeclareBlockers={declareBlockers}
        onEndTurn={endTurn}
        onLeave={leaveGame}
        gameEvents={gameEvents}
        pendingDeathEffects={gameState.pendingDeathEffects}
        onResolveDeathTarget={resolveDeathTarget}
        onResolveDeckSearch={resolveDeckSearch}
        onResolveWriteRune={resolveWriteRune}
        onResolveEndTurnCancel={resolveEndTurnCancel}
        endTurnTargetCardId={gameState.endTurnTargetCardId}
        onMulligan={mulligan}
      />
    );
  }

  // Waiting state (connected but game not started)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="stone-panel ornate-border rounded-xl p-8 text-center">
        <div className="animate-pulse">
          <h2 className="text-2xl text-gold font-medieval mb-4">Waiting for opponent...</h2>
          <p className="text-parchment-muted font-body mb-4">
            Open another browser tab to test the app
          </p>
          <button
            onClick={leaveGame}
            className="text-stone-400 hover:text-gold underline font-medieval text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
