import { render, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createGame } from '../game/state';
import { PlayerTile } from './PlayerTile';

afterEach(() => vi.useRealTimers());
function mount() {
  const dispatch = vi.fn();
  const onEdit = vi.fn();
  const onCounters = vi.fn();
  render(<PlayerTile player={createGame().players[0]} starter={false} commander visibleCounters={['Poison', 'Energy']} rotation={90} width={300} height={220} dispatch={dispatch} onEdit={onEdit} onCounters={onCounters} />);
  return { dispatch, onEdit, onCounters };
}
describe('player interactions', () => {
  it('changes local left/right by one and accepts keyboard clicks', () => {
    const { dispatch } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Decrease Player 1 life' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Player 1 life' }));
    expect(dispatch.mock.calls.map(([action]) => action.delta)).toEqual([-1, 1]);
  });
  it('keeps nested edit/counter actions separate', () => {
    const { dispatch, onEdit, onCounters } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Edit Player 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Counters for Player 1' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onCounters).toHaveBeenCalledOnce();
  });
  it('repeats a hold and stops on release without an extra click', () => {
    vi.useFakeTimers();
    const { dispatch } = mount();
    const button = screen.getByRole('button', { name: 'Increase Player 1 life' });
    fireEvent.pointerDown(button, { button: 0, pointerId: 1, isPrimary: true });
    vi.advanceTimersByTime(610);
    expect(dispatch).toHaveBeenCalledTimes(3);
    fireEvent.pointerUp(button, { pointerId: 1 });
    fireEvent.click(button, { detail: 1 });
    vi.advanceTimersByTime(1000);
    expect(dispatch).toHaveBeenCalledTimes(3);
  });
  for (const cancel of ['cancel', 'leave', 'blur']) {
    it(`stops on ${cancel}`, () => {
      vi.useFakeTimers();
      const { dispatch } = mount();
      const button = screen.getByRole('button', { name: 'Increase Player 1 life' });
      fireEvent.pointerDown(button, { button: 0, pointerId: 1, isPrimary: true });
      vi.advanceTimersByTime(390);
      if (cancel === 'cancel') fireEvent.pointerCancel(button);
      if (cancel === 'leave') fireEvent.pointerLeave(button);
      if (cancel === 'blur') fireEvent(window, new Event('blur'));
      const calls = dispatch.mock.calls.length;
      vi.advanceTimersByTime(1000);
      expect(dispatch).toHaveBeenCalledTimes(calls);
    });
  }
});