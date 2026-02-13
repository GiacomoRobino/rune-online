import { motion } from "framer-motion";

interface DamageNumberProps {
  value: number;
  x: number;
  y: number;
  onComplete: () => void;
}

export function DamageNumber({ value, x, y, onComplete }: DamageNumberProps) {
  const isHeal = value > 0;

  return (
    <motion.div
      className="fixed pointer-events-none z-[200] font-medieval font-bold"
      style={{
        left: x,
        top: y,
        fontSize: "28px",
        color: isHeal ? "#4ade80" : "#ef4444",
        textShadow: `0 0 8px ${isHeal ? "rgba(74,222,128,0.6)" : "rgba(239,68,68,0.6)"}, 0 2px 4px rgba(0,0,0,0.8)`,
      }}
      initial={{ opacity: 1, y: 0, scale: 1.2 }}
      animate={{ opacity: 0, y: -50, scale: 0.8 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      onAnimationComplete={onComplete}
    >
      {isHeal ? `+${value}` : value}
    </motion.div>
  );
}
