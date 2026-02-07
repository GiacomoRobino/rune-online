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
      <div className="w-24 h-36 rounded-lg bg-gradient-to-br from-purple-900 to-purple-700 border-2 border-purple-500 flex items-center justify-center">
        <div className="text-purple-300 text-2xl">?</div>
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

  return (
    <div
      className={`
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
        bg-gradient-to-br from-gray-800 to-gray-700
        ${card.isTapped ? "rotate-12 opacity-80" : ""}
        ${isSelected ? "ring-2 ring-blue-400 scale-105" : ""}
        ${isPlayable ? "ring-2 ring-green-400 hover:ring-green-300 hover:scale-105" : ""}
        ${isAttacker ? "ring-2 ring-yellow-400" : ""}
        ${isTarget ? "ring-2 ring-red-400 hover:ring-red-300" : ""}
        ${isBlockCandidate ? "ring-2 ring-orange-400" : ""}
        ${canAct && !isInHand ? "ring-2 ring-green-500" : ""}
        border border-gray-600
      `}
      onClick={onClick}
    >
      {/* Spell name */}
      <div className="pt-1 px-1 text-center">
        <span className="text-yellow-300 text-[10px] font-bold tracking-wider">{spellDisplay}</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className="text-white text-xs font-semibold leading-tight block truncate">{card.name}</span>
      </div>

      {/* Card art placeholder */}
      <div className="mx-2 mt-1 h-10 bg-gray-900/50 rounded flex items-center justify-center">
        <span className="text-xl">
          {card.attack >= 4 ? "\u2694\uFE0F" : card.health >= 4 ? "\u{1F6E1}\uFE0F" : "\u2694\uFE0F"}
        </span>
      </div>

      {/* Ability badges */}
      {abilities.length > 0 && (
        <div className="px-1 mt-1 flex flex-wrap gap-0.5 justify-center">
          {abilities.slice(0, 3).map((a) => (
            <span key={a} className="text-[7px] bg-purple-800 text-purple-200 px-1 rounded">
              {a}
            </span>
          ))}
        </div>
      )}

      {/* Aegis indicator */}
      {card.hasAegis && (
        <div className="absolute top-0 right-0 w-4 h-4 bg-cyan-400 rounded-full flex items-center justify-center text-[8px]">
          A
        </div>
      )}

      {/* Attack */}
      <div className="absolute -bottom-2 -left-2 w-7 h-7 rounded-full bg-yellow-600 border-2 border-yellow-400 flex items-center justify-center">
        <span className="text-white font-bold text-sm">{card.attack}</span>
      </div>

      {/* Health */}
      <div
        className={`absolute -bottom-2 -right-2 w-7 h-7 rounded-full border-2 flex items-center justify-center
          ${isDamaged ? "bg-red-700 border-red-400" : "bg-red-600 border-red-400"}
        `}
      >
        <span className="text-white font-bold text-sm">{card.health}</span>
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
  const borderColor = card.runeType === "blood" ? "border-red-500" :
    card.runeType === "stone" ? "border-gray-400" : "border-white";
  const bgColor = card.runeType === "blood" ? "from-red-900 to-red-800" :
    card.runeType === "stone" ? "from-gray-700 to-gray-600" : "from-indigo-900 to-indigo-800";
  const isEtching = card.etchingCounters > 0;
  const isAttached = card.attachedToId !== "";

  return (
    <div
      className={`
        w-14 h-20 rounded-lg relative cursor-pointer transition-all duration-200
        bg-gradient-to-br ${bgColor} border-2 ${borderColor}
        ${isSelected ? "ring-2 ring-blue-400 scale-110" : ""}
        ${isPlayable ? "ring-2 ring-green-400 hover:scale-105" : ""}
        ${isHighlighted ? "ring-2 ring-amber-400 scale-105 brightness-125" : ""}
        ${isEtching ? "opacity-50" : ""}
        ${isAttached && !isHighlighted ? "opacity-70" : ""}
        flex items-center justify-center
      `}
      onClick={onClick}
    >
      <span className="text-white font-bold text-2xl">{card.letter}</span>

      {/* Etching counter badge */}
      {isEtching && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[8px] font-bold">{card.etchingCounters}</span>
        </div>
      )}

      {/* Rune type indicator */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] text-gray-300">
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
  return (
    <div
      className={`
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
        bg-gradient-to-br from-purple-900 to-amber-900
        ${isPlayable ? "ring-2 ring-green-400 hover:ring-green-300 hover:scale-105" : ""}
        border border-purple-500
      `}
      onClick={onClick}
    >
      {/* Card type label */}
      <div className="pt-1 px-1 text-center">
        <span className="text-purple-300 text-[9px] font-bold uppercase tracking-wider">Memory</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className="text-white text-xs font-semibold leading-tight block truncate">{card.name}</span>
      </div>

      {/* Art placeholder */}
      <div className="mx-2 mt-1 h-12 bg-purple-950/50 rounded flex items-center justify-center">
        <span className="text-2xl">{"\u2728"}</span>
      </div>

      {/* Description */}
      <div className="px-1 mt-1">
        <p className="text-gray-300 text-[8px] leading-tight text-center line-clamp-3">
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

  return (
    <div
      className={`
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
        bg-gradient-to-br from-teal-900 to-teal-700
        ${isSelected ? "ring-2 ring-blue-400 scale-105" : ""}
        ${isPlayable ? "ring-2 ring-green-400 hover:ring-green-300 hover:scale-105" : ""}
        border border-teal-500
      `}
      onClick={onClick}
    >
      {/* Spell name */}
      <div className="pt-1 px-1 text-center">
        <span className="text-teal-300 text-[10px] font-bold tracking-wider">{spellDisplay}</span>
      </div>

      {/* Card name */}
      <div className="px-1 text-center">
        <span className="text-white text-xs font-semibold leading-tight block truncate">{card.name}</span>
      </div>

      {/* Art placeholder */}
      <div className="mx-2 mt-1 h-12 bg-teal-950/50 rounded flex items-center justify-center">
        <span className="text-xl">{"\u{1F300}"}</span>
      </div>

      {/* Description */}
      <div className="px-1 mt-1">
        <p className="text-gray-300 text-[8px] leading-tight text-center line-clamp-3">
          {card.description}
        </p>
      </div>
    </div>
  );
}
