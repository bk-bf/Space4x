import { expect, test, type Locator, type Page } from '@playwright/test';

const clock = (page: Page) => page.locator('#clock');
const win = (page: Page, id: string) => page.locator(`#w-${id}`);
const titleBar = (page: Page, id: string) => win(page, id).locator('.tb');

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

async function dragTo(page: Page, handle: Locator, x: number, y: number) {
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 60, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 90, box.y + box.height / 2 + 20, { steps: 4 });
  await page.mouse.move(x, y, { steps: 8 });
}

async function deskBox(page: Page) {
  return (await page.locator('#desk').boundingBox())!;
}

test('the clock starts paused at the start date and runs and pauses on space', async ({ page }) => {
  await open(page);
  await expect(clock(page)).toHaveText('15 Nov 2026 06:00');
  await expect(page.locator('#bPause')).toHaveClass(/on/);
  await page.waitForTimeout(400);
  await expect(clock(page)).toHaveText('15 Nov 2026 06:00');
  await page.keyboard.press('Space');
  await expect(page.locator('#bPlay')).toHaveClass(/on/);
  await expect(clock(page)).not.toHaveText('15 Nov 2026 06:00', { timeout: 3000 });
  await page.keyboard.press('Space');
  await expect(page.locator('#bPause')).toHaveClass(/on/);
  const stopped = await clock(page).textContent();
  await page.waitForTimeout(500);
  await expect(clock(page)).toHaveText(stopped!);
});

test('the run and pause buttons start and stop the clock', async ({ page }) => {
  await open(page);
  await page.locator('[data-step="3600"]').click();
  await expect(clock(page)).toHaveText('15 Nov 2026 07:00');
  await page.locator('#bPlay').click();
  await expect(clock(page)).not.toHaveText('15 Nov 2026 07:00', { timeout: 3000 });
  await page.locator('#bPause').click();
  const stopped = await clock(page).textContent();
  await page.waitForTimeout(500);
  await expect(clock(page)).toHaveText(stopped!);
});

test('picking a step while paused advances by exactly that step once', async ({ page }) => {
  await open(page);
  await page.locator('#steps button', { hasText: '5d' }).click();
  await expect(clock(page)).toHaveText('20 Nov 2026 06:00');
  await expect(page.locator('#steps button', { hasText: '5d' })).toHaveClass(/on/);
  await page.locator('#steps button', { hasText: '20m' }).click();
  await expect(clock(page)).toHaveText('20 Nov 2026 06:20');
  await expect(page.locator('#steps button.on')).toHaveCount(1);
  await expect(page.locator('#steps button')).toHaveCount(11);
});

test('screen buttons and F keys switch whole screens', async ({ page }) => {
  await open(page);
  await page.locator('[data-nav="economy"]').click();
  await expect(page.locator('#stage > [data-screen="economy"]')).toBeVisible();
  await expect(page.locator('#desk')).toBeHidden();
  await page.keyboard.press('F9');
  await expect(page.locator('#stage > [data-screen="galaxy"]')).toBeVisible();
  await expect(page.locator('[data-nav="galaxy"]')).toHaveClass(/on/);
  await page.keyboard.press('F1');
  await expect(page.locator('#desk')).toBeVisible();
  await expect(page.locator('#stage > [data-screen="galaxy"]')).toHaveCount(0);
  await expectCleanLayout(page);
});

test('a docked window drags off its dock, floats, and re-docks at an edge with the snap highlight', async ({
  page
}) => {
  await open(page);
  const d = await deskBox(page);
  await dragTo(page, titleBar(page, 'side'), d.x + d.width / 2, d.y + 200);
  await expect(page.locator('#desk')).not.toHaveAttribute('data-snap', /./);
  await page.mouse.up();
  await expect(win(page, 'side')).toHaveAttribute('data-dock', '');
  const floating = (await win(page, 'side').boundingBox())!;
  expect(floating.x).toBeGreaterThan(d.x + 300);
  await expectCleanLayout(page);

  await dragTo(page, titleBar(page, 'side'), d.x + d.width - 10, d.y + 300);
  await expect(page.locator('#desk')).toHaveAttribute('data-snap', 'right');
  await page.mouse.up();
  await expect(page.locator('#desk')).not.toHaveAttribute('data-snap', /./);
  await expect(win(page, 'side')).toHaveAttribute('data-dock', 'right');
  await expectCleanLayout(page);

  await dragTo(page, titleBar(page, 'events'), d.x + 10, d.y + 300);
  await expect(page.locator('#desk')).toHaveAttribute('data-snap', 'left');
  await page.mouse.up();
  await expect(win(page, 'events')).toHaveAttribute('data-dock', 'left');
  await expectCleanLayout(page);
});

test('minimise, close, dock toggle and z-order work on windows', async ({ page }) => {
  await open(page);
  await win(page, 'events').locator('[data-wm="min"]').click();
  await expect(win(page, 'events')).toHaveClass(/min/);
  await expect(win(page, 'events').locator('.wb')).toBeHidden();
  await expectCleanLayout(page);
  await win(page, 'events').locator('[data-wm="min"]').click();
  await expect(win(page, 'events')).not.toHaveClass(/min/);

  await win(page, 'side').locator('[data-wm="min"]').click();
  await expect(win(page, 'side')).toHaveClass(/min/);
  await win(page, 'side').locator('[data-wm="min"]').click();

  await win(page, 'sel').locator('[data-wm="close"]').click();
  await expect(win(page, 'sel')).toBeHidden();
  await expectCleanLayout(page);

  await win(page, 'side').locator('[data-wm="dock"]').click();
  await expect(win(page, 'side')).toHaveAttribute('data-dock', '');
  await win(page, 'events').locator('[data-wm="dock"]').click();
  await expect(win(page, 'events')).toHaveAttribute('data-dock', '');
  const z = (id: string) => win(page, id).evaluate((el) => Number(getComputedStyle(el).zIndex));
  await titleBar(page, 'side').click({ position: { x: 60, y: 10 } });
  expect(await z('side')).toBeGreaterThan(await z('events'));
  await titleBar(page, 'events').click({ position: { x: 60, y: 10 } });
  expect(await z('events')).toBeGreaterThan(await z('side'));
  await expectCleanLayout(page);

  await win(page, 'side').locator('[data-wm="dock"]').click();
  await expect(win(page, 'side')).toHaveAttribute('data-dock', 'left');
});

test('the Panels popup switches arrangement, shows and hides panels, and resets', async ({ page }) => {
  await open(page);
  const settings = win(page, 'settings');
  await expect(settings).toBeHidden();
  await page.locator('#bSet').click();
  await expect(settings).toBeVisible();

  await settings.locator('[data-set="float"]').click();
  for (const id of ['side', 'sel', 'events']) await expect(win(page, id)).toHaveAttribute('data-dock', '');
  await expect(settings.locator('[data-set="float"]')).toHaveClass(/on/);
  await expectCleanLayout(page);

  await settings.locator('[data-set="dock"]').click();
  await expect(win(page, 'side')).toHaveAttribute('data-dock', 'left');
  await expect(win(page, 'sel')).toHaveAttribute('data-dock', 'right');
  await expect(win(page, 'events')).toHaveAttribute('data-dock', 'bottom');

  await settings.locator('[data-panel="events"]').click();
  await expect(win(page, 'events')).toBeHidden();
  await expect(settings.locator('[data-panel="events"]')).not.toHaveClass(/on/);
  await expectCleanLayout(page);
  await settings.locator('[data-panel="events"]').click();
  await expect(win(page, 'events')).toBeVisible();

  await win(page, 'sel').locator('[data-wm="close"]').click();
  await win(page, 'side').locator('[data-wm="min"]').click();
  await settings.locator('[data-set="reset"]').click();
  await expect(win(page, 'sel')).toBeVisible();
  await expect(win(page, 'side')).not.toHaveClass(/min/);
  await expect(settings).toBeVisible();
  await expectCleanLayout(page);

  await page.locator('[data-nav="research"]').click();
  await page.locator('#bSet').click();
  await expect(page.locator('#desk')).toBeVisible();
});

test('clicking a map label or a list row selects it into the one Selection panel', async ({ page }) => {
  await open(page);
  await page.locator('#mapLabels span', { hasText: 'Mars' }).click();
  await expect(titleBar(page, 'sel')).toContainText('Mars');
  await expect(win(page, 'sel').locator('dl').first()).toContainText('Thin CO2');
  await win(page, 'side').locator('[data-tab="bodies"]').click();
  await win(page, 'side').locator('tr', { hasText: 'Jupiter' }).click();
  await expect(titleBar(page, 'sel')).toContainText('Jupiter');
  await expectCleanLayout(page);
});

test('the wheel zooms the map smoothly and Reset flies back to the whole system', async ({ page }) => {
  await open(page);
  await win(page, 'side').locator('[data-tab="display"]').click();
  const mpp = async () => Number(await page.locator('#zoomNow').getAttribute('data-mpp'));
  const start = await mpp();
  await expect(page.locator('#tiers .on')).toHaveText('Far');
  const d = await deskBox(page);
  await page.mouse.move(d.x + d.width / 2, d.y + d.height / 3);
  for (let i = 0; i < 3; i++) await page.mouse.wheel(0, -100);
  await expect.poll(mpp).toBeLessThan(start / 1.5);
  await win(page, 'side').locator('[data-zoom="0"]').click();
  await expect.poll(mpp, { timeout: 6000 }).toBeCloseTo(start, -6);
  await expectCleanLayout(page);
});
