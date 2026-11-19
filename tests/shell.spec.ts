import { expect, test, type Page } from '@playwright/test';

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

test('space on a focused table row selects the row without starting the clock', async ({ page }) => {
  await open(page);
  await page.locator('#w-side .tabs2 button', { hasText: 'Bodies' }).click();
  const row = page.locator('#w-side tr.pick').first();
  await row.focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#bPause')).toHaveClass(/on/);
});

test('F keys with a modifier are left to the browser', async ({ page }) => {
  await open(page);
  await page.keyboard.press('Shift+F2');
  await expect(page.locator('#desk')).toBeVisible();
  await page.keyboard.press('F2');
  await expect(page.locator('[data-screen="economy"]')).toBeVisible();
});

test('a scrolled docked window keeps its scroll position while the clock runs', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 520 });
  await open(page);
  const body = page.locator('#w-side .wb');
  const room = await body.evaluate((el) => el.scrollHeight - el.clientHeight);
  test.skip(room < 10, 'the System window does not scroll at this size');
  await body.evaluate((el) => (el.scrollTop = 10));
  await page.locator('#bPlay').click();
  await page.waitForTimeout(1200);
  expect(await body.evaluate((el) => el.scrollTop)).toBe(10);
});

test('a reload keeps the window layout, and Reset brings the default back', async ({ page }) => {
  await open(page);
  await page.locator('#w-events [data-wm="min"]').click();
  await page.locator('#w-side [data-wm="close"]').click();
  await page.locator('#w-sel [data-wm="dock"]').click();
  const floated = await page.locator('#w-sel').boundingBox();
  await page.reload();
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await expect(page.locator('#w-events')).toHaveClass(/min/);
  await expect(page.locator('#w-side')).toBeHidden();
  await expect(page.locator('#w-sel')).toHaveAttribute('data-dock', '');
  const kept = await page.locator('#w-sel').boundingBox();
  expect(Math.abs(kept!.x - floated!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(kept!.y - floated!.y)).toBeLessThanOrEqual(1);
  await page.locator('#bSet').click();
  await page.locator('#menuPanels').click();
  await page.locator('#w-settings [data-set="reset"]').click();
  await page.reload();
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await expect(page.locator('#w-side')).toBeVisible();
  await expect(page.locator('#w-events')).not.toHaveClass(/min/);
  await expect(page.locator('#w-sel')).toHaveAttribute('data-dock', 'right');
});
