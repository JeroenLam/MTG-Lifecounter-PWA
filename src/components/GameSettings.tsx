import { Download, Flag, RefreshCw, RotateCw, Undo2, Users, Check, ArrowDownToLine } from 'lucide-react';
import { useState, type Dispatch } from 'react';
import { counterNames, presetSetup, randomIndex, type Action, type Game, type Preset, type Setup } from '../game/state';
import { Modal } from './Modal';

interface Props {
  game: Game;
  dispatch: Dispatch<Action>;
  onClose: () => void;
  rows: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  onUpdate: () => void;
  onInstall?: () => void;
  storageFailed: boolean;
}

export function GameSettings({ game, dispatch, onClose, rows, needRefresh, offlineReady, onUpdate, onInstall, storageFailed }: Props) {
  const [setup, setSetup] = useState<Setup>(game.setup);
  const [confirm, setConfirm] = useState<'reset' | 'starter' | null>(null);
  const dirty = JSON.stringify(setup) !== JSON.stringify(game.setup);
  const starter = game.players.find(player => player.id === game.starter);
  const availableCounters = [...new Set([...counterNames, ...game.visibleCounters, ...game.players.flatMap(player => Object.keys(player.counters))])];
  function chooseStarter() { dispatch({ type: 'starter', id: game.players[randomIndex(game.players.length)].id }); setConfirm(null); }
  function updateCount(count: number) {
    setSetup(setup.preset === 'Brawl' ? presetSetup('Brawl', count) : { ...setup, count, preset: setup.preset === '1v1' && count !== 2 ? 'Custom' : setup.preset });
  }

  return <Modal title="Table settings" eyebrow="Tabletop" onClose={onClose}>
    <fieldset><legend>Format</legend><div className="segmented presets">
      {(['Commander', '1v1', 'Brawl', 'Custom'] as Preset[]).map(preset => <button key={preset} aria-pressed={setup.preset === preset} onClick={() => setSetup(preset === 'Custom' ? { ...setup, preset } : presetSetup(preset))}>{preset}</button>)}
    </div></fieldset>
    <div className="setup-fields">
      <label className="field"><span><Users size={16} />Players</span><select value={setup.count} onChange={event => updateCount(Number(event.target.value))}>{[2, 3, 4, 5, 6].map(count => <option key={count} value={count}>{count}</option>)}</select></label>
      <label className="field">Starting life<input type="number" min={1} max={999} value={setup.life} onChange={event => setSetup({ ...setup, preset: 'Custom', life: Number(event.target.value) })} /></label>
    </div>
    <label className="check-row"><span><SwordsIcon />Commander damage</span><input type="checkbox" checked={setup.commander} onChange={event => setSetup({ ...setup, preset: 'Custom', commander: event.target.checked })} /></label>
    <button className="command full" disabled={!Number.isInteger(setup.life) || setup.life < 1 || setup.life > 999} onClick={() => setConfirm('reset')}><RefreshCw size={18} />{dirty ? 'Apply & start new game' : 'New game'}</button>
    {confirm === 'reset' && <div className="confirmation" role="alert">
      <p>Reset all totals and counters? Names and colors stay.</p>
      <div className="button-pair"><button className="command" onClick={() => setConfirm(null)}>Cancel</button><button className="command danger-command" onClick={() => { dispatch({ type: 'reset', setup }); setConfirm(null); }}><RefreshCw size={16} />Reset game</button></div>
    </div>}
    <div className="settings-divider" />
    <div className="setting-line"><span>Seating</span><button className="command" onClick={() => dispatch({ type: 'layout', layout: rows ? 'columns' : 'rows' })}><RotateCw size={18} />Rotate grid</button></div>
    <label className="check-row"><span>Follow device orientation</span><input type="checkbox" checked={game.layout === 'auto'} onChange={event => dispatch({ type: 'layout', layout: event.target.checked ? 'auto' : rows ? 'rows' : 'columns' })} /></label>
    <fieldset><legend>Counters</legend><div className="counter-options">
      {availableCounters.map(name => <label className="check-row" key={name}><span>{name}</span><input type="checkbox" checked={game.visibleCounters.includes(name)} disabled={!game.visibleCounters.includes(name) && game.visibleCounters.length >= 15} onChange={event => dispatch({ type: 'visible', counters: event.target.checked ? [...game.visibleCounters, name] : game.visibleCounters.filter(counter => counter !== name) })} /></label>)}
    </div></fieldset>
    <div className="settings-divider" />
    <button className="command full" onClick={() => starter ? setConfirm('starter') : chooseStarter()}><Flag size={18} />Select starting player{starter && <span className="command-result">{starter.name}</span>}</button>
    {confirm === 'starter' && <div className="confirmation"><p>Select the starting player again?</p><div className="button-pair"><button className="command" onClick={() => setConfirm(null)}>Cancel</button><button className="command" onClick={chooseStarter}><Flag size={16} />Select again</button></div></div>}
    <button className="command full" disabled={game.history.length === 0} onClick={() => dispatch({ type: 'undo' })}><Undo2 size={18} />Undo last change</button>
    <footer className="settings-footer">
      <span>{storageFailed ? 'Session not saved' : 'Game saved on this device'}</span>
      {offlineReady && <span><Check size={14} />Offline ready</span>}
      {onInstall && <button className="command" onClick={onInstall}><Download size={16} />Install</button>}
      {needRefresh && <button className="command" onClick={onUpdate}><ArrowDownToLine size={16} />Apply update</button>}
    </footer>
  </Modal>;
}

function SwordsIcon() {
  return <span aria-hidden="true" className="small-mark">21</span>;
}