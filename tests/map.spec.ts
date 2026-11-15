import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS;
const win = (page: Page, id: string) => page.locator(`#w-${id}`);
const heading = (page: Page) => win(page, 'sel').locator('.tb span').first();
const label = (page: Page, text: string) =>
  page.locator('#mapLabels span').filter({ hasText: new RegExp(`^${text}( ×\\d+)?$`) });
const zoomNow = (page: Page) => page.locator('#zoomNow');
const mpp = async (page: Page) => Number(await zoomNow(page).getAttribute('data-mpp'));
const camFocus = (page: Page) => page.locator('#mapCam dd').first();

async function settled(page: Page): Promise<number> {
  await expect
    .poll(
      async () => {
        const at = async () => `${await mpp(page)} ${await page.locator('#mapCam').textContent()}`;
        const a = await at();
        await page.waitForTimeout(250);
        return a === (await at());
      },
      { timeout: 10_000 }
    )
    .toBe(true);
  return mpp(page);
}
const step = (page: Page, text: string) =>
  page.locator('#steps button', { hasText: new RegExp(`^${text}$`) });

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

async function shoot(page: Page, name: string) {
  if (!SHOTS) return;
  mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

function countColour(page: Page, rgb: readonly [number, number, number]): Promise<number> {
  return page.evaluate((c) => {
    const cv = document.querySelector<HTMLCanvasElement>('#mapCv')!;
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] === c[0] && d[i + 1] === c[1] && d[i + 2] === c[2]) n++;
    return n;
  }, rgb);
}

async function centreOf(page: Page, text: string) {
  await expect(label(page, text)).toBeVisible();
  const b = (await label(page, text).boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

async function freeCentre(page: Page) {
  const desk = (await page.locator('#desk').boundingBox())!,
    side = (await win(page, 'side').boundingBox())!,
    sel = (await win(page, 'sel').boundingBox())!,
    ev = (await win(page, 'events').boundingBox())!;
  return { x: (side.x + side.width + sel.x) / 2, y: (desk.y + ev.y) / 2 };
}

test('the system panel lists the bodies of Sol and shows no fleets or contacts', async ({ page }) => {
  await open(page);
  await expect(page.locator('#sysSel option')).toHaveText(['Sol']);
  await expect(page.locator('#noFleets')).toBeVisible();
  await expect(label(page, 'Jump point A, unsurveyed')).toBeVisible();
  await win(page, 'side').locator('[data-tab="bodies"]').click();
  await expect(win(page, 'side').locator('table')).toContainText('Jupiter');
  await expect(win(page, 'side').locator('table')).toContainText('Earth');
  await win(page, 'side').locator('[data-tab="contacts"]').click();
  await expect(page.locator('#noContacts')).toBeVisible();
  await expectCleanLayout(page);
});
test('the display toggles change what the map draws and the zoom buttons zoom', async ({ page }) => {
  await open(page, 'sel=body:earth&zoom=2e9');
  await win(page, 'side').locator('[data-tab="display"]').click();
  const layers: [string, [number, number, number]][] = [
    ['Orbits', [58, 54, 104]],
    ['Asteroids', [96, 90, 120]]
  ];
  for (const [name, rgb] of layers) {
    const before = await countColour(page, rgb);
    expect(before, `${name} drawn`).toBeGreaterThan(20);
    await page.locator(`[data-show="${name}"]`).click();
    await expect(page.locator(`[data-show="${name}"]`)).not.toHaveClass(/on/);
    await page.waitForTimeout(150);
    expect(await countColour(page, rgb), `${name} hidden`).toBeLessThan(before / 5);
    await page.locator(`[data-show="${name}"]`).click();
    await expect(page.locator(`[data-show="${name}"]`)).toHaveClass(/on/);
  }
  await expect(label(page, 'Mars')).toBeVisible();
  await page.locator('[data-show="Names"]').click();
  await expect(page.locator('#mapLabels span:not([hidden])')).toHaveCount(0);
  await page.locator('[data-show="Names"]').click();
  await expect(label(page, 'Mars')).toBeVisible();

  expect(await mpp(page)).toBeCloseTo(2e9, -3);
  await expect(zoomNow(page)).toHaveText('1 px = 2,000,000 km');
  await page.locator('[data-zoom="1"]').click();
  await expect.poll(() => mpp(page)).toBeLessThan(1.6e9);
  await page.locator('[data-zoom="-1"]').click();
  await page.locator('[data-zoom="-1"]').click();
  await expect.poll(() => mpp(page)).toBeGreaterThan(2.4e9);
  await page.locator('[data-zoom="0"]').click();
  await expect.poll(() => mpp(page), { timeout: 6000 }).toBeGreaterThan(1e10);
  await expect(page.locator('#tiers .on')).toHaveText('Far');
  await expectCleanLayout(page);
});

test('the event filter shows one category and clicking an event selects what it names', async ({ page }) => {
  await open(page, 'sel=body:mars');
  const visible = page.locator('#events .ev:not([hidden])');
  const all = await page.locator('#events .ev').count();
  expect(all).toBeGreaterThan(0);
  await page.locator('#evFilter').selectOption('Contacts');
  await expect(visible).toHaveCount(await page.locator('#events .ev[data-cat="eye"]').count());
  await page.locator('#evFilter').selectOption('All');
  await expect(visible).toHaveCount(all);

  await page.locator('#events .ev', { hasText: 'Jump point A' }).click();
  await expect(heading(page)).toHaveText('Earth');
  await expect(page.locator('#events .ev', { hasText: 'Jump point A' })).toContainText('06:00');
  await step(page, '1d').click();
  await expect(page.locator('#events .ev', { hasText: 'Jump point A' })).toContainText('15 Nov');
  await expectCleanLayout(page);
});
test('the map pans by drag and flies to a double-clicked label', async ({ page }) => {
  await open(page);
  const saturn = await centreOf(page, 'Saturn');
  const centre = await freeCentre(page);
  await page.mouse.move(centre.x + 120, centre.y - 120);
  await page.mouse.down();
  await page.mouse.move(centre.x + 60, centre.y - 80, { steps: 6 });
  await page.mouse.up();
  const panned = await centreOf(page, 'Saturn');
  expect(panned.x - saturn.x).toBeCloseTo(-60, -1);
  expect(panned.y - saturn.y).toBeCloseTo(40, -1);

  await win(page, 'side').locator('[data-tab="display"]').click();
  await label(page, 'Jupiter').dblclick();
  await expect(heading(page)).toHaveText('Jupiter');
  await expect(camFocus(page)).toHaveText('Jupiter');
  expect(await settled(page)).toBeLessThan(2e6);
  const jupiter = (await label(page, 'Jupiter').boundingBox())!;
  expect(Math.abs(jupiter.y + jupiter.height / 2 - centre.y)).toBeLessThan(40);
  await expectCleanLayout(page);
});

test('the wheel eases the zoom about the cursor and snaps to the body under it', async ({ page }) => {
  await open(page, 'zoom=1e9');
  await win(page, 'side').locator('[data-tab="display"]').click();
  const centre = await freeCentre(page);
  const start = await mpp(page);
  await page.mouse.move(centre.x + 150, centre.y - 60);
  const seen = new Set<number>();
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, -100);
    seen.add(await mpp(page));
  }
  await expect.poll(() => mpp(page)).toBeCloseTo(start / 10 ** 0.4, -5);
  for (let i = 0; i < 8; i++) seen.add(await mpp(page));
  expect(seen.size, 'the zoom eases through steps between notches').toBeGreaterThan(2);
  await expect(camFocus(page)).toHaveText('free');

  await page.locator('[data-zoom="0"]').click();
  expect(await settled(page)).toBeGreaterThan(1e10);
  const saturn = await centreOf(page, 'Saturn');
  await page.mouse.move(saturn.x, saturn.y);
  await page.mouse.wheel(0, -100);
  await expect(camFocus(page)).toHaveText('Saturn');
  await expectCleanLayout(page);
});

test('a preset flies the camera to its target and the scale box keeps its width', async ({ page }) => {
  await open(page);
  await win(page, 'side').locator('[data-tab="display"]').click();
  const width = (await page.locator('#mapScale').boundingBox())!.width;
  await expect(page.locator('#presets button')).toContainText(['System', 'Inner system', 'Sun', 'Earth']);
  await page.locator('#presets [data-preset="earth"]').click();
  await expect(camFocus(page)).toHaveText('Earth');
  const earthMpp = await settled(page);
  expect(earthMpp).toBeLessThan(2e5);
  expect((await page.locator('#mapScale').boundingBox())!.width).toBe(width);
  await expect(label(page, 'Earth')).toBeVisible();
  await expectCleanLayout(page);
});

test('zooming into the Sun stops at its surface and fills the view with it', async ({ page }) => {
  await open(page, 'zoom=star');
  await win(page, 'side').locator('[data-tab="display"]').click();
  await expect(camFocus(page)).toHaveText('Sun');
  const centre = await freeCentre(page);
  await page.mouse.move(centre.x, centre.y);
  for (let i = 0; i < 30; i++) await page.mouse.wheel(0, -150);
  const floor = await settled(page);
  for (let i = 0; i < 10; i++) await page.mouse.wheel(0, -150);
  expect(await settled(page)).toBeCloseTo(floor, -2);
  const hot = await page.evaluate(() => {
    const cv = document.querySelector<HTMLCanvasElement>('#mapCv')!;
    const d = cv.getContext('2d')!.getImageData(cv.width / 2 - 40, cv.height / 2 - 40, 80, 80).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i]! > 200 && d[i + 1]! > 100) n++;
    return n / (d.length / 4);
  });
  expect(hot, 'the centre of the view is solar surface').toBeGreaterThan(0.9);
  await shoot(page, 'map-sun-cap');
  await expectCleanLayout(page);
});

test('every site has a jump button that flies to its live scene and selects it', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page);
  await win(page, 'side').locator('[data-tab="display"]').click();
  const sites: [string, string][] = [
    ['sol-station', 'Sol Station'],
    ['deep-well', 'Deep Well 2'],
    ['battle', 'Fleet battle'],
    ['boarding', 'Boarding action'],
    ['salvage', 'Salvage · wreck'],
    ['gate', 'Gate transit']
  ];
  for (const [id, name] of sites) {
    await page.locator(`#presets [data-preset="${id}"]`).click();
    await expect(camFocus(page)).toHaveText(name);
    await expect(heading(page)).toHaveText(name);
    await expect(win(page, 'sel').locator('#siteMock')).toHaveText('mock scene');
    expect(await settled(page)).toBeLessThan(7);
    await expect(page.locator('#mapCv')).toHaveAttribute('data-live', new RegExp(`\\b${id}\\b`));
    await shoot(page, `map-site-${id}`);
  }
  await expectCleanLayout(page);
});

test('a site plays its scene close in and is a labelled marker far out', async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, 'zoom=sol-station');
  await expect(page.locator('#mapCv')).toHaveAttribute('data-live', 'sol-station');
  await expect(page.locator('#mapLabels span', { hasText: /^Slipway 1 · Pike/ })).toBeAttached();
  await expect(page.locator('#mapLabels span', { hasText: 'Ceres Star · unloading' })).toBeVisible();
  const frame = () =>
    page.evaluate(() => {
      const cv = document.querySelector<HTMLCanvasElement>('#mapCv')!;
      return Array.from(cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data).join();
    });
  const a = await frame();
  await page.waitForTimeout(400);
  expect(await frame(), 'the scene animates').not.toBe(a);

  await open(page, 'zoom=salvage:300');
  await win(page, 'side').locator('[data-tab="display"]').click();
  await expect(page.locator('#mapCv')).toHaveAttribute('data-live', '');
  await label(page, 'Salvage · wreck').click();
  await expect(heading(page)).toHaveText('Salvage · wreck');
  await page.locator('[data-go="watch"]').click();
  await expect(camFocus(page)).toHaveText('Salvage · wreck');
  await expect(page.locator('#mapCv')).toHaveAttribute('data-live', 'salvage', { timeout: 6000 });

  await open(page, 'zoom=battle:1e7');
  await expect(label(page, 'Fleet battle')).toBeVisible();
  await label(page, 'Fleet battle').click();
  await expect(heading(page)).toHaveText('Fleet battle');
  await expectCleanLayout(page);
});
