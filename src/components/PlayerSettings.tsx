import { Check, Save } from 'lucide-react';
import { useState, type Dispatch } from 'react';
import { colors, type Action, type Game, type Player } from '../game/state';
import { Modal } from './Modal';

const colorLabels = ['Jade', 'Coral', 'Sky', 'Gold', 'Lilac', 'Fern'];
export function PlayerSettings({ player, game, dispatch, onClose }: { player: Player; game: Game; dispatch: Dispatch<Action>; onClose: () => void }) {
  const [name, setName] = useState(player.name);
  const [color, setColor] = useState(player.color);
  const [commanders, setCommanders] = useState(player.commanders);
  const hasPartnerDamage = game.players.some(defender => (defender.damage[`${player.id}:1`] ?? 0) > 0);

  return <Modal title={player.name} eyebrow="Player" onClose={onClose}>
    <form onSubmit={event => {
      event.preventDefault();
      dispatch({ type: 'player', id: player.id, name, color, commanders });
      onClose();
    }}>
      <label className="field">Name<input autoComplete="off" maxLength={24} value={name} onChange={event => setName(event.target.value)} /></label>
      <fieldset><legend>Background</legend><div className="swatches">
        {colors.map((value, index) => <button key={value} type="button" className="swatch" style={{ backgroundColor: value }} aria-label={colorLabels[index]} title={colorLabels[index]} aria-pressed={color === value} onClick={() => setColor(value)}>{color === value && <Check />}</button>)}
      </div></fieldset>
      {game.setup.commander && <fieldset><legend>Commanders</legend><div className="segmented">
        <button type="button" aria-pressed={commanders === 1} disabled={hasPartnerDamage} onClick={() => setCommanders(1)}>Single</button>
        <button type="button" aria-pressed={commanders === 2} onClick={() => setCommanders(2)}>Partners</button>
      </div></fieldset>}
      <button type="submit" className="command primary full"><Save size={18} />Save player</button>
    </form>
  </Modal>;
}