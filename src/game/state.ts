export const colors = ['#c8e3d5', '#f0c6bb', '#c4dced', '#e8d69c', '#d9c8e8', '#cad6a3'];
export const counterNames = ['Poison', 'Energy', 'Experience', 'Radiation', 'Tickets'];
export type Preset = 'Commander' | '1v1' | 'Brawl' | 'Custom';
export type Layout = 'auto' | 'rows' | 'columns';
export interface Player {
  id: string;
  name: string;
  color: string;
  life: number;
  commanders: 1 | 2;
  counters: Record<string, number>;
  damage: Record<string, number>;
}
export interface Setup {
  preset: Preset;
  count: number;
  life: number;
  commander: boolean;
}
export interface Snapshot {
  players: Player[];
  setup: Setup;
  layout: Layout;
  visibleCounters: string[];
  starter: string | null;
}
export interface Game extends Snapshot {
  history: Snapshot[];
}
export type Action =
  | { type: 'life'; id: string; delta: number }
  | { type: 'counter'; id: string; counter: string; delta: number }
  | { type: 'damage'; id: string; source: string; commander: number; delta: number }
  | { type: 'player'; id: string; name?: string; color?: string; commanders?: 1 | 2 }
  | { type: 'layout'; layout: Layout }
  | { type: 'visible'; counters: string[] }
  | { type: 'starter'; id: string }
  | { type: 'reset'; setup: Setup }
  | { type: 'undo' };

export function presetSetup(preset: Preset, count?: number): Setup {
  const players = count ?? (preset === 'Commander' ? 4 : 2);
  return { preset, count: players, life: preset === 'Commander' ? 40 : preset === 'Brawl' ? (players === 2 ? 25 : 30) : 20, commander: preset === 'Commander' || preset === 'Brawl' };
}

export function createGame(setup = presetSetup('Commander'), previous?: Snapshot): Game {
  return {
    setup,
    players: Array.from({ length: setup.count }, (_, index) => ({
      id: `player-${index + 1}`,
      name: previous?.players[index]?.name ?? `Player ${index + 1}`,
      color: previous?.players[index]?.color ?? colors[index],
      life: setup.life,
      commanders: previous?.players[index]?.commanders ?? 1,
      counters: {},
      damage: {},
    })),
    layout: previous?.layout ?? 'auto',
    visibleCounters: previous?.visibleCounters ?? ['Poison', 'Energy'],
    starter: null,
    history: [],
  };
}

export function gameReducer(game: Game, action: Action): Game {
  if (action.type === 'undo') {
    const last = game.history.at(-1);
    return last ? { ...last, history: game.history.slice(0, -1) } : game;
  }
  if (action.type === 'reset') return createGame(action.setup, game);
  const { history, ...snapshot } = game;
  let next: Snapshot = snapshot;
  if (action.type === 'layout') next = { ...snapshot, layout: action.layout };
  else if (action.type === 'visible') {
    const added = action.counters.filter(name => !snapshot.visibleCounters.includes(name));
    next = {
      ...snapshot,
      visibleCounters: [...new Set(action.counters)],
      players: snapshot.players.map(player => ({ ...player, counters: { ...Object.fromEntries(added.map(name => [name, 0])), ...player.counters } })),
    };
  }
  else if (action.type === 'starter') {
    if (!game.players.some(player => player.id === action.id)) return game;
    next = { ...snapshot, starter: action.id };
  } else {
    if (!game.players.some(player => player.id === action.id)) return game;
    if (action.type === 'player' && action.commanders === 1 && game.players.some(player => (player.damage[`${action.id}:1`] ?? 0) > 0)) return game;
    if (action.type === 'damage') {
      const source = game.players.find(player => player.id === action.source);
      if (!game.setup.commander || !source || source.id === action.id || action.commander < 0 || action.commander >= source.commanders) return game;
    }
    next = {
      ...snapshot,
      players: game.players.map(player => {
        if (player.id !== action.id) return player;
        switch (action.type) {
          case 'life': return { ...player, life: player.life + action.delta };
          case 'counter': {
            const old = player.counters[action.counter] ?? 0;
            const value = Math.max(0, old + action.delta);
            return value === old ? player : { ...player, counters: { ...player.counters, [action.counter]: value } };
          }
          case 'damage': {
            const key = `${action.source}:${action.commander}`;
            const old = player.damage[key] ?? 0;
            const value = Math.max(0, old + action.delta);
            if (value === old) return player;
            return { ...player, life: player.life - (value - old), damage: { ...player.damage, [key]: value } };
          }
          case 'player': return {
            ...player,
            name: action.name === undefined ? player.name : action.name.trim().slice(0, 24) || `Player ${game.players.indexOf(player) + 1}`,
            color: action.color ?? player.color,
            commanders: action.commanders ?? player.commanders,
          };
        }
      }),
    };
  }
  if (JSON.stringify(next) === JSON.stringify(snapshot)) return game;
  return { ...next, history: [...history.slice(-49), snapshot] };
}

export function randomIndex(count: number, random = () => crypto.getRandomValues(new Uint32Array(1))[0]): number {
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('Invalid player count');
  const limit = 2 ** 32 - (2 ** 32 % count);
  let value = random();
  while (value >= limit) value = random();
  return value % count;
}

export function isAtThreshold(player: Player, commanderEnabled: boolean): boolean {
  return player.life <= 0 || (player.counters.Poison ?? 0) >= 10 || (commanderEnabled && Object.values(player.damage).some(value => value >= 21));
}