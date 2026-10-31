import { expect, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

for (const base of ['http://127.0.0.1:4173/', 'http://127.0.0.1:4174/mtg_lifecounter_pwa/']) {
  test(`production install assets and offline restoration at ${base}`, async ({ page, context }) => {
    const failures: string[] = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    await page.goto(base);
    await page.getByRole('button', { name: 'Decrease Player 1 life', exact: true }).click();
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifestResponse = await page.request.get(new URL(manifestLink!, base).href);
    expect(manifestResponse.ok()).toBe(true);
    const manifest = await manifestResponse.json();
    expect(manifest.display).toBe('standalone');
    expect(new URL(manifest.start_url, base).href).toBe(base);
    expect(new URL(manifest.scope, base).href).toBe(base);
    for (const icon of manifest.icons) {
      const response = await page.request.get(new URL(icon.src, base).href);
      expect(response.ok()).toBe(true);
      expect(response.headers()['content-type']).toContain('image/png');
      expect((await response.body()).length).toBeGreaterThan(100);
    }
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    expect(failures).toEqual([]);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('life-player-1')).toHaveText('39');
    await page.getByRole('button', { name: 'Increase Player 1 life', exact: true }).click();
    await expect(page.getByTestId('life-player-1')).toHaveText('40');
    await page.getByRole('button', { name: 'Table settings', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(failures).toEqual([]);
  });
}

for (const blocked of [false, true]) {
  test(`updates are user-controlled with ${blocked ? 'blocked' : 'working'} storage`, async ({ page }) => {
    await page.goto('http://127.0.0.1:4174/mtg_lifecounter_pwa/');
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.getByRole('button', { name: 'Decrease Player 1 life', exact: true }).click();
    if (blocked) await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
    let navigations = 0;
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    await page.request.post('http://127.0.0.1:4174/__test__/update');
    await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())!.update(); });
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting));
    await expect(page.getByRole('button', { name: 'Update available', exact: true })).toBeVisible();
    expect(navigations).toBe(0);
    await expect(page.getByTestId('life-player-1')).toHaveText('39');
    await page.getByRole('button', { name: 'Update available', exact: true }).click();
    await page.getByRole('button', { name: 'Apply update', exact: true }).click();
    if (blocked) {
      await expect(page.getByText('Session not saved', { exact: true })).toBeVisible();
      expect(navigations).toBe(0);
      expect(await page.evaluate(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))).toBe(true);
    } else {
      await expect.poll(() => navigations).toBe(1);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    await expect(page.getByTestId('life-player-1')).toHaveText('39');
  });
}