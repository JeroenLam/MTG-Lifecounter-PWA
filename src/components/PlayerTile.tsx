import { Flag, Minus, Pencil, Plus, Skull, Swords, TriangleAlert, Zap, CircleEllipsis } from 'lucide-react';
import type { CSSProperties, Dispatch } from 'react';
import { isAtThreshold, type Action, type Player } from '../game/state';
import { HoldButton } from './HoldButton';

interface Props {
  player: Player;
  starter: boolean;
  commander: boolean;
  visibleCounters: string[];
  rotation: number;
  width: number;
  height: number;
  dispatch: Dispatch<Action>;
  onEdit: () => void;
  onCounters: () => void;
}

export function PlayerTile({ player, starter, commander, visibleCounters, rotation, width, height, dispatch, onEdit, onCounters }: Props) {
  const active = Object.entries(player.counters).filter(([name, value]) => value > 0 && visibleCounters.includes(name));
  const damage = Object.values(player.damage).reduce((total, value) => total + value, 0);
  const threshold = isAtThreshold(player, commander);
  const shownCounters = Math.max(0, Math.min(3, Math.floor((width * 0.9 - 40 - (commander && damage > 0 ? 45 : 0)) / 45)));
  const digits = Math.max(2, String(player.life).length);
  const font = Math.min(150, height * 0.55, Math.max(18, width - 56) / (digits * 0.68));
  const style = {
    width, height,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    '--life-size': `${font}px`,
    '--tile-header': `${Math.min(40, height * 0.23)}px`,
    '--tile-footer': `${Math.min(36, height * 0.23)}px`,
    '--name-size': `${height < 120 ? 10 : 13}px`,
  } as CSSProperties;

  return <section className="player-surface" style={style} data-player={player.id} data-rotation={rotation} aria-label={player.name}>
    <button className="player-name" title={`Edit ${player.name}`} aria-label={`Edit ${player.name}`} onClick={onEdit}>
      {starter && <Flag size={14} fill="currentColor" aria-label="Starting player" />}
      {threshold && <TriangleAlert size={12} className="threshold" aria-label="Loss threshold reached" />}
      <span>{player.name}</span><Pencil size={12} className="edit-mark" />
    </button>
    <div className="life-controls">
      <HoldButton className="life-zone decrease" aria-label={`Decrease ${player.name} life`} title="Decrease life" onStep={() => dispatch({ type: 'life', id: player.id, delta: -1 })}><Minus /></HoldButton>
      <HoldButton className="life-zone increase" aria-label={`Increase ${player.name} life`} title="Increase life" onStep={() => dispatch({ type: 'life', id: player.id, delta: 1 })}><Plus /></HoldButton>
    </div>
    <div className={`life-total${threshold ? ' threshold' : ''}`} data-testid={`life-${player.id}`} role="status" aria-label={`${player.name} life${threshold ? ', loss threshold reached' : ''}`} aria-live="polite" aria-atomic="true">
      <span>{player.life}</span>
    </div>
    <button className="counter-summary" title={`Counters for ${player.name}`} aria-label={`Counters for ${player.name}`} onClick={onCounters}>
      {active.slice(0, shownCounters).map(([name, value]) => <span key={name} title={name}>
        {name === 'Poison' ? <Skull size={14} /> : name === 'Energy' ? <Zap size={14} /> : <span className="counter-initial">{name.slice(0, 1)}</span>}{value > 999 ? '999+' : value}
      </span>)}
      {commander && damage > 0 && <span title="Commander damage"><Swords size={14} />{damage > 999 ? '999+' : damage}</span>}
      {active.length > shownCounters && <span>+{active.length - shownCounters}</span>}
      <CircleEllipsis size={18} className="counter-open" />
    </button>
  </section>;
}