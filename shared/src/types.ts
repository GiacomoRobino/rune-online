// Card types
export type CardType = "summoning" | "echo" | "memory" | "rune";
export type RuneType = "standard" | "stone" | "blood";

export type AbilityKeyword =
  | "skyrunner"
  | "fury"
  | "rage"
  | "aegis"
  | "defender"
  | "duelist"
  | "shadowwalker"
  | "revenge"
  | "shatter"
  | "pack"
  | "master"
  | "veil"
  | "blink"
  | "warden"
  | "unbounded"
  | "bloodmaster";

// Card definitions
export interface SummoningDefinition {
  id: string;
  name: string;
  type: "summoning";
  spellName: string; // letters needed (e.g. "ERA")
  bloodCost?: number; // pick any N runes from spellName pool
  attack: number;
  health: number;
  abilities: string; // comma-separated keywords
  description?: string;
  effect?: CardEffect;
}

export interface EchoDefinition {
  id: string;
  name: string;
  type: "echo";
  spellName: string;
  bloodCost?: number; // pick any N runes from spellName pool
  description: string;
  abilities: string;
  effect?: CardEffect;
}

export interface MemoryDefinition {
  id: string;
  name: string;
  type: "memory";
  spellName: string;
  bloodCost?: number; // pick any N runes from spellName pool
  description: string;
  effect: CardEffect;
}

export interface RuneDefinition {
  id: string;
  name: string;
  type: "rune";
  letter: string;
  runeType: RuneType;
}

export type CardDefinition =
  | SummoningDefinition
  | EchoDefinition
  | MemoryDefinition
  | RuneDefinition;

// Effects
export type CardEffect =
  | { type: "on_enter"; action: EffectAction }
  | { type: "on_death"; action: EffectAction }
  | { type: "ongoing"; action: EffectAction }
  | { type: "instant"; action: EffectAction };

export type EffectAction =
  | { type: "damage"; amount: number; target: "enemy" | "all_enemies" | "random_enemy" | "any" }
  | { type: "heal"; amount: number; target: "self" | "friendly" | "any" }
  | { type: "draw"; amount: number }
  | { type: "buff"; attack: number; health: number; target: "friendly" | "all_friendly" | "all_enemy" | "all" }
  | { type: "destroy_rune"; target: "enemy" }
  | { type: "return_to_hand"; target: "any" };

// Turn phases
export type TurnPhase = "main" | "declare_attackers" | "declare_blockers" | "combat_damage";

// Message types (client -> server)
export type ClientMessage =
  | { type: "write_rune"; runeId: string }
  | { type: "summon"; cardId: string; runeIds: string[] }
  | { type: "play_echo"; cardId: string; runeIds: string[] }
  | { type: "play_memory"; cardId: string; runeIds: string[]; targetId?: string }
  | { type: "attach_rune"; runeId: string; targetId: string }
  | { type: "declare_attackers"; attackerIds: string[] }
  | { type: "declare_blockers"; assignments: string[] } // "blockerId:attackerId" pairs
  | { type: "end_turn" };

// Game phases
export type GamePhase = "waiting" | "playing" | "ended";

// Join options
export interface JoinOptions {
  nickname: string;
}
