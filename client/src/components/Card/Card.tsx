import { CardState } from "../../hooks/useColyseus";

interface CardProps {
  card: CardState;
  onClick?: () => void;
  onDragStart?: () => void;
  isPlayable?: boolean;
  isAttacker?: boolean;
  isTarget?: boolean;
  isInHand?: boolean;
  showBack?: boolean;
}

export function Card({
  card,
  onClick,
  onDragStart,
  isPlayable = false,
  isAttacker = false,
  isTarget = false,
  isInHand = false,
  showBack = false,
}: CardProps) {
  if (showBack) {
    return (
      <div className="w-24 h-36 rounded-lg bg-gradient-to-br from-purple-900 to-purple-700 border-2 border-purple-500 flex items-center justify-center">
        <div className="text-purple-300 text-2xl">?</div>
      </div>
    );
  }

  const isSpell = card.cardType === "spell";
  const isDamaged = card.health < card.maxHealth;
  const canAct = card.canAttack && !card.hasAttacked;

  return (
    <div
      className={`
        w-24 h-36 rounded-lg relative cursor-pointer transition-all duration-200
        ${isSpell ? "bg-gradient-to-br from-blue-900 to-blue-700" : "bg-gradient-to-br from-gray-800 to-gray-700"}
        ${isPlayable ? "ring-2 ring-green-400 hover:ring-green-300 hover:scale-105" : ""}
        ${isAttacker ? "ring-2 ring-yellow-400" : ""}
        ${isTarget ? "ring-2 ring-red-400 hover:ring-red-300" : ""}
        ${canAct && !isInHand ? "ring-2 ring-green-500" : ""}
        border border-gray-600
      `}
      onClick={onClick}
      draggable={isPlayable}
      onDragStart={onDragStart}
    >
      {/* Mana cost */}
      <div className="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-blue-600 border-2 border-blue-400 flex items-center justify-center">
        <span className="text-white font-bold text-sm">{card.cost}</span>
      </div>

      {/* Card name */}
      <div className="pt-6 px-1 text-center">
        <span className="text-white text-xs font-semibold leading-tight block truncate">
          {card.name}
        </span>
      </div>

      {/* Card art placeholder */}
      <div className="mx-2 mt-1 h-12 bg-gray-900/50 rounded flex items-center justify-center">
        <span className="text-2xl">
          {isSpell ? "✨" : card.attack >= 4 ? "🐉" : card.attack >= 2 ? "⚔️" : "🛡️"}
        </span>
      </div>

      {/* Description */}
      {card.description && (
        <div className="px-1 mt-1">
          <p className="text-gray-300 text-[8px] leading-tight text-center line-clamp-2">
            {card.description}
          </p>
        </div>
      )}

      {/* Stats (only for minions) */}
      {!isSpell && (
        <>
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
        </>
      )}
    </div>
  );
}
