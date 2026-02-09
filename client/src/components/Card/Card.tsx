import { CardState } from "../../hooks/useColyseus";

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
}: CardProps) {
  if (showBack) {
    return (
      <div className="w-24 h-36 rounded-lg leather-pattern ornate-border flex items-center justify-center">
        <div className="text-gold font-medieval-decorative text-2xl text-embossed">R</div>
      </div>
    );
  }

  const { cardType } = card;

  if (cardType === "rune") {
    return <RuneCard card={card} onClick={onClick} isSelected={isSelected} isPlayable={isPlayable} isHighlighted={isHighlighted} />;
  }
  if (cardType === "memory") {
    return <MemoryCard card={card} onClick={onClick} isPlayable={isPlayable} />;
  }
  if (cardType === "echo") {
    return <EchoCard card={card} onClick={onClick} isPlayable={isPlayable} isSelected={isSelected} />;
  }

  // Summoning card
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
    />
  );
}

// --- SUMMONING CARD ---
function SummoningCard({
  card, onClick, isSelected, isPlayable, isAttacker, isTarget, isBlockCandidate, isInHand,
}: {
  card: CardState; onClick?: () => void;
  isSelected?: boolean; isPlayable?: boolean; isAttacker?: boolean;
  isTarget?: boolean; isBlockCandidate?: boolean; isInHand?: boolean;
}) {
  const isDamaged = card.health < card.maxHealth;
  const canAct = card.canAttack && !card.hasAttacked && !card.isTapped;
  const spellDisplay = card.spellName.split("").join("\u00B7");
  const abilities = card.abilities ? card.abilities.split(",").filter(Boolean) : [];

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
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
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
        <span className="text-gold-dark text-[10px] font-bold tracking-wider font-medieval text-embossed">{spellDisplay}</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className="text-stone-800 text-xs font-semibold leading-tight block truncate font-medieval">{card.name}</span>
      </div>

      {/* Card art placeholder */}
      <div className="mx-2 mt-1 h-10 bg-stone-900/50 rounded flex items-center justify-center" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6)' }}>
        <span className="text-xl">
          {card.attack >= 4 ? "\u2694\uFE0F" : card.health >= 4 ? "\u{1F6E1}\uFE0F" : "\u2694\uFE0F"}
        </span>
      </div>

      {/* Ability badges */}
      {abilities.length > 0 && (
        <div className="px-1 mt-1 flex flex-wrap gap-0.5 justify-center">
          {abilities.slice(0, 3).map((a) => (
            <span key={a} className="text-[7px] bg-stone-700 text-parchment-light px-1 rounded border border-stone-600">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Aegis indicator */}
      {card.hasAegis && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-gold rounded-full flex items-center justify-center text-[8px] text-stone-900 font-bold shadow-metal">
          A
        </div>
      )}

      {/* Attack */}
      <div
        className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #c9a84c, #a08030)',
          border: '2px solid #e0c878',
          boxShadow: '0 1px 3px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}
      >
        <span className="text-stone-900 font-bold text-sm font-medieval">{card.attack}</span>
      </div>

      {/* Health */}
      <div
        className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          background: isDamaged ? 'linear-gradient(135deg, #b22222, #8b0000)' : 'linear-gradient(135deg, #8b0000, #5c0000)',
          border: isDamaged ? '2px solid #ff4444' : '2px solid #b22222',
          boxShadow: isDamaged ? '0 0 6px rgba(178,34,34,0.6)' : '0 1px 3px rgba(0,0,0,0.5)',
        }}
      >
        <span className="text-parchment-light font-bold text-sm font-medieval">{card.health}</span>
      </div>
    </div>
  );
}

// --- RUNE CARD ---
function RuneCard({
  card, onClick, isSelected, isPlayable, isHighlighted,
}: {
  card: CardState; onClick?: () => void; isSelected?: boolean; isPlayable?: boolean; isHighlighted?: boolean;
}) {
  const isEtching = card.etchingCounters > 0;
  const isAttached = card.attachedToId !== "";

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

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        w-14 h-20 rounded-lg relative cursor-pointer transition-all duration-200
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
      <span className="text-gold font-bold text-2xl font-medieval text-embossed">{card.letter}</span>

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
  card, onClick, isPlayable,
}: {
  card: CardState; onClick?: () => void; isPlayable?: boolean;
}) {
  const ringClass = isPlayable ? "ring-playable" : "";

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
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
      {/* Card type label */}
      <div className="pt-1 px-1 text-center">
        <span className="text-[9px] font-bold uppercase tracking-wider font-medieval" style={{ color: '#9b6dff' }}>Memory</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className="text-parchment-light text-xs font-semibold leading-tight block truncate font-medieval">{card.name}</span>
      </div>

      {/* Art placeholder */}
      <div className="mx-2 mt-1 h-12 rounded flex items-center justify-center" style={{ background: 'rgba(74, 45, 110, 0.4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
        <span className="text-2xl">{"\u2728"}</span>
      </div>

      {/* Description */}
      <div className="px-1 mt-1">
        <p className="text-stone-300 text-[8px] leading-tight text-center line-clamp-3 font-body">
          {card.description}
        </p>
      </div>
    </div>
  );
}

// --- ECHO CARD ---
function EchoCard({
  card, onClick, isPlayable, isSelected,
}: {
  card: CardState; onClick?: () => void; isPlayable?: boolean; isSelected?: boolean;
}) {
  const spellDisplay = card.spellName.split("").join("\u00B7");

  const ringClass = isSelected ? "ring-selected" :
    isPlayable ? "ring-playable" : "";

  return (
    <div
      data-card-instance-id={card.instanceId}
      className={`
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
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
      {/* Spell name */}
      <div className="pt-1 px-1 text-center">
        <span className="text-[10px] font-bold tracking-wider font-medieval" style={{ color: '#5de0c8' }}>{spellDisplay}</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className="text-parchment-light text-xs font-semibold leading-tight block truncate font-medieval">{card.name}</span>
      </div>

      {/* Art placeholder */}
      <div className="mx-2 mt-1 h-12 rounded flex items-center justify-center" style={{ background: 'rgba(42, 92, 82, 0.4)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }}>
        <span className="text-xl">{"\u{1F300}"}</span>
      </div>

      {/* Description */}
      <div className="px-1 mt-1">
        <p className="text-stone-300 text-[8px] leading-tight text-center line-clamp-3 font-body">
          {card.description}
        </p>
      </div>
    </div>
  );
}
