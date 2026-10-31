import { describe, expect, it } from 'vitest';
import { createGame, gameReducer, isAtThreshold, presetSetup, randomIndex } from './state';

describe('game actions', () => {
  it('starts standard presets and multiplayer Brawl correctly', () => {
    expect(createGame().players).toHaveLength(4);
    expect(createGame().players[0]).toMatchObject({ name: 'Player 1', life: 40 });
    expect(presetSetup('1v1')).toMatchObject({ count: 2, life: 20, commander: false });
    expect(presetSetup('Brawl').life).toBe(25);
    expect(presetSetup('Brawl', 4).life).toBe(30);
  });
  it('changes life atomically and supports negative totals and undo', () => {
    const game = createGame();
    const next = gameReducer(game, { type: 'life', id: 'player-1', delta: -45 });
    expect(next.players[0].life).toBe(-5);
    expect(gameReducer(next, { type: 'undo' })).toEqual(game);
  });
  it('clamps counters and does not create history for a no-op', () => {
    const game = createGame();
    expect(gameReducer(game, { type: 'counter', id: 'player-1', counter: 'Poison', delta: -1 })).toEqual(game);
  });
  it('tracks partners separately and reverses damage and life together', () => {
    let game = gameReducer(createGame(), { type: 'player', id: 'player-2', commanders: 2 });
    game = gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-2', commander: 0, delta: 12 });
    game = gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-2', commander: 1, delta: 10 });
    expect(game.players[0].life).toBe(18);
    expect(isAtThreshold(game.players[0], true)).toBe(false);
    const corrected = gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-2', commander: 0, delta: -50 });
    expect(corrected.players[0].life).toBe(30);
    expect(gameReducer(corrected, { type: 'undo' })).toEqual(game);
    const threshold = gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-2', commander: 0, delta: 9 });
    expect(isAtThreshold(threshold.players[0], true)).toBe(true);
  });
  it('rejects nonexistent sources and unavailable partner slots', () => {
    const game = createGame();
    expect(gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-2', commander: 1, delta: 1 })).toEqual(game);
    expect(gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-1', commander: 0, delta: 1 })).toEqual(game);
  });
  it('resets relationships and starter, while preserving names and colors', () => {
    let game = gameReducer(createGame(), { type: 'player', id: 'player-1', name: '  Atraxa  ' });
    game = gameReducer(game, { type: 'starter', id: 'player-4' });
    game = gameReducer(game, { type: 'damage', id: 'player-1', source: 'player-4', commander: 0, delta: 5 });
    game = gameReducer(game, { type: 'reset', setup: presetSetup('1v1') });
    expect(game.players).toHaveLength(2);
    expect(game.players[0]).toMatchObject({ name: 'Atraxa', life: 20, damage: {} });
    expect(game.starter).toBeNull();
    expect(game.history).toEqual([]);
  });
  it('bounds history and rejects RNG bias', () => {
    let game = createGame();
    for (let index = 0; index < 60; index++) game = gameReducer(game, { type: 'life', id: 'player-1', delta: 1 });
    expect(game.history).toHaveLength(50);
    const values = [4294967295, 4];
    expect(randomIndex(3, () => values.shift()!)).toBe(1);
    expect(() => randomIndex(0)).toThrow();
  });
});