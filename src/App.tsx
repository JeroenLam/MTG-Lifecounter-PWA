import { useEffect, useReducer, useRef, useState, type CSSProperties } from 'react';
import { Settings2, Undo2, ArrowDownToLine, TriangleAlert } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { gameReducer } from './game/state';
import { loadGame, saveGame } from './game/storage';
import { boardGeometry, railSize, tileGap } from './game/layout';
import { PlayerTile } from './components/PlayerTile';
import { PlayerSettings } from './components/PlayerSettings';
import { CounterSheet } from './components/CounterSheet';
import { GameSettings } from './components/GameSettings';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Sheet = { type: 'settings' } | { type: 'player' | 'counters'; id: string } | null;

export function App() {
  const [game, dispatch] = useReducer(gameReducer, undefined, () => loadGame());
  const [sheet, setSheet] = useState<Sheet>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [size, setSize] = useState({ width: window.innerWidth - 24, height: window.innerHeight - 24 });
  const stage = useRef<HTMLDivElement>(null);
  const { needRefresh: [needRefresh], offlineReady: [offlineReady], updateServiceWorker } = useRegisterSW();
  const geometry = boardGeometry(size.width, size.height, game.players.length, game.layout);
  const { rows, slots, localWidth, localHeight } = geometry;
  const selectedPlayer = sheet && 'id' in sheet ? game.players.find(player => player.id === sheet.id) : undefined;

  useEffect(() => { setStorageFailed(!saveGame(game)); }, [game]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current!);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setInstall(event as InstallEvent); };
    const installed = () => setInstall(null);
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installed);
    return () => { window.removeEventListener('beforeinstallprompt', handler); window.removeEventListener('appinstalled', installed); };
  }, []);
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let disposed = false;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || !('wakeLock' in navigator)) return;
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (disposed) await sentinel.release();
        else lock = sentinel;
      } catch { return; }
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') void acquire();
      else void lock?.release();
    };
    void acquire();
    document.addEventListener('visibilitychange', visibility);
    return () => { disposed = true; void lock?.release(); document.removeEventListener('visibilitychange', visibility); };
  }, []);

  const boardStyle: CSSProperties = {
    width: geometry.width, height: geometry.height,
    gridTemplateColumns: rows ? `repeat(${slots}, ${localWidth}px)` : `${localHeight}px ${railSize}px ${localHeight}px`,
    gridTemplateRows: rows ? `${localHeight}px ${railSize}px ${localHeight}px` : `repeat(${slots}, ${localWidth}px)`,
    columnGap: rows ? tileGap : 0,
    rowGap: rows ? 0 : tileGap,
  };

  return <main className="app-shell">
    <div className="stage" ref={stage}>
      <div className={`board ${rows ? 'board-rows' : 'board-columns'}`} style={boardStyle} data-testid="board" data-layout={rows ? 'rows' : 'columns'}>
        {Array.from({ length: slots * 2 }, (_, index) => {
          const side = index < slots ? 0 : 1;
          const slot = index % slots;
          const player = game.players[index];
          const rotation = rows ? (side === 0 ? 180 : 0) : (side === 0 ? 90 : 270);
          const cellStyle = {
            gridColumn: rows ? slot + 1 : side === 0 ? 1 : 3,
            gridRow: rows ? side === 0 ? 1 : 3 : slot + 1,
            backgroundColor: player?.color,
          };
          return <div className={`player-cell${!player ? ' empty-cell' : ''}`} key={player?.id ?? 'empty'} style={cellStyle}>
            {player && <PlayerTile player={player} starter={game.starter === player.id} commander={game.setup.commander} visibleCounters={game.visibleCounters} rotation={rotation} width={localWidth} height={localHeight} dispatch={dispatch} onEdit={() => setSheet({ type: 'player', id: player.id })} onCounters={() => setSheet({ type: 'counters', id: player.id })} />}
          </div>;
        })}
        <div className={`central-rail ${rows ? 'horizontal' : 'vertical'}`}>
          <button className="rail-button" aria-label="Undo last change" title="Undo last change" disabled={game.history.length === 0} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={18} /></button>
          <button className="settings-button" aria-label="Table settings" title="Table settings" onClick={() => setSheet({ type: 'settings' })}><Settings2 size={23} /></button>
          <button className={`rail-button status-button${needRefresh || storageFailed ? ' has-status' : ''}`} title={needRefresh ? 'Update available' : storageFailed ? 'Session not saved' : `${game.setup.preset} · ${game.players.length} players`} aria-label={needRefresh ? 'Update available' : storageFailed ? 'Session not saved' : 'Game information'} onClick={() => setSheet({ type: 'settings' })}>{needRefresh ? <ArrowDownToLine size={18} /> : storageFailed ? <TriangleAlert size={18} /> : <span className="format-mark">{game.setup.life}</span>}</button>
        </div>
      </div>
    </div>
    {sheet?.type === 'settings' && <GameSettings game={game} dispatch={dispatch} rows={rows} onClose={() => setSheet(null)} needRefresh={needRefresh} offlineReady={offlineReady} storageFailed={storageFailed} onUpdate={() => {
      if (saveGame(game)) void updateServiceWorker(true);
      else setStorageFailed(true);
    }} onInstall={install ? () => { void install.prompt().then(() => install.userChoice).then(() => setInstall(null)); } : undefined} />}
    {sheet?.type === 'player' && selectedPlayer && <PlayerSettings key={selectedPlayer.id} player={selectedPlayer} game={game} dispatch={dispatch} onClose={() => setSheet(null)} />}
    {sheet?.type === 'counters' && selectedPlayer && <CounterSheet player={selectedPlayer} game={game} dispatch={dispatch} onClose={() => setSheet(null)} />}
  </main>;
}