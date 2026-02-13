import { useRef, useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

interface AnimatedStatProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AnimatedStat({ value, className = "", style }: AnimatedStatProps) {
  const prevRef = useRef(value);
  const controls = useAnimation();
  const [flashColor, setFlashColor] = useState<string | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== value) {
      const color = value > prev ? "#4ade80" : "#ef4444";
      setFlashColor(color);
      controls.start({
        scale: [1, 1.5, 1],
        transition: { duration: 0.4, times: [0, 0.2, 1] },
      });
      const timer = setTimeout(() => setFlashColor(null), 400);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value, controls]);

  return (
    <motion.span
      animate={controls}
      className={className}
      style={{
        ...style,
        ...(flashColor ? { color: flashColor, textShadow: `0 0 6px ${flashColor}` } : {}),
        display: "inline-block",
      }}
    >
      {value}
    </motion.span>
  );
}
