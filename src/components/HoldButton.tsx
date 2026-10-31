import { useEffect, useRef, type ButtonHTMLAttributes } from 'react';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onStep: () => void;
}

export function HoldButton({ onStep, ...props }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const repeat = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const repeated = useRef(false);
  const pointer = useRef<number | null>(null);
  const step = useRef(onStep);

  useEffect(() => { step.current = onStep; }, [onStep]);

  useEffect(() => {
    if (props.disabled) {
      clearTimeout(timer.current);
      clearInterval(repeat.current);
      pointer.current = null;
      repeated.current = true;
    }
  }, [props.disabled]);

  function stop() {
    clearTimeout(timer.current);
    clearInterval(repeat.current);
    pointer.current = null;
  }

  useEffect(() => {
    const cancel = () => {
      clearTimeout(timer.current);
      clearInterval(repeat.current);
      pointer.current = null;
      repeated.current = true;
    };
    const hidden = () => { if (document.hidden) cancel(); };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      cancel();
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, []);

  return <button
    {...props}
    type="button"
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      if (event.button !== 0 || event.isPrimary === false || pointer.current !== null) return;
      repeated.current = false;
      pointer.current = event.pointerId;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      timer.current = setTimeout(() => {
        repeated.current = true;
        step.current();
        repeat.current = setInterval(() => step.current(), 110);
      }, 380);
    }}
    onPointerUp={event => { if (event.pointerId === pointer.current) stop(); }}
    onPointerCancel={() => { repeated.current = true; stop(); }}
    onPointerLeave={() => { if (pointer.current !== null) { repeated.current = true; stop(); } }}
    onPointerMove={event => {
      if (pointer.current !== event.pointerId) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
        repeated.current = true;
        stop();
      }
    }}
    onLostPointerCapture={() => stop()}
    onBlur={() => { repeated.current = true; stop(); }}
    onClick={event => {
      if (event.detail === 0 || !repeated.current) step.current();
      repeated.current = false;
    }}
  />;
}