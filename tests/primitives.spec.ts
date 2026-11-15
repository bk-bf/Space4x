import { expect, test } from '@playwright/test';

test('the shared primitives lay out without gaps and canvases fill their frames', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/primitives');
  await expect(page.locator('#galleryCv')).toBeAttached();
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
  const lit = await page.locator('#galleryCv').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! > 150) n++;
    return n;
  });
  expect(lit).toBeGreaterThan(100);
  await page.locator('tr.pick', { hasText: 'Alpha' }).click();
  await expect(page.locator('tr.pick.on')).toHaveText(/Alpha/);
  await page.locator('[data-tab="two"]').click();
  await expect(page.locator('dd').first()).toHaveText('two');
  expect(errors).toEqual([]);
});
