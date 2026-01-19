// Card types
export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  attack: number;
  health: number;
  description?: string;
  type: "minion" | "spell";
  effect?: CardEffect;
}

export type CardEffect =
  | { type: "battlecry"; action: EffectAction }
  | { type: "deathrattle"; action: EffectAction }
  | { type: "spell"; action: EffectAction };

export type EffectAction =
  | { type: "damage"; amount: number; target: "enemy" | "all_enemies" | "random_enemy" }
  | { type: "heal"; amount: number; target: "self" | "friendly_minion" | "all_friendly" }
  | { type: "draw"; amount: number }
  | { type: "buff"; attack: number; health: number; target: "friendly_minion" | "all_friendly" };

// Message types (client -> server)
export type ClientMessage =
  | { type: "play_card"; cardId: string; targetId?: string }
  | { type: "attack"; attackerId: string; targetId: string }
  | { type: "end_turn" };

// Game phases
export type GamePhase = "waiting" | "playing" | "ended";

// Join options
export interface JoinOptions {
  nickname: string;
}
