import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame, gameReducer } from './state';
import { loadGame, saveGame, storageKey } from './storage';

afterEach(() => vi.restoreAllMocks());

describe('persistence', () => {
  it('restores scores and history', () => {
    const game = gameReducer(createGame(), { type: 'life', id: 'player-2', delta: -3 });
    expect(saveGame(game)).toBe(true);
    expect(loadGame()).toEqual(game);
  });
  it('falls back on corrupted or unsupported state', () => {
    for (const value of ['not json', '{"version":2}', JSON.stringify({ version: 1, game: { ...createGame(), starter: 'missing' } })]) {
      localStorage.setItem(storageKey, value);
      expect(loadGame()).toEqual(createGame());
    }
  });
  it('handles blocked storage', () => {
    expect(loadGame({ getItem: () => { throw new Error('blocked'); } })).toEqual(createGame());
    expect(saveGame(createGame(), { setItem: () => { throw new Error('quota'); } })).toBe(false);
  });
  it('handles a blocked localStorage property itself', () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('blocked'); });
    expect(loadGame()).toEqual(createGame());
    expect(saveGame(createGame())).toBe(false);
  });
});