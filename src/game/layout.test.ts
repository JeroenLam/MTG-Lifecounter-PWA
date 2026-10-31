import { describe, expect, it } from 'vitest';
import { boardGeometry } from './layout';

describe('seating geometry', () => {
  for (const [width, height] of [[1024, 768], [768, 1024], [1366, 768], [390, 844], [844, 390]]) {
    for (const count of [2, 3, 4, 5, 6]) {
      for (const preference of ['auto', 'rows', 'columns'] as const) {
        it(`fits ${count} players in ${width}x${height}, ${preference}`, () => {
          const board = boardGeometry(width - 24, height - 24, count, preference);
          expect(board.width).toBeLessThanOrEqual(width - 24 + 0.01);
          expect(board.height).toBeLessThanOrEqual(height - 24 + 0.01);
          expect(board.localWidth).toBeGreaterThan(board.localHeight);
          expect(board.slots).toBe(Math.ceil(count / 2));
        });
      }
    }
  }
});