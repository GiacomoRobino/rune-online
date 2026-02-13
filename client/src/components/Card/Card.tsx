import { useState } from "react";
import { CardState } from "../../hooks/useColyseus";

export type CardSize = "sm" | "md" | "lg";

// Size configs for main cards (summoning, echo, memory)
const CARD_SIZES = {
  sm: { w: "w-20", h: "h-28", art: "h-10", text: "text-[9px]", name: "text-[10px]", stat: "w-6 h-6 text-xs", statOffset: "-bottom-1.5 -left-1.5", statOffsetR: "-bottom-1.5 -right-1.5", badge: "text-[6px]", desc: "text-[7px]", aegis: "w-3.5 h-3.5 text-[7px]" },
  md: { w: "w-[100px]", h: "h-[140px]", art: "h-16", text: "text-[10px]", name: "text-xs", stat: "w-7 h-7 text-sm", statOffset: "-bottom-2 -left-2", statOffsetR: "-bottom-2 -right-2", badge: "text-[7px]", desc: "text-[8px]", aegis: "w-4 h-4 text-[8px]" },
  lg: { w: "w-[130px]", h: "h-[182px]", art: "h-[90px]", text: "text-[11px]", name: "text-sm", stat: "w-8 h-8 text-base", statOffset: "-bottom-2.5 -left-2.5", statOffsetR: "-bottom-2.5 -right-2.5", badge: "text-[8px]", desc: "text-[9px]", aegis: "w-5 h-5 text-[9px]" },
};

// Size configs for rune cards (always smaller)
const RUNE_SIZES = {
  sm: { w: "w-11", h: "h-16" },
  md: { w: "w-14", h: "h-20" },
  lg: { w: "w-16", h: "h-[88px]" },
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

  if (cardType === "rune") {
    return <RuneCard card={card} onClick={onClick} isSelected={isSelected} isPlayable={isPlayable} isHighlighted={isHighlighted} size={size} />;
  }
  if (cardType === "memory") {
    return <MemoryCard card={card} onClick={onClick} isPlayable={isPlayable} size={size} />;
  }
  if (cardType === "echo") {
    return <EchoCard card={card} onClick={onClick} isPlayable={isPlayable} isSelected={isSelected} size={size} />;
  }

  return (
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
  const spellDisplay = card.spellName.split("").join("\u00B7");
  const abilities = card.abilities ? card.abilities.split(",").filter(Boolean) : [];
  const s = CARD_SIZES[size];

  const ringClass = isSelected ? "ring-selected" :
    isPlayable ? "ring-playable" :
    isAttacker ? "ring-attacker" :
    isTarget ? "ring-target" :
    isBlockCandidate ? "ring-blocker" :
    (canAct && !isInHand) ? "ring-can-act" : "";

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        ${s.w} ${s.h} rounded-lg relative cursor-pointer transition-all duration-200
        parchment border-2 border-stone-700 shadow-card
        ${card.isTapped ? "rotate-12 opacity-80" : ""}
        ${isSelected ? "scale-105" : ""}
        ${isPlayable ? "hover:scale-105" : ""}
        ${ringClass}
      `}
      onClick={onClick}
    >
      {/* Spell name */}
      <div className="pt-1 px-1 text-center">
        <span className={`text-gold-dark ${s.text} font-bold tracking-wider font-medieval text-embossed`}>{spellDisplay}</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className={`text-stone-800 ${s.name} font-semibold leading-tight block truncate font-medieval`}>{card.name}</span>
      </div>

      {/* Card art — significantly larger */}
      <div className={`mx-1.5 mt-1 ${s.art} bg-stone-900/50 rounded flex items-center justify-center overflow-hidden`} style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
        {imgError ? (
          <span className="text-xl">{"\u2694\uFE0F"}</span>
        ) : (
          <img
            src={`/cards/${card.id}/card.png`}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Ability badges */}
      {abilities.length > 0 && (
        <div className="px-1 mt-0.5 flex flex-wrap gap-0.5 justify-center">
          {abilities.slice(0, 3).map((a) => (
            <span key={a} className={`${s.badge} bg-stone-700 text-parchment-light px-1 rounded border border-stone-600`}>
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Aegis indicator */}
      {card.hasAegis && (
        <div className={`absolute top-0 right-0 ${s.aegis} bg-gold rounded-full flex items-center justify-center text-stone-900 font-bold shadow-metal`}>
          A
        </div>
      )}

      {/* Attack */}
      <div
        className={`absolute ${s.statOffset} ${s.stat} rounded-full flex items-center justify-center`}
        style={{
          background: 'linear-gradient(135deg, #c9a84c, #a08030)',
          border: '2px solid #e0c878',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        <span className="text-stone-900 font-bold font-medieval">{card.attack}</span>
      </div>

      {/* Health */}
      <div
        className={`absolute ${s.statOffsetR} ${s.stat} rounded-full flex items-center justify-center`}
        style={{
          background: isDamaged ? 'linear-gradient(135deg, #b22222, #8b0000)' : 'linear-gradient(135deg, #8b0000, #5c0000)',
          border: isDamaged ? '2px solid #ff4444' : '2px solid #b22222',
          boxShadow: isDamaged ? '0 0 6px rgba(178,34,34,0.6)' : '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        <span className="text-parchment-light font-bold font-medieval">{card.health}</span>
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

  const letterSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-xl" : "text-2xl";

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        ${rs.w} ${rs.h} rounded-lg relative cursor-pointer transition-all duration-200
        ${isSelected ? "scale-110" : ""}
        ${isPlayable ? "hover:scale-105" : ""}
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
          className="absolute inset-0 w-full h-full object-cover rounded-md opacity-40"
          onError={() => setImgError(true)}
        />
      )}
      <span className={`relative text-gold font-bold ${letterSize} font-medieval text-embossed`}>{card.letter}</span>

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

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        ${s.w} ${s.h} rounded-lg relative cursor-pointer transition-all duration-200
        ${isPlayable ? "hover:scale-105" : ""}
        ${ringClass}
      `}
      style={{
        background: 'linear-gradient(135deg, #4a2d6e 0%, #2a2018 100%)',
        border: '2px solid #7b5ea7',
        boxShadow: '0 0 8px rgba(155, 109, 255, 0.2)',
      }}
      onClick={onClick}
    >
      <div className="pt-1 px-1 text-center">
        <span className="text-[9px] font-bold uppercase tracking-wider font-medieval" style={{ color: '#9b6dff' }}>Memory</span>
      </div>
      <div className="px-1 text-center">
        <span className={`text-parchment-light ${s.name} font-semibold leading-tight block truncate font-medieval`}>{card.name}</span>
      </div>
      <div className={`mx-1.5 mt-1 ${s.art} rounded flex items-center justify-center overflow-hidden`} style={{ background: 'rgba(74, 45, 110, 0.4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
        {imgError ? (
          <span className="text-2xl">{"\u2728"}</span>
        ) : (
          <img
            src={`/cards/${card.id}/card.png`}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="px-1 mt-1">
        <p className={`text-stone-300 ${s.desc} leading-tight text-center line-clamp-3 font-body`}>
          {card.description}
        </p>
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
  const spellDisplay = card.spellName.split("").join("\u00B7");
  const s = CARD_SIZES[size];

  const ringClass = isSelected ? "ring-selected" :
    isPlayable ? "ring-playable" : "";

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        ${s.w} ${s.h} rounded-lg relative cursor-pointer transition-all duration-200
        ${isSelected ? "scale-105" : ""}
        ${isPlayable ? "hover:scale-105" : ""}
        ${ringClass}
      `}
      style={{
        background: 'linear-gradient(135deg, #2a5c52 0%, #1e170f 100%)',
        border: '2px solid #4a8b7f',
        boxShadow: '0 0 8px rgba(93, 224, 200, 0.15)',
      }}
      onClick={onClick}
    >
      <div className="pt-1 px-1 text-center">
        <span className={`${s.text} font-bold tracking-wider font-medieval`} style={{ color: '#5de0c8' }}>{spellDisplay}</span>
      </div>
      <div className="px-1 text-center">
        <span className={`text-parchment-light ${s.name} font-semibold leading-tight block truncate font-medieval`}>{card.name}</span>
      </div>
      <div className={`mx-1.5 mt-1 ${s.art} rounded flex items-center justify-center overflow-hidden`} style={{ background: 'rgba(42, 92, 82, 0.4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
        {imgError ? (
          <span className="text-xl">{"\u{1F300}"}</span>
        ) : (
          <img
            src={`/cards/${card.id}/card.png`}
            alt={card.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      <div className="px-1 mt-1">
        <p className={`text-stone-300 ${s.desc} leading-tight text-center line-clamp-3 font-body`}>
          {card.description}
        </p>
      </div>
    </div>
  );
}
