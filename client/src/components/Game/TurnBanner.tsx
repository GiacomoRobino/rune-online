import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TurnBannerProps {
  isMyTurn: boolean;
  turnNumber: number;
  phaseLabel: string;
}

const bannerClip = { clipPath: 'polygon(5% 0%, 95% 0%, 100% 50%, 95% 100%, 5% 100%, 0% 50%)' };

export function TurnBanner({ isMyTurn, turnNumber, phaseLabel }: TurnBannerProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayTurn, setOverlayTurn] = useState<{ isMyTurn: boolean; turnNumber: number } | null>(null);

  useEffect(() => {
    // Don't show overlay on first render (turn 1)
    if (turnNumber <= 1) return;

    setOverlayTurn({ isMyTurn, turnNumber });
    setShowOverlay(true);
    const timer = setTimeout(() => setShowOverlay(false), 1800);
    return () => clearTimeout(timer);
  }, [turnNumber, isMyTurn]);

  return (
    <>
      {/* Top banner */}
      <motion.div
        className="fixed top-3 left-1/2 -translate-x-1/2 z-10 flex gap-2"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <motion.div
          key={`turn-${isMyTurn}-${turnNumber}`}
          className={`px-6 py-1.5 font-semibold text-sm font-medieval ${
            isMyTurn ? "btn-stone text-gold shadow-gold-glow" : "stone-panel text-stone-400"
          }`}
          style={bannerClip}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {isMyTurn ? "Your Turn" : "Opponent's Turn"} - Turn {turnNumber}
        </motion.div>
        <motion.div
          key={phaseLabel}
          className="px-5 py-1.5 stone-panel text-parchment-muted text-sm font-medieval"
          style={bannerClip}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {phaseLabel}
        </motion.div>
      </motion.div>

      {/* Full-screen turn change overlay */}
      <AnimatePresence>
        {showOverlay && overlayTurn && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute inset-0 bg-black/40" />
            <motion.div
              className="relative text-center"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              <div
                className={`text-5xl font-medieval-decorative font-bold ${
                  overlayTurn.isMyTurn ? "text-gold" : "text-stone-400"
                }`}
                style={{
                  textShadow: overlayTurn.isMyTurn
                    ? "0 0 30px rgba(201,168,76,0.6), 0 0 60px rgba(201,168,76,0.3)"
                    : "0 0 30px rgba(120,113,108,0.4)",
                }}
              >
                {overlayTurn.isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}
              </div>
              <div className="text-parchment-muted text-lg font-medieval mt-2">
                Turn {overlayTurn.turnNumber}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
