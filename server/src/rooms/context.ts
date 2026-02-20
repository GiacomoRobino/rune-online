import { GameState } from "shared";

export interface GameContext {
  state: GameState;
  playerOrder: string[];
  pendingFinishEndTurn: boolean;
  pendingCombatContinue: boolean;
}
