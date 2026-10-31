import { expect, test, type Page } from '@playwright/test';
import { createGame, presetSetup, storageSeed } from './fixtures';

async function seed(page: Page, count: number, layout: 'auto' | 'rows' | 'columns' = 'auto') {
  await page.addInitScript(storageSeed, { ...createGame(presetSetup('Commander', count)), layout });
}

for (const [width, height] of [[1024, 768], [768, 1024], [1366, 768], [390, 844], [844, 390]]) {
  for (const count of [2, 3, 4, 5, 6]) {
    for (const layout of ['rows', 'columns'] as const) {
      test(`${count} players ${width}x${height} ${layout}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await seed(page, count, layout);
        await page.goto('/');
        await expect(page.locator('[data-player]')).toHaveCount(count);
        const board = page.getByTestId('board');
        await expect(board).toHaveAttribute('data-layout', layout);
        const measurements = await page.locator('[data-player]').evaluateAll(elements => elements.map(element => {
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, localWidth: parseFloat(style.width), localHeight: parseFloat(style.height), rotation: element.getAttribute('data-rotation') };
        }));
        for (const [index, box] of measurements.entries()) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.y).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(width + 0.1);
          expect(box.bottom).toBeLessThanOrEqual(height + 0.1);
          expect(box.localWidth).toBeGreaterThan(box.localHeight);
          expect(box.rotation).toBe(String(layout === 'rows' ? (index < Math.ceil(count / 2) ? 180 : 0) : (index < Math.ceil(count / 2) ? 90 : 270)));
        }
        for (let index = 1; index <= count; index++) {
          await page.getByRole('button', { name: `Decrease Player ${index} life`, exact: true }).click();
          await expect(page.getByTestId(`life-player-${index}`)).toHaveText('39');
          await page.getByRole('button', { name: `Increase Player ${index} life`, exact: true }).click();
          await expect(page.getByTestId(`life-player-${index}`)).toHaveText('40');
        }
        await page.getByRole('button', { name: 'Table settings', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.getByRole('button', { name: 'Rotate grid' }).click();
        await page.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(board).toHaveAttribute('data-layout', layout === 'rows' ? 'columns' : 'rows');
        if (count === 4 || (count === 6 && width === 390)) await page.screenshot({ path: `test-results/board-${width}-${height}-${count}-${layout}.png` });
      });
    }
  }
}

test('names, colors, counters, partners, undo and refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit Player 2' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Atraxa and Friends');
  await page.getByRole('button', { name: 'Sky', exact: true }).click();
  await page.getByRole('button', { name: 'Partners', exact: true }).click();
  await page.getByRole('button', { name: 'Save player' }).click();
  await expect(page.locator('[data-player="player-2"]')).toContainText('Atraxa and Friends');
  await page.getByRole('button', { name: 'Counters for Player 1' }).click();
  await page.getByRole('button', { name: 'Increase Poison', exact: true }).click();
  await page.getByRole('button', { name: 'Increase Energy', exact: true }).click();
  await page.getByLabel('Custom counter').fill('Treasure');
  await page.getByRole('button', { name: 'Add counter' }).click();
  await page.getByRole('button', { name: 'Increase Treasure', exact: true }).click();
  await page.getByRole('tab', { name: 'Commander', exact: true }).click();
  await page.getByRole('button', { name: 'Increase Atraxa and Friends commander 2 damage', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByTestId('life-player-1')).toHaveText('39');
  await page.reload();
  await expect(page.getByTestId('life-player-1')).toHaveText('39');
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect(page.getByTestId('life-player-1')).toHaveText('40');
  await page.getByRole('button', { name: 'Counters for Player 1' }).click();
  await expect(page.getByRole('status', { name: 'Poison', exact: true })).toHaveText('1');
  await expect(page.getByRole('status', { name: 'Treasure', exact: true })).toHaveText('1');
});

test('central presets, starter, confirmed reset and accessible dialog', async ({ page }) => {
  await page.goto('/');
  const settings = page.getByRole('button', { name: 'Table settings', exact: true });
  await settings.click();
  await page.getByRole('button', { name: 'Select starting player', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByLabel('Starting player')).toHaveCount(1);
  await expect(settings).toBeFocused();
  await settings.click();
  await page.getByRole('button', { name: '1v1', exact: true }).click();
  await page.getByRole('button', { name: 'Apply & start new game' }).click();
  await expect(page.locator('[data-player]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Reset game', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('[data-player]')).toHaveCount(2);
  await expect(page.getByTestId('life-player-1')).toHaveText('20');
  await expect(page.getByLabel('Starting player')).toHaveCount(0);
});

test('a real pointer hold has no extra release click', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Increase Player 1 life', exact: true });
  const box = (await button.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect.poll(async () => Number(await page.getByTestId('life-player-1').innerText())).toBeGreaterThan(42);
  await page.mouse.up();
  const value = await page.getByTestId('life-player-1').innerText();
  await expect.poll(async () => page.getByTestId('life-player-1').innerText()).toBe(value);
  await page.getByRole('button', { name: 'Table settings', exact: true }).click();
  await expect(page.getByTestId('life-player-1')).toHaveText(value);
});

test('orientation adapts and long names fit', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page, 6);
  await page.goto('/');
  await expect(page.getByTestId('board')).toHaveAttribute('data-layout', 'columns');
  await page.getByRole('button', { name: 'Edit Player 1', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('WWWWWWWWWWWWWWWWWWWWWWWW');
  await page.getByRole('button', { name: 'Save player' }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByTestId('board')).toHaveAttribute('data-layout', 'rows');
  const bounds = await page.locator('[data-player="player-1"] .player-name').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: 'test-results/long-name-phone.png' });
});