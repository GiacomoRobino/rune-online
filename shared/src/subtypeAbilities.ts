export const SUBTYPE_ABILITIES: Record<string, string[]> = {
  Angel: ["skyrunner", "aegis", "warden"],
  Demon: ["rage", "fury", "revenge"],
};

/** Build an abilities string from subtype defaults + card-specific extras */
export function buildAbilities(subtypes: string[], ...extras: string[]): string {
  const fromSubtypes = subtypes.flatMap(s => SUBTYPE_ABILITIES[s] || []);
  return [...fromSubtypes, ...extras].join(",");
}
