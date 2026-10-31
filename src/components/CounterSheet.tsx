import { Minus, Plus, Skull, Swords, Zap } from 'lucide-react';
import { useState, type Dispatch } from 'react';
import { type Action, type Game, type Player } from '../game/state';
import { HoldButton } from './HoldButton';
import { Modal } from './Modal';

function Stepper({ label, value, onChange, danger = false }: { label: string; value: number; onChange: (delta: number) => void; danger?: boolean }) {
  return <div className={`stepper${danger ? ' danger' : ''}`}>
    <HoldButton className="icon-button" title={`Decrease ${label}`} aria-label={`Decrease ${label}`} disabled={value === 0} onStep={() => onChange(-1)}><Minus /></HoldButton>
    <output aria-label={label} style={{ fontSize: value >= 10000 ? 10 : value >= 1000 ? 14 : 22 }}>{value}</output>
    <HoldButton className="icon-button" title={`Increase ${label}`} aria-label={`Increase ${label}`} onStep={() => onChange(1)}><Plus /></HoldButton>
  </div>;
}

export function CounterSheet({ player, game, dispatch, onClose }: { player: Player; game: Game; dispatch: Dispatch<Action>; onClose: () => void }) {
  const [tab, setTab] = useState<'counters' | 'commander'>('counters');
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');

  return <Modal title={player.name} eyebrow="Counters" onClose={onClose}>
    {game.setup.commander && <div className="tabs" role="tablist" aria-label="Counter type">
      <button role="tab" aria-selected={tab === 'counters'} onClick={() => setTab('counters')}><Skull size={16} />Counters</button>
      <button role="tab" aria-selected={tab === 'commander'} onClick={() => setTab('commander')}><Swords size={16} />Commander</button>
    </div>}
    {tab === 'counters' ? <>
      <div className="counter-list">
        {game.visibleCounters.map(name => <div className="counter-row" key={name}>
          <span className="row-name">{name === 'Poison' ? <Skull size={18} /> : name === 'Energy' ? <Zap size={18} /> : null}<span>{name}</span></span>
          <Stepper label={name} value={player.counters[name] ?? 0} danger={name === 'Poison' && (player.counters[name] ?? 0) >= 10} onChange={delta => dispatch({ type: 'counter', id: player.id, counter: name, delta })} />
        </div>)}
      </div>
      <form className="add-counter" onSubmit={event => {
        event.preventDefault();
        const value = custom.trim().slice(0, 24);
        if (!value || ['__proto__', 'constructor', 'prototype'].includes(value) || game.visibleCounters.some(name => name.toLowerCase() === value.toLowerCase())) { setError('Choose a unique counter name.'); return; }
        if (game.visibleCounters.length >= 15) { setError('Maximum 15 counter types.'); return; }
        dispatch({ type: 'visible', counters: [...game.visibleCounters, value] });
        setCustom(''); setError('');
      }}>
        <label className="field">Custom counter<input maxLength={24} value={custom} onChange={event => setCustom(event.target.value)} /></label>
        <button type="submit" className="icon-button" title="Add counter" aria-label="Add counter"><Plus /></button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </> : <div className="damage-list">
      {game.players.filter(source => source.id !== player.id).map(source => <section key={source.id} className="damage-source">
        <h2><span className="color-dot" style={{ backgroundColor: source.color }} />{source.name}</h2>
        {Array.from({ length: source.commanders }, (_, index) => {
          const label = `${source.name} commander ${index + 1} damage`;
          const value = player.damage[`${source.id}:${index}`] ?? 0;
          return <div className="counter-row" key={index}><span className="row-name"><Swords size={16} />{source.commanders === 2 ? `Commander ${index + 1}` : 'Commander'}</span>
            <Stepper label={label} value={value} danger={value >= 21} onChange={delta => dispatch({ type: 'damage', id: player.id, source: source.id, commander: index, delta })} />
          </div>;
        })}
      </section>)}
    </div>}
  </Modal>;
}