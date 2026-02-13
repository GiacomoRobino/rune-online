import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameEvent } from "../../types/animations";

interface RuneOrb {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

let nextOrbId = 0;

function getElementCenter(instanceId: string): { x: number; y: number } | null {
  const el = document.querySelector(`[data-card-instance-id="${instanceId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

interface RuneAttachEffectProps {
  gameEvents: GameEvent[];
}

export function RuneAttachEffect({ gameEvents }: RuneAttachEffectProps) {
  const [orbs, setOrbs] = useState<RuneOrb[]>([]);

  const removeOrb = useCallback((id: number) => {
    setOrbs((prev) => prev.filter((o) => o.id !== id));
  }, []);

  useEffect(() => {
    const newOrbs: RuneOrb[] = [];

    for (const event of gameEvents) {
      if (event.type === "RUNE_ATTACHED") {
        const start = getElementCenter(event.runeInstanceId);
        const end = getElementCenter(event.targetInstanceId);
        if (start && end) {
          newOrbs.push({
            id: nextOrbId++,
            startX: start.x,
            startY: start.y,
            endX: end.x,
            endY: end.y,
          });
        }
      }
    }

    if (newOrbs.length > 0) {
      setOrbs((prev) => [...prev, ...newOrbs]);
    }
  }, [gameEvents]);

  return (
    <AnimatePresence>
      {orbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="fixed pointer-events-none z-[200]"
          style={{ left: orb.startX - 8, top: orb.startY - 8 }}
          initial={{
            opacity: 1,
            scale: 0.5,
            x: 0,
            y: 0,
          }}
          animate={{
            opacity: [1, 1, 0],
            scale: [0.5, 1.2, 0.3],
            x: orb.endX - orb.startX,
            y: orb.endY - orb.startY,
          }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          onAnimationComplete={() => removeOrb(orb.id)}
        >
          <div
            className="w-4 h-4 rounded-full"
            style={{
              background: "radial-gradient(circle, #ffd700 0%, #c9a84c 60%, transparent 100%)",
              boxShadow: "0 0 12px 4px rgba(201,168,76,0.6), 0 0 24px 8px rgba(201,168,76,0.3)",
            }}
          />
        </motion.div>
      ))}
    </AnimatePresence>
  );
}
