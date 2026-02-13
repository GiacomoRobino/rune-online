export type Zone = "hand" | "battlefield" | "runeField" | "graveyard" | "chaosDeck" | "runesDeck";

export type GameEvent =
  | { type: "CARD_ENTERED_ZONE"; instanceId: string; zone: Zone; playerSessionId: string }
  | { type: "CARD_LEFT_ZONE"; instanceId: string; zone: Zone; playerSessionId: string }
  | { type: "STAT_CHANGED"; instanceId: string; stat: "attack" | "health"; oldValue: number; newValue: number }
  | { type: "PLAYER_HEALTH_CHANGED"; playerSessionId: string; oldValue: number; newValue: number }
  | { type: "TURN_CHANGED"; turnNumber: number; currentTurn: string }
  | { type: "PHASE_CHANGED"; oldPhase: string; newPhase: string }
  | { type: "RUNE_ATTACHED"; runeInstanceId: string; targetInstanceId: string }
  | { type: "RUNE_DETACHED"; runeInstanceId: string; fromInstanceId: string };
