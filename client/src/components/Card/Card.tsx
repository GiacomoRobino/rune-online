import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { CardState } from "../../hooks/useColyseus";
import { AnimatedStat } from "./AnimatedStat";

export type CardSize = "sm" | "md" | "lg";

// Size configs for main cards (summoning, echo, memory)
const CARD_SIZES = {
  sm: { w: "w-20", h: "h-28", text: "text-[9px]", name: "text-[10px]", aegis: "w-3.5 h-3.5 text-[7px]" },
  md: { w: "w-[100px]", h: "h-[140px]", text: "text-[10px]", name: "text-xs", aegis: "w-4 h-4 text-[8px]" },
  lg: { w: "w-[130px]", h: "h-[182px]", text: "text-[11px]", name: "text-sm", aegis: "w-5 h-5 text-[9px]" },
};

// Size configs for rune cards
const RUNE_SIZES = {
  sm: { w: "w-16", h: "h-[88px]" },
  md: { w: "w-20", h: "h-28" },
  lg: { w: "w-[100px]", h: "h-[140px]" },
};

// Size configs for card backs
const BACK_SIZES = {
  sm: { w: "w-20", h: "h-28", text: "text-xl" },
  md: { w: "w-[100px]", h: "h-[140px]", text: "text-2xl" },
  lg: { w: "w-[130px]", h: "h-[182px]", text: "text-3xl" },
};

interface CardProps {
  card: CardState;
  onClick?: () => void;
  isSelected?: boolean;
  isPlayable?: boolean;
  isAttacker?: boolean;
  isTarget?: boolean;
  isBlockCandidate?: boolean;
  isInHand?: boolean;
  isHighlighted?: boolean;
  showBack?: boolean;
  size?: CardSize;
}

// Ability keyword descriptions
const ABILITY_DESCRIPTIONS: Record<string, string> = {
  skyrunner: "Can only be blocked by other Skyrunners",
  fury: "Deals excess combat damage to the opponent",
  rage: "Can attack the turn it's summoned",
  aegis: "Blocks the first damage or destroy effect",
  defender: "Cannot attack, but can block",
  duelist: "Deals damage before the opponent in combat",
  shadowwalker: "Can't be blocked",
  revenge: "Triggers an effect when destroyed",
  shatter: "Destroys a rune when dealing combat damage",
  pack: "Gets +1/+1 for each other friendly creature",
  master: "Buffs all other friendly creatures",
  veil: "Can't be targeted by spells",
  blink: "Returns to hand at end of turn",
  warden: "Adjacent creatures gain +0/+1",
  unbounded: "Ignores defender when attacking",
  bloodmaster: "+1/+1 for each blood rune attached to this creature",
  lifedrinker: "Heals its owner by the amount of combat damage dealt",
  deathstrike: "When this creature dies, deal damage equal to its power to any target",
};

export function Card({
  card,
  onClick,
  isSelected = false,
  isPlayable = false,
  isAttacker = false,
  isTarget = false,
  isBlockCandidate = false,
  isInHand = false,
  isHighlighted = false,
  showBack = false,
  size = "md",
}: CardProps) {
  if (showBack) {
    const bs = BACK_SIZES[size];
    return (
      <div className={`${bs.w} ${bs.h} rounded-lg leather-pattern ornate-border flex items-center justify-center`}>
        <div className={`text-gold font-medieval-decorative ${bs.text} text-embossed`}>R</div>
      </div>
    );
  }

  const { cardType } = card;

  let cardElement: React.ReactNode;

  if (cardType === "rune") {
    cardElement = <RuneCard card={card} onClick={onClick} isSelected={isSelected} isPlayable={isPlayable} isHighlighted={isHighlighted} size={size} />;
  } else if (cardType === "memory") {
    cardElement = <MemoryCard card={card} onClick={onClick} isPlayable={isPlayable} size={size} />;
  } else if (cardType === "echo") {
    cardElement = <EchoCard card={card} onClick={onClick} isPlayable={isPlayable} isSelected={isSelected} size={size} />;
  } else {
    cardElement = (
      <SummoningCard
        card={card}
        onClick={onClick}
        isSelected={isSelected}
        isPlayable={isPlayable}
        isAttacker={isAttacker}
        isTarget={isTarget}
        isBlockCandidate={isBlockCandidate}
        isInHand={isInHand}
        size={size}
      />
    );
  }

  return (
    <motion.div
      className="group/tooltip relative"
      layoutId={`card-${card.instanceId}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      {cardElement}
      <CardTooltip card={card} />
    </motion.div>
  );
}

// --- CARD TOOLTIP ---
function CardTooltip({ card }: { card: CardState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [side, setSide] = useState<"right" | "left">("right");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    // Show on left if card is in the right half of the viewport
    setSide(rect.left + rect.width / 2 > window.innerWidth / 2 ? "left" : "right");
  }, []);

  const { cardType } = card;
  const abilities = card.abilities ? card.abilities.split(",").filter(Boolean) : [];
  const spellDisplay = card.spellName ? card.spellName.split("").join(" · ") : "";

  // Rune type label
  const runeTypeLabel = card.runeType === "blood" ? "Blood Rune" : card.runeType === "stone" ? "Stone Rune" : "Standard Rune";

  const posClass = side === "right"
    ? "left-full ml-2"
    : "right-full mr-2";

  return (
    <div
      ref={ref}
      className={`
        absolute ${posClass} top-0
        w-48 rounded-lg p-2.5 pointer-events-none
        opacity-0 group-hover/tooltip:opacity-100
        transition-opacity duration-200 delay-300
        z-[100]
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(20,16,10,0.95) 0%, rgba(30,23,15,0.95) 100%)',
        border: '1px solid rgba(107,92,78,0.5)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
      }}
    >
      {/* Card name */}
      <div className="text-gold font-medieval font-semibold text-sm mb-1">{card.name}</div>

      {/* Card type badge */}
      <div className="text-[10px] uppercase tracking-wider font-medieval mb-1.5"
        style={{
          color: cardType === "summoning" ? '#e0c878'
            : cardType === "echo" ? '#5de0c8'
            : cardType === "memory" ? '#9b6dff'
            : '#a08030',
        }}
      >
        {cardType === "rune" ? runeTypeLabel : cardType}
      </div>

      {/* Spell cost */}
      {spellDisplay && (
        <div className="text-xs text-stone-400 font-body mb-1.5">
          <span className="text-stone-500">Cost:</span>{" "}
          {card.bloodCost > 0 ? (
            <span className="text-red-400 font-medieval tracking-wide">Blood {card.bloodCost} <span className="text-stone-500 text-[10px]">({spellDisplay})</span></span>
          ) : (
            <span className="text-parchment-light font-medieval tracking-wide">{spellDisplay}</span>
          )}
        </div>
      )}

      {/* Stats for summoning */}
      {cardType === "summoning" && (
        <div className="flex items-center gap-2 text-xs font-medieval mb-1.5">
          <span style={{ color: '#e0c878' }}>{card.attack} ATK</span>
          <span className="text-stone-600">/</span>
          <span className={card.health < card.maxHealth ? "text-red-400" : "text-red-600"}>
            {card.health}{card.health < card.maxHealth ? `/${card.maxHealth}` : ""} HP
          </span>
        </div>
      )}

      {/* Rune letter */}
      {cardType === "rune" && (
        <div className="text-xs text-stone-400 font-body mb-1.5">
          <span className="text-stone-500">Letter:</span> <span className="text-gold font-medieval text-base font-bold">{card.letter}</span>
        </div>
      )}

      {/* Etching counter */}
      {card.etchingCounters > 0 && (
        <div className="text-xs text-stone-400 font-body mb-1.5">
          <span className="text-stone-500">Etching:</span> {card.etchingCounters} turn{card.etchingCounters > 1 ? "s" : ""} left
        </div>
      )}

      {/* Abilities */}
      {abilities.length > 0 && (
        <div className="mb-1.5">
          {abilities.map((a) => (
            <div key={a} className="mb-1 last:mb-0">
              <span className="text-gold text-[11px] font-medieval font-semibold">{a}</span>
              {ABILITY_DESCRIPTIONS[a] && (
                <p className="text-stone-400 text-[10px] font-body leading-tight">{ABILITY_DESCRIPTIONS[a]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aegis indicator */}
      {card.hasAegis && !abilities.includes("aegis") && (
        <div className="mb-1">
          <span className="text-gold text-[11px] font-medieval font-semibold">aegis</span>
          <p className="text-stone-400 text-[10px] font-body leading-tight">{ABILITY_DESCRIPTIONS["aegis"]}</p>
        </div>
      )}

    </div>
  );
}

// --- SUMMONING CARD ---
function SummoningCard({
  card, onClick, isSelected, isPlayable, isAttacker, isTarget, isBlockCandidate, isInHand, size = "md",
}: {
  card: CardState; onClick?: () => void;
  isSelected?: boolean; isPlayable?: boolean; isAttacker?: boolean;
  isTarget?: boolean; isBlockCandidate?: boolean; isInHand?: boolean;
  size?: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const isDamaged = card.health < card.maxHealth;
  const canAct = card.canAttack && !card.hasAttacked && !card.isTapped;
  const s = CARD_SIZES[size];

  const ringClass = isSelected ? "ring-selected" :
    isPlayable ? "ring-playable" :
    isAttacker ? "ring-attacker" :
    isTarget ? "ring-target" :
    isBlockCandidate ? "ring-blocker" :
    (canAct && !isInHand) ? "ring-can-act" : "shadow-card";

  const baseClasses = `
    ${s.w} ${s.h} rounded-lg relative cursor-pointer transition-all duration-200
    hover:scale-[1.4] hover:z-50
    ${card.isTapped ? "rotate-12 opacity-80" : ""}
    ${isSelected ? "scale-105" : ""}
    ${ringClass}
  `;

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`${baseClasses} overflow-hidden border-2 border-stone-700 ${card.hasAegis ? "glow-aegis" : ""} flex flex-col`}
      onClick={onClick}
    >
      {/* Image fills ~80% */}
      <div className="flex-1 relative overflow-hidden">
        {imgError ? (
          <div className="w-full h-full parchment flex items-center justify-center">
            <span className="text-xl">{"\u2694\uFE0F"}</span>
          </div>
        ) : (
          <img
            src={`/cards/${card.id}/card.png`}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {card.hasAegis && (
          <div className={`absolute top-0.5 right-0.5 ${s.aegis} bg-gold rounded-full flex items-center justify-center text-stone-900 font-bold shadow-metal`}>A</div>
        )}
      </div>

      {/* Bottom strip */}
      <div className="bg-stone-900/90 px-1 py-0.5 flex items-center justify-between min-h-[20px]">
        <span className={`text-parchment-light ${s.name} font-semibold truncate font-medieval flex-1`}>{card.name}</span>
        <div className="flex items-center gap-1 ml-1">
          <AnimatedStat value={card.attack} className={`${s.text} font-bold font-medieval`} style={{ color: '#e0c878' }} />
          <span className={`${s.text} text-stone-500`}>/</span>
          <AnimatedStat value={card.health} className={`${s.text} font-bold font-medieval ${isDamaged ? "text-red-400" : "text-red-600"}`} />
        </div>
      </div>
    </div>
  );
}

// --- RUNE CARD ---
function RuneCard({
  card, onClick, isSelected, isPlayable, isHighlighted, size = "md",
}: {
  card: CardState; onClick?: () => void; isSelected?: boolean; isPlayable?: boolean; isHighlighted?: boolean; size?: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const isEtching = card.etchingCounters > 0;
  const isAttached = card.attachedToId !== "";

  const rs = RUNE_SIZES[size];

  const bgStyle = card.runeType === "blood"
    ? { background: 'linear-gradient(135deg, #5c0000, #3a0000)' }
    : card.runeType === "stone"
    ? { background: 'linear-gradient(135deg, #4a3c30, #2a2018)' }
    : { background: 'linear-gradient(135deg, #1e170f, #14100a)' };

  const borderColor = card.runeType === "blood" ? '#8b0000'
    : card.runeType === "stone" ? '#6b5c4e' : '#4a3c30';

  const ringClass = isSelected ? "ring-selected" :
    isPlayable ? "ring-playable" :
    isHighlighted ? "ring-attacker" : "";

  const letterSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-2xl" : "text-3xl";

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        ${rs.w} ${rs.h} rounded-lg relative cursor-pointer transition-all duration-200 overflow-hidden
        hover:scale-[1.5] hover:z-50
        ${isSelected ? "scale-110" : ""}
        ${isHighlighted ? "scale-105 brightness-125" : ""}
        ${isEtching ? "opacity-50" : ""}
        ${isAttached && !isHighlighted ? "opacity-70" : ""}
        flex items-center justify-center
        ${ringClass}
      `}
      style={{ ...bgStyle, border: `2px solid ${borderColor}` }}
      onClick={onClick}
    >
      {/* Background image */}
      {!imgError && (
        <img
          src={`/cards/${card.id}/card.png`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-md opacity-100"
          onError={() => setImgError(true)}
        />
      )}

      {/* Dark overlay for readability */}
      {!imgError && (
        <div className="absolute inset-0 bg-black/20 rounded-md" />
      )}

      <span className={`relative text-gold font-bold ${letterSize} font-medieval text-embossed drop-shadow-lg`}>{card.letter}</span>

      {/* Etching counter badge */}
      {isEtching && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-stone-600 rounded-full flex items-center justify-center border border-stone-500">
          <span className="text-parchment-light text-[8px] font-bold">{card.etchingCounters}</span>
        </div>
      )}

      {/* Rune type indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-stone-400 font-medieval">
        {card.runeType === "blood" ? "B" : card.runeType === "stone" ? "S" : ""}
      </div>
    </div>
  );
}

// --- MEMORY CARD ---
function MemoryCard({
  card, onClick, isPlayable, size = "md",
}: {
  card: CardState; onClick?: () => void; isPlayable?: boolean; size?: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const s = CARD_SIZES[size];
  const ringClass = isPlayable ? "ring-playable" : "";

  const baseClasses = `
    ${s.w} ${s.h} rounded-lg relative cursor-pointer transition-all duration-200
    hover:scale-[1.4] hover:z-50
    ${ringClass}
  `;

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`${baseClasses} overflow-hidden flex flex-col`}
      style={{ border: '2px solid #7b5ea7', boxShadow: '0 0 8px rgba(155, 109, 255, 0.2)' }}
      onClick={onClick}
    >
      <div className="flex-1 relative overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #4a2d6e 0%, #2a2018 100%)' }}>
            <span className="text-2xl">{"\u2728"}</span>
          </div>
        ) : (
          <img src={`/cards/${card.id}/card.png`} alt={card.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        )}
      </div>
      <div className="bg-purple-900/90 px-1 py-0.5 text-center min-h-[18px]">
        <span className={`text-parchment-light ${s.name} font-semibold truncate block font-medieval`}>{card.name}</span>
      </div>
    </div>
  );
}

// --- ECHO CARD ---
function EchoCard({
  card, onClick, isPlayable, isSelected, size = "md",
}: {
  card: CardState; onClick?: () => void; isPlayable?: boolean; isSelected?: boolean; size?: CardSize;
}) {
  const [imgError, setImgError] = useState(false);
  const s = CARD_SIZES[size];

  const ringClass = isSelected ? "ring-selected" :
    isPlayable ? "ring-playable" : "";

  const baseClasses = `
    ${s.w} ${s.h} rounded-lg relative cursor-pointer transition-all duration-200
    hover:scale-[1.4] hover:z-50
    ${isSelected ? "scale-105" : ""}
    ${ringClass}
  `;

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`${baseClasses} overflow-hidden flex flex-col`}
      style={{ border: '2px solid #4a8b7f', boxShadow: '0 0 8px rgba(93, 224, 200, 0.15)' }}
      onClick={onClick}
    >
      <div className="flex-1 relative overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2a5c52 0%, #1e170f 100%)' }}>
            <span className="text-xl">{"\u{1F300}"}</span>
          </div>
        ) : (
          <img src={`/cards/${card.id}/card.png`} alt={card.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
        )}
      </div>
      <div className="bg-emerald-900/90 px-1 py-0.5 text-center min-h-[18px]">
        <span className={`text-parchment-light ${s.name} font-semibold truncate block font-medieval`}>{card.name}</span>
      </div>
    </div>
  );
}
