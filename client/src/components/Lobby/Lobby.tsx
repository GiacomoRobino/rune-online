import { useState } from "react";

interface LobbyProps {
  onJoin: (nickname: string, deckName: string) => void;
  connectionState: "disconnected" | "connecting" | "connected";
  error: string;
  decks: string[];
}

export function Lobby({ onJoin, connectionState, error, decks }: LobbyProps) {
  const [nickname, setNickname] = useState("");
  const [selectedDeck, setSelectedDeck] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const deckName = selectedDeck || decks[0] || "";
    if (nickname.trim() && deckName) {
      onJoin(nickname.trim(), deckName);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="stone-panel ornate-border rounded-xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center text-gold-glow font-medieval-decorative mb-2">
          Rune Online
        </h1>
        <p className="text-parchment-muted text-center mb-8 font-body italic">
          A multiplayer card game
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-parchment-muted mb-2 font-medieval">
              Enter your nickname
            </label>
            <input
              type="text"
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Player name..."
              className="w-full px-4 py-3 bg-stone-850 border border-stone-600 rounded-lg text-parchment-light placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-gold-dark focus:border-gold-dark font-body"
              disabled={connectionState === "connecting"}
              maxLength={20}
            />
          </div>

          {decks.length > 0 && (
            <div>
              <label htmlFor="deck" className="block text-sm font-medium text-parchment-muted mb-2 font-medieval">
                Select your deck
              </label>
              <select
                id="deck"
                value={selectedDeck || decks[0]}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="w-full px-4 py-3 bg-stone-850 border border-stone-600 rounded-lg text-parchment-light focus:outline-none focus:ring-2 focus:ring-gold-dark focus:border-gold-dark font-body"
                disabled={connectionState === "connecting"}
              >
                {decks.map((deck) => (
                  <option key={deck} value={deck}>{deck}</option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="text-blood-light text-sm text-center font-body">{error}</div>
          )}

          <button
            type="submit"
            disabled={!nickname.trim() || connectionState === "connecting"}
            className="w-full py-3 px-4 btn-stone rounded-lg text-sm"
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

        <div className="mt-8 text-center text-stone-500 text-sm font-body">
          <p>Open this page in another tab to test multiplayer</p>
        </div>
      </div>
    </div>
  );
}
