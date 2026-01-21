import { useState } from "react";

interface LobbyProps {
  onJoin: (nickname: string) => void;
  connectionState: "disconnected" | "connecting" | "connected";
  error: string;
}

export function Lobby({ onJoin, connectionState, error }: LobbyProps) {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onJoin(nickname.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-gray-800/80 backdrop-blur rounded-xl p-8 w-full max-w-md shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-white mb-2">
          Rune Online
        </h1>
        <p className="text-gray-400 text-center mb-8">
          A multiplayer card game
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-2">
              Enter your nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Player name..."
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={connectionState === "connecting"}
              maxLength={20}
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center">{error}</div>
          )}

          <button
            type="submit"
            disabled={!nickname.trim() || connectionState === "connecting"}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {connectionState === "connecting" ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Finding opponent...
              </span>
            ) : (
              "Find Game"
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Open this page in another tab to test multiplayer</p>
        </div>
      </div>
    </div>
  );
}
