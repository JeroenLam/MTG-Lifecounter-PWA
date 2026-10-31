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

test('hidden custom counters remain available without losing their value', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Counters for Player 1', exact: true }).click();
  await page.getByLabel('Custom counter').fill('Charge');
  await page.getByRole('button', { name: 'Add counter' }).click();
  await expect(page.getByRole('status', { name: 'Charge', exact: true })).toHaveText('0');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  for (const count of [0, 1]) {
    await page.getByRole('button', { name: 'Table settings', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Charge', exact: true }).uncheck();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: 'Table settings', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Charge', exact: true }).check();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Counters for Player 1', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Charge', exact: true })).toHaveText(String(count));
    if (count === 0) await page.getByRole('button', { name: 'Increase Charge', exact: true }).click();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
});

test('phone touch taps, holds and cancellation work on rotated panels', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, baseURL: 'http://127.0.0.1:4173' });
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByTestId('board')).toHaveAttribute('data-layout', 'columns');
  await page.getByRole('button', { name: 'Decrease Player 1 life', exact: true }).tap();
  await expect(page.getByTestId('life-player-1')).toHaveText('39');
  const box = (await page.getByRole('button', { name: 'Increase Player 1 life', exact: true }).boundingBox())!;
  const session = await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
  await expect.poll(async () => Number(await page.getByTestId('life-player-1').innerText())).toBeGreaterThan(41);
  await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  const value = await page.getByTestId('life-player-1').innerText();
  await page.getByRole('button', { name: 'Table settings', exact: true }).tap();
  await page.getByRole('button', { name: 'Close', exact: true }).tap();
  await expect(page.getByTestId('life-player-1')).toHaveText(value);
  await context.close();
});

for (const [width, height] of [[390, 844], [844, 390]]) {
  for (const layout of ['rows', 'columns'] as const) {
    test(`crowded counters and settings fit ${width}x${height} ${layout}`, async ({ page }) => {
      const game = createGame(presetSetup('Commander', 6));
      game.layout = layout;
      game.visibleCounters = ['Poison', 'Energy', 'Experience', 'Radiation', 'Tickets', 'Treasure', 'Storm'];
      game.players.forEach((player, index) => {
        player.name = `WWWWWWWWWWWWWWWWWWWWW${index + 1}`;
        player.life = -50;
        player.counters = { Poison: 10, Energy: 12, Experience: 5, Radiation: 4, Tickets: 6, Treasure: 999999, Storm: 6 };
        player.damage = { [`player-${(index + 1) % 6 + 1}:0`]: 21 };
      });
      await page.setViewportSize({ width, height });
      await page.addInitScript(storageSeed, game);
      await page.goto('/');
      const overflow = await page.locator('.counter-summary').evaluateAll(elements => elements.some(element => element.scrollWidth > element.clientWidth));
      expect(overflow).toBe(false);
      const overlapping = await page.locator('[data-player]').evaluateAll(elements => elements.some(element => {
        const total = element.querySelector('.life-total span')!.getBoundingClientRect();
        return [...element.querySelectorAll('.life-zone svg')].some(icon => {
          const bounds = icon.getBoundingClientRect();
          return total.left < bounds.right && total.right > bounds.left && total.top < bounds.bottom && total.bottom > bounds.top;
        });
      }));
      expect(overlapping).toBe(false);
      await page.screenshot({ path: `test-results/counters-${width}-${layout}.png` });
      await page.getByRole('button', { name: 'Table settings', exact: true }).click();
      const dialog = page.getByRole('dialog');
      const bounds = (await dialog.boundingBox())!;
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.y).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
      for (let index = 0; index < 25; index++) {
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(true);
      }
      await page.keyboard.press('Escape');
      await page.locator('.counter-summary').first().click();
      await expect(page.getByRole('status', { name: 'Treasure', exact: true })).toHaveText('999999');
      await page.getByRole('button', { name: 'Decrease Treasure', exact: true }).click();
      await expect(page.getByRole('status', { name: 'Treasure', exact: true })).toHaveText('999998');
      await page.screenshot({ path: `test-results/counter-sheet-${width}-${layout}.png` });
    });
  }
}