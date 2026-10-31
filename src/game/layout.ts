import type { Layout } from './state';

export const railSize = 56;
export const tileGap = 4;
export function boardGeometry(width: number, height: number, count: number, preference: Layout) {
  const rows = preference === 'rows' || (preference === 'auto' && width >= height);
  const slots = Math.ceil(count / 2);
  const localWidth = Math.max(1, rows
    ? Math.min((width - tileGap * (slots - 1)) / slots, (height - railSize) / 2 * 1.35)
    : Math.min((height - tileGap * (slots - 1)) / slots, (width - railSize) / 2 * 1.35));
  const localHeight = localWidth / 1.35;
  return {
    rows, slots, localWidth, localHeight,
    width: rows ? localWidth * slots + tileGap * (slots - 1) : localHeight * 2 + railSize,
    height: rows ? localHeight * 2 + railSize : localWidth * slots + tileGap * (slots - 1),
  };
}