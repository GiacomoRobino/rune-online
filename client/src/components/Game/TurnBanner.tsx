interface TurnBannerProps {
  isMyTurn: boolean;
  turnNumber: number;
  phaseLabel: string;
}

const bannerClip = { clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)' };

export function TurnBanner({ isMyTurn, turnNumber, phaseLabel }: TurnBannerProps) {
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-10 flex gap-2">
      <div
        className={`px-6 py-1.5 font-semibold text-sm font-medieval ${
          isMyTurn ? "btn-stone text-gold shadow-gold-glow" : "stone-panel text-stone-400"
        }`}
        style={bannerClip}
      >
        {isMyTurn ? "Your Turn" : "Opponent's Turn"} - Turn {turnNumber}
      </div>
      <div
        className="px-5 py-1.5 stone-panel text-parchment-muted text-sm font-medieval"
        style={bannerClip}
      >
        {phaseLabel}
      </div>
    </div>
  );
}
