import { z } from 'zod';
import { createGame, type Game } from './state';

export const storageKey = 'tabletop-game-v1';
const countValue = z.number().int().min(0).max(999999);
const name = z.string().trim().min(1).max(24);
const playerSchema = z.object({
  id: z.string().regex(/^player-[1-6]$/),
  name,
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  life: z.number().int().min(-999999).max(999999),
  commanders: z.union([z.literal(1), z.literal(2)]),
  counters: z.record(name, countValue),
  damage: z.record(z.string().regex(/^player-[1-6]:[01]$/), countValue),
});
const snapshotSchema = z.object({
  setup: z.object({
    preset: z.enum(['Commander', '1v1', 'Brawl', 'Custom']),
    count: z.number().int().min(2).max(6),
    life: z.number().int().min(1).max(999),
    commander: z.boolean(),
  }),
  players: z.array(playerSchema).min(2).max(6),
  layout: z.enum(['auto', 'rows', 'columns']),
  visibleCounters: z.array(name).max(15),
  starter: z.string().nullable(),
}).superRefine((snapshot, context) => {
  const ids = new Set(snapshot.players.map(player => player.id));
  if (snapshot.players.length !== snapshot.setup.count || ids.size !== snapshot.players.length || (snapshot.starter !== null && !ids.has(snapshot.starter))) {
    context.addIssue({ code: 'custom', message: 'Inconsistent players' });
  }
  for (const player of snapshot.players) {
    if (Object.keys(player.damage).some(key => !ids.has(key.split(':')[0]) || key.startsWith(`${player.id}:`))) {
      context.addIssue({ code: 'custom', message: 'Unknown damage source' });
    }
  }
});
const savedSchema = z.object({ version: z.literal(1), game: snapshotSchema.and(z.object({ history: z.array(snapshotSchema).max(50) })) });

export function loadGame(storage: Pick<Storage, 'getItem'> = localStorage): Game {
  try {
    const value = storage.getItem(storageKey);
    if (!value) return createGame();
    const result = savedSchema.safeParse(JSON.parse(value));
    return result.success ? result.data.game : createGame();
  } catch {
    return createGame();
  }
}

export function saveGame(game: Game, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    storage.setItem(storageKey, JSON.stringify({ version: 1, game }));
    return true;
  } catch {
    return false;
  }
}