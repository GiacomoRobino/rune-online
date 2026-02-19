import fs from "fs";
import path from "path";
import { parseDeckList, type DeckListEntry } from "shared";

const DECKLISTS_DIR = path.resolve(import.meta.dirname, "../../decklists");

const decks = new Map<string, DeckListEntry[]>();

// Load all .md files from decklists/ on startup
for (const file of fs.readdirSync(DECKLISTS_DIR)) {
  if (!file.endsWith(".md")) continue;
  const name = file.replace(/\.md$/, "");
  const content = fs.readFileSync(path.join(DECKLISTS_DIR, file), "utf-8");
  decks.set(name, parseDeckList(content));
}

export function getAvailableDecks(): string[] {
  return Array.from(decks.keys());
}

export function getDeck(name: string): DeckListEntry[] | undefined {
  return decks.get(name);
}
