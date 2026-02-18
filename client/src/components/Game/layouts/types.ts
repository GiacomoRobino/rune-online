import { PlayerState } from "../../../hooks/useColyseus";
import { GameInteractions } from "../../../hooks/useGameInteractions";
import { GameEvent } from "../../../types/animations";

export interface LayoutProps {
  myPlayer: PlayerState;
  opponent: PlayerState;
  isMyTurn: boolean;
  turnPhase: string;
  turnNumber: number;
  declaredAttackers: string[];
  interactions: GameInteractions;
  onWriteRune: (runeId: string) => void;
  onEndTurn: () => void;
  onMulligan: () => void;
  gameEvents: GameEvent[];
}
