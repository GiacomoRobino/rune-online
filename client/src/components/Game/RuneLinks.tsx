import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RuneLinksProps {
  selectedRuneIds: string[];
  targetCardId: string;
}

interface Line {
  from: { x: number; y: number };
  to: { x: number; y: number };
  length: number;
  path: string;
  controlX: number;
  controlY: number;
}

export function RuneLinks({ selectedRuneIds, targetCardId }: RuneLinksProps) {
  const [lines, setLines] = useState<Line[]>([]);

  const computeLines = useCallback(() => {
    const targetEl = document.querySelector(`[data-card-instance-id="${targetCardId}"]`);
    if (!targetEl) { setLines([]); return; }

    const targetRect = targetEl.getBoundingClientRect();
    const to = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    };

    const newLines: Line[] = [];
    for (const runeId of selectedRuneIds) {
      const runeEl = document.querySelector(`[data-card-instance-id="${runeId}"]`);
      if (!runeEl) continue;
      const runeRect = runeEl.getBoundingClientRect();
      const from = {
        x: runeRect.left + runeRect.width / 2,
        y: runeRect.top + runeRect.height / 2,
      };

      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = Math.min(len * 0.15, 40);
      const cx = mx + (-dy / len) * offset;
      const cy = my + (dx / len) * offset;
      const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;

      // Approximate quadratic bezier length
      const approxLen = len + (offset * offset) / len;

      newLines.push({ from, to, length: approxLen, path, controlX: cx, controlY: cy });
    }
    setLines(newLines);
  }, [selectedRuneIds, targetCardId]);

  useEffect(() => {
    computeLines();
    window.addEventListener("resize", computeLines);
    window.addEventListener("scroll", computeLines, true);
    return () => {
      window.removeEventListener("resize", computeLines);
      window.removeEventListener("scroll", computeLines, true);
    };
  }, [computeLines]);

  return (
    <AnimatePresence>
      {lines.length > 0 && (
        <motion.svg
          className="fixed inset-0 w-screen h-screen pointer-events-none"
          style={{ zIndex: 15 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <defs>
            <filter id="rune-link-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="particle-grad">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
            </radialGradient>
          </defs>

          {lines.map((line, i) => (
            <g key={i}>
              {/* Outer glow — draws in */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="rgba(201,168,76,0.25)"
                strokeWidth={6}
                filter="url(#rune-link-glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              />
              {/* Main line — draws in */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="#c9a84c"
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              />
              {/* Inner core — draws in */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="#e0c878"
                strokeWidth={1}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              />

              {/* Energy pulse traveling along the path */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="#ffd700"
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${line.length * 0.12} ${line.length * 0.88}`}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -line.length }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "linear",
                  delay: 0.4 + i * 0.08,
                }}
                filter="url(#rune-link-glow)"
                opacity={0.8}
              />

              {/* Particle at rune end */}
              <motion.circle
                cx={line.from.x}
                cy={line.from.y}
                r={4}
                fill="url(#particle-grad)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: [0.8, 1.2, 0.8],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.08,
                }}
              />
            </g>
          ))}

          {/* Particle at target card (shared) */}
          {lines.length > 0 && (
            <motion.circle
              cx={lines[0].to.x}
              cy={lines[0].to.y}
              r={6}
              fill="url(#particle-grad)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0.8, 1.4, 0.8],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
              }}
            />
          )}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
