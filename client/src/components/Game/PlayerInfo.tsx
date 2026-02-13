import { PlayerState } from "../../hooks/useColyseus";

interface PlayerInfoProps {
  player: PlayerState;
  isOpponent: boolean;
  isTargeting: boolean;
  onHeroClick: () => void;
  onGraveyardClick: () => void;
}

export function PlayerInfo({ player, isOpponent, isTargeting, onHeroClick, onGraveyardClick }: PlayerInfoProps) {
  const heroStyle = isOpponent
    ? {
        background: 'linear-gradient(135deg, #8b0000, #5c0000)',
        border: '3px solid #b22222',
        boxShadow: '0 0 8px rgba(139,0,0,0.4)',
      }
    : {
        background: 'linear-gradient(135deg, #2d5a27, #1a3a15)',
        border: '3px solid #3d7a35',
        boxShadow: '0 0 6px rgba(61,122,53,0.3)',
      };

  return (
    <div className="flex items-center gap-3">
      <div
        onClick={onHeroClick}
        className={`w-14 h-14 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
          isTargeting ? "ring-target" : ""
        }`}
        style={heroStyle}
      >
        <span className="text-parchment-light font-bold font-medieval">{player.health}</span>
      </div>
      <div>
        <p className="text-parchment font-medieval text-sm">{player.nickname}</p>
        <p className="text-stone-400 text-xs font-body">
          Chaos: {player.chaosDeck.length} | Runes: {player.runesDeck.length}
        </p>
      </div>
      <button
        onClick={onGraveyardClick}
        className="flex items-center gap-1 px-2 py-1 rounded btn-stone text-xs"
      >
        <span>&#x1F480;</span> {player.graveyard.length}
      </button>
    </div>
  );
}
