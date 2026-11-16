import { expect, test, type Page } from '@playwright/test';

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

const insideWindow = async (page: Page) => {
  const tip = page.locator('#ui-tip');
  await expect(tip).toBeVisible();
  const box = (await tip.boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(view.width);
  expect(box.y + box.height).toBeLessThanOrEqual(view.height);
};

test('the tile gallery passes the layout check on every tab', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/tiles');
  await expect(page.locator('[data-screen="tiles"]')).toBeAttached();
  await page.waitForTimeout(300);
  for (const tab of ['materials', 'buildings', 'components']) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check']), tab).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('every icon of the set is drawn and pixelated', async ({ page }) => {
  await page.goto('/dev/tiles');
  await expect(page.locator('[data-screen="tiles"]')).toBeAttached();
  const count = async () => page.locator('section.pan').first().locator('.ui-art img.ui-px').count();
  await expect.poll(count).toBe(163);
  await page.locator('[data-tab="buildings"]').click();
  await expect.poll(count).toBe(47);
  await page.locator('[data-tab="components"]').click();
  await expect.poll(count).toBe(28);
  const broken = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLImageElement>('img.ui-px')].filter(
        (i) => !i.complete || !i.naturalWidth
      ).length
  );
  expect(broken).toBe(0);
  expect(
    await page
      .locator('img.ui-px')
      .first()
      .evaluate((i) => getComputedStyle(i).imageRendering)
  ).toBe('pixelated');
});

test('a tile selects by click and by keyboard', async ({ page }) => {
  await page.goto('/dev/tiles');
  await expect(page.locator('#picked')).toHaveText('Picked: Iron');
  const tile = (name: string) => page.locator('button.ui-tile', { hasText: name });
  await expect(tile('Iron')).toHaveAttribute('aria-pressed', 'true');
  await tile('Copper').click();
  await expect(page.locator('#picked')).toHaveText('Picked: Copper');
  await expect(tile('Copper')).toHaveAttribute('aria-pressed', 'true');
  await expect(tile('Iron')).toHaveAttribute('aria-pressed', 'false');
  await tile('Liquid oxygen').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#picked')).toHaveText('Picked: Liquid oxygen');
  await tile('Compute').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#picked')).toHaveText('Picked: Compute');
  await page.locator('[data-filter="metal"]').click();
  await expect(page.locator('#filtered')).toHaveText('Filter: metal');
  await expect(page.locator('[data-filter="metal"]')).toHaveClass(/on/);
});

test('a tooltip names the thing, its category and a dimmed description', async ({ page }) => {
  await page.goto('/dev/tiles');
  const tile = page.locator('button.ui-tile', { hasText: 'Copper' });
  await tile.hover();
  const tip = page.locator('#ui-tip');
  await expect(tip.locator('b')).toHaveText('Copper');
  await expect(tip.locator('.l').first()).toHaveText('Metals and alloys');
  await expect(tip.locator('.l.d')).toHaveCount(1);
  expect(await tip.locator('.l.d').innerText()).not.toBe('');
  await insideWindow(page);
  await page.mouse.move(2, 2);
  await expect(tip).toBeHidden();
});

test('a tooltip also opens on keyboard focus and closes on Escape', async ({ page }) => {
  await page.goto('/dev/tiles');
  const tile = page.locator('button.ui-tile', { hasText: 'Copper' });
  await tile.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(tile).toBeFocused();
  await expect(page.locator('#ui-tip b')).toHaveText('Copper');
  await insideWindow(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('#ui-tip')).toBeHidden();
});

test('a tooltip stays inside the window at the right and bottom edges', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 520 });
  await page.goto('/dev/tiles');
  await page.waitForTimeout(300);
  const edge = page.locator('#edgeTip .ui-tile');
  await edge.scrollIntoViewIfNeeded();
  const box = (await edge.boundingBox())!;
  for (const [x, y] of [
    [box.x + box.width - 2, box.y + box.height - 2],
    [box.x + 2, box.y + box.height - 2],
    [box.x + box.width - 2, box.y + 2]
  ] as const) {
    await page.mouse.move(2, 2);
    await page.mouse.move(x, y);
    await insideWindow(page);
  }
  const first = page.locator('.ui-art img.ui-px').first();
  await page.locator('[data-tab="materials"]').scrollIntoViewIfNeeded();
  await first.hover();
  await insideWindow(page);
});

test('the portrait catalogue lays out cleanly, draws every option and switches style', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/dev/portraits');
  await expect(page.locator('[data-screen="portraits"]')).toBeAttached({ timeout: 20_000 });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
  const sections = page.locator('h3[data-section]');
  await expect(sections).toHaveText([
    'Hair, men 15',
    'Hair, women 13',
    'Beards 12',
    'Eyes 12',
    'Brows 10',
    'Mouths 16',
    'Gear 6'
  ]);
  const faces = page.locator('img.ui-px.portrait.bust');
  await expect(faces).toHaveCount(84);
  const broken = await faces.evaluateAll(
    (imgs) =>
      imgs.filter((i) => !(i as HTMLImageElement).complete || (i as HTMLImageElement).naturalWidth !== 64)
        .length
  );
  expect(broken).toBe(0);
  expect(await faces.first().evaluate((i) => getComputedStyle(i).imageRendering)).toBe('pixelated');
  await expect(page.locator('[data-filter="gritty"]')).toHaveClass(/on/);
  const gritty = await faces.first().getAttribute('src');
  await page.locator('[data-filter="clean"]').click();
  await expect(page.locator('[data-filter="clean"]')).toHaveClass(/on/);
  await expect.poll(() => faces.first().getAttribute('src')).not.toBe(gritty);
  await page.locator('[data-filter="gritty"]').click();
  await expect.poll(() => faces.first().getAttribute('src')).toBe(gritty);
  expect(errors).toEqual([]);
});
