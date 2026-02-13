import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BlockerLinksProps {
  /** Map of blockerId -> attackerId */
  assignments: Map<string, string>;
}

interface Line {
  from: { x: number; y: number };
  to: { x: number; y: number };
  length: number;
  path: string;
}

export function BlockerLinks({ assignments }: BlockerLinksProps) {
  const [lines, setLines] = useState<Line[]>([]);

  const computeLines = useCallback(() => {
    const newLines: Line[] = [];

    for (const [blockerId, attackerId] of assignments) {
      const blockerEl = document.querySelector(`[data-card-instance-id="${blockerId}"]`);
      const attackerEl = document.querySelector(`[data-card-instance-id="${attackerId}"]`);
      if (!blockerEl || !attackerEl) continue;

      const bRect = blockerEl.getBoundingClientRect();
      const aRect = attackerEl.getBoundingClientRect();

      const from = { x: bRect.left + bRect.width / 2, y: bRect.top + bRect.height / 2 };
      const to = { x: aRect.left + aRect.width / 2, y: aRect.top + aRect.height / 2 };

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = Math.min(len * 0.12, 30);
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;
      const cx = mx + (-dy / len) * offset;
      const cy = my + (dx / len) * offset;
      const path = `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
      const approxLen = len + (offset * offset) / len;

      newLines.push({ from, to, length: approxLen, path });
    }

    setLines(newLines);
  }, [assignments]);

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
            <filter id="blocker-link-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="blocker-particle-grad">
              <stop offset="0%" stopColor="#ff4444" />
              <stop offset="100%" stopColor="#cc0000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {lines.map((line, i) => (
            <g key={i}>
              {/* Outer glow */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="rgba(255,50,50,0.25)"
                strokeWidth={6}
                filter="url(#blocker-link-glow)"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              />
              {/* Main line */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="#cc2222"
                strokeWidth={2}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              />
              {/* Inner core */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="#ff6666"
                strokeWidth={1}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" }}
              />

              {/* Energy pulse */}
              <motion.path
                d={line.path}
                fill="none"
                stroke="#ff4444"
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
                filter="url(#blocker-link-glow)"
                opacity={0.8}
              />

              {/* Particle at blocker end */}
              <motion.circle
                cx={line.from.x}
                cy={line.from.y}
                r={4}
                fill="url(#blocker-particle-grad)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.08 }}
              />

              {/* Particle at attacker end */}
              <motion.circle
                cx={line.to.x}
                cy={line.to.y}
                r={5}
                fill="url(#blocker-particle-grad)"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 }}
              />
            </g>
          ))}
        </motion.svg>
      )}
    </AnimatePresence>
  );
}
