import type { Game } from '../src/game/state';
export { createGame, presetSetup } from '../src/game/state';

export function storageSeed(game: Game) {
  if (!localStorage.getItem('tabletop-game-v1')) localStorage.setItem('tabletop-game-v1', JSON.stringify({ version: 1, game }));
}