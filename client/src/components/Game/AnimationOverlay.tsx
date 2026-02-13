import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { GameEvent } from "../../types/animations";
import { DamageNumber } from "./DamageNumber";

interface DamageEntry {
  id: number;
  value: number;
  x: number;
  y: number;
}

let nextId = 0;

function getCardCenter(instanceId: string): { x: number; y: number } | null {
  const el = document.querySelector(`[data-card-instance-id="${instanceId}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function getHeroCenter(isOpponent: boolean): { x: number; y: number } | null {
  // Hero portraits are the round divs with health in the left panel
  // We identify them by their approximate position
  const heroes = document.querySelectorAll(".w-16.h-16.rounded-full");
  const hero = isOpponent ? heroes[0] : heroes[1];
  if (!hero) return null;
  const rect = hero.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

interface AnimationOverlayProps {
  gameEvents: GameEvent[];
}

export function AnimationOverlay({ gameEvents }: AnimationOverlayProps) {
  const [damages, setDamages] = useState<DamageEntry[]>([]);

  const removeDamage = useCallback((id: number) => {
    setDamages((prev) => prev.filter((d) => d.id !== id));
  }, []);

  useEffect(() => {
    const newDamages: DamageEntry[] = [];

    for (const event of gameEvents) {
      if (event.type === "STAT_CHANGED" && event.stat === "health") {
        const pos = getCardCenter(event.instanceId);
        if (pos) {
          const diff = event.newValue - event.oldValue;
          newDamages.push({ id: nextId++, value: diff, x: pos.x, y: pos.y });
        }
      }
      if (event.type === "PLAYER_HEALTH_CHANGED") {
        // Determine if this is the opponent based on DOM position
        // We'll check both heroes and match by trying each
        const diff = event.newValue - event.oldValue;
        // Try opponent first, then player
        for (const isOpp of [true, false]) {
          const pos = getHeroCenter(isOpp);
          if (pos) {
            newDamages.push({ id: nextId++, value: diff, x: pos.x, y: pos.y });
            break;
          }
        }
      }
    }

    if (newDamages.length > 0) {
      setDamages((prev) => [...prev, ...newDamages]);
    }
  }, [gameEvents]);

  return (
    <AnimatePresence>
      {damages.map((d) => (
        <DamageNumber
          key={d.id}
          value={d.value}
          x={d.x}
          y={d.y}
          onComplete={() => removeDamage(d.id)}
        />
      ))}
    </AnimatePresence>
  );
}
