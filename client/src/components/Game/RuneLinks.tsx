import { useState, useEffect, useCallback } from "react";

interface RuneLinksProps {
  selectedRuneIds: string[];
  targetCardId: string;
}

interface Line {
  from: { x: number; y: number };
  to: { x: number; y: number };
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
      newLines.push({
        from: {
          x: runeRect.left + runeRect.width / 2,
          y: runeRect.top + runeRect.height / 2,
        },
        to,
      });
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

  if (lines.length === 0) return null;

  return (
    <svg
      className="fixed inset-0 w-screen h-screen pointer-events-none"
      style={{ zIndex: 15 }}
    >
      <defs>
        <filter id="rune-link-glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {lines.map((line, i) => {
        const mx = (line.from.x + line.to.x) / 2;
        const my = (line.from.y + line.to.y) / 2;
        // Perpendicular offset for a gentle arc
        const dx = line.to.x - line.from.x;
        const dy = line.to.y - line.from.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const offset = Math.min(len * 0.15, 40);
        const cx = mx + (-dy / len) * offset;
        const cy = my + (dx / len) * offset;
        const d = `M ${line.from.x} ${line.from.y} Q ${cx} ${cy} ${line.to.x} ${line.to.y}`;

        return (
          <g key={i}>
            {/* Outer glow */}
            <path
              d={d}
              fill="none"
              stroke="rgba(201,168,76,0.25)"
              strokeWidth={6}
              filter="url(#rune-link-glow)"
            />
            {/* Main line */}
            <path d={d} fill="none" stroke="#c9a84c" strokeWidth={2} />
            {/* Inner core */}
            <path d={d} fill="none" stroke="#e0c878" strokeWidth={1} />
          </g>
        );
      })}
    </svg>
  );
}
