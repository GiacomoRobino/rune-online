import { useColyseus } from "./hooks/useColyseus";
import { Lobby } from "./components/Lobby/Lobby";
import { GameBoard } from "./components/Game/GameBoard";

function App() {
  const {
    connectionState,
    error,
    joinGame,
    leaveGame,
    mySessionId,
    gameState,
    myPlayer,
    opponent,
    isMyTurn,
    playCard,
    attack,
    endTurn,
  } = useColyseus();

  // Show lobby if not connected or no game state
  if (connectionState === "disconnected" || !gameState) {
    return (
      <Lobby
        onJoin={joinGame}
        connectionState={connectionState}
        error={error}
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
        turnNumber={gameState.turnNumber}
        winner={gameState.winner}
        mySessionId={mySessionId}
        onPlayCard={playCard}
        onAttack={attack}
        onEndTurn={endTurn}
        onLeave={leaveGame}
      />
    );
  }

  // Waiting state (connected but game not started)
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-800/90 backdrop-blur rounded-xl p-8 text-center">
        <div className="animate-pulse">
          <h2 className="text-2xl text-white mb-4">Waiting for opponent...</h2>
          <p className="text-gray-400 mb-4">
            Open another browser tab to test
          </p>
          <button
            onClick={leaveGame}
            className="text-gray-400 hover:text-white underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
