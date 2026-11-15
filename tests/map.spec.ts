import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS;
const win = (page: Page, id: string) => page.locator(`#w-${id}`);
const heading = (page: Page) => win(page, 'sel').locator('.tb span').first();
const label = (page: Page, text: string) => page.locator('#mapLabels').getByText(text, { exact: true });
const orderRows = (page: Page) => win(page, 'sel').locator('table').nth(1).locator('tr');
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

test('the system picker switches the shown system and the tree selects across systems', async ({ page }) => {
  await open(page);
  await page.locator('#sysSel').selectOption('Alpha Centauri');
  await expect(label(page, 'Centauri II')).toBeVisible();
  await expect(label(page, 'Mars')).toBeHidden();
  await win(page, 'side').locator('[data-tab="bodies"]').click();
  await expect(win(page, 'side').locator('table')).toContainText('Centauri III');
  await expect(win(page, 'side').locator('table')).not.toContainText('Jupiter');
  await win(page, 'side').locator('[data-tab="contacts"]').click();
  await expect(win(page, 'side').locator('table')).toContainText('C-017');
  await expectCleanLayout(page);

  await page.locator('#sysSel').selectOption("Barnard's Star");
  await expect(label(page, 'Barnard e')).toBeVisible();
  await expect(label(page, 'Barnard watch')).toBeVisible();
  await expectCleanLayout(page);

  await win(page, 'side').locator('[data-tab="fleets"]').click();
  await page.locator('#tree [data-system="acen"] > summary').click();
  await page.locator('#tree summary[data-sel="fleet:probe"]').click();
  await expect(heading(page)).toHaveText('Probe group');
  await expect(page.locator('#sysSel')).toHaveValue('acen');
  await page.locator('#tree summary[data-sel="fleet:convoy"]').click();
  await page.locator('#tree [data-ship="Juno Star"]').click();
  await expect(heading(page)).toHaveText('Freight convoy');
  await expect(page.locator('#sysSel')).toHaveValue('sol');
  await expect(win(page, 'sel').locator('table').first()).toContainText('Juno Star');
  await expectCleanLayout(page);
});

test('the display toggles change what the map draws and the zoom buttons zoom', async ({ page }) => {
  await open(page);
  await win(page, 'side').locator('[data-tab="display"]').click();
  const layers: [string, [number, number, number]][] = [
    ['Orbits', [58, 54, 104]],
    ['Sensors', [52, 128, 128]],
    ['Asteroids', [96, 90, 120]],
    ['Course', [190, 138, 72]]
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
  await expect(label(page, 'Saturn')).toBeVisible();
  await page.locator('[data-show="Names"]').click();
  await expect(page.locator('#mapLabels span:not([hidden])')).toHaveCount(0);
  await page.locator('[data-show="Names"]').click();
  await expect(label(page, 'Saturn')).toBeVisible();

  await page.locator('[data-zoom="1"]').click();
  await expect(page.locator('#zoomNow')).toHaveText('1.5x');
  await page.locator('[data-zoom="-1"]').click();
  await page.locator('[data-zoom="-1"]').click();
  await expect(page.locator('#zoomNow')).toHaveText('0.75x');
  await page.locator('[data-zoom="0"]').click();
  await expect(page.locator('#zoomNow')).toHaveText('1x');
  await expectCleanLayout(page);
});

test('the order composer adds, reorders, removes and clears a fleet’s orders', async ({ page }) => {
  await open(page);
  await expect(orderRows(page)).toHaveText([/Move to Mars/, /Survey Mars/, /Refuel at Mars/]);
  await page.locator('#oAct').selectOption('Hold orbit at');
  await page.locator('#oDst').selectOption('Venus');
  await page.locator('[data-act="order"]').click();
  await expect(orderRows(page)).toHaveText([
    /Move to Mars/,
    /Survey Mars/,
    /Refuel at Mars/,
    /Hold orbit at Venus/
  ]);
  await expect(orderRows(page).nth(3)).toHaveClass(/on/);
  await expect(orderRows(page).nth(3)).toContainText('hold');

  await page.locator('[data-act="up"]').click();
  await page.locator('[data-act="up"]').click();
  await expect(orderRows(page)).toHaveText([
    /Move to Mars/,
    /Hold orbit at Venus/,
    /Survey Mars/,
    /Refuel at Mars/
  ]);
  await expect(orderRows(page).nth(1)).toHaveClass(/on/);
  await expect(orderRows(page).nth(2)).toContainText('-');
  await page.locator('[data-act="down"]').click();
  await expect(orderRows(page)).toHaveText([
    /Move to Mars/,
    /Survey Mars/,
    /Hold orbit at Venus/,
    /Refuel at Mars/
  ]);

  await orderRows(page).nth(0).click();
  await expect(page.locator('[data-act="up"]')).toBeDisabled();
  await page.locator('[data-act="remove"]').click();
  await expect(orderRows(page)).toHaveText([/Survey Mars/, /Hold orbit at Venus/, /Refuel at Mars/]);

  await page.locator('#oAct').selectOption('Join fleet');
  await expect(page.locator('#oDst option')).toHaveText(['Freight convoy', 'Jupiter picket']);
  await expect(page.locator('#oAct option', { hasText: 'Load cargo at' })).toHaveCount(0);

  await page.locator('[data-act="clear"]').click();
  await expect(orderRows(page)).toHaveText([/No orders/]);
  await expect(page.locator('[data-act="remove"]')).toBeDisabled();
  await expectCleanLayout(page);
});

test('an order executes as the clock runs and writes its events', async ({ page }) => {
  await open(page);
  await page.locator('#tree summary[data-sel="fleet:picket"]').click();
  await expect(heading(page)).toHaveText('Jupiter picket');
  await page.locator('[data-act="clear"]').click();
  await page.locator('#oAct').selectOption('Move to');
  await page.locator('#oDst').selectOption('Mars');
  await page.locator('[data-act="order"]').click();
  await page.locator('#oAct').selectOption('Refuel at colony');
  await page.locator('#oDst').selectOption('Mars');
  await page.locator('[data-act="order"]').click();
  const fuel = win(page, 'sel').locator('.row3 small').first();
  await expect(fuel).toHaveText('Fuel 56%');

  const before = await centreOf(page, 'Jupiter picket');
  await step(page, '1d').click();
  await expect(page.locator('#tree summary[data-sel="fleet:picket"] small')).toHaveText('To Mars');
  await expect(win(page, 'sel').locator('table').first()).toContainText('Under way');
  const during = await centreOf(page, 'Jupiter picket');
  expect(Math.hypot(during.x - before.x, during.y - before.y)).toBeGreaterThan(30);
  await shoot(page, 'orders-running');

  for (let day = 2; day <= 4; day++) {
    await step(page, '1d').click();
    await expect(page.locator('#clock')).toContainText(`${12 + day} Mar`);
  }
  await expect(page.locator('#tree summary[data-sel="fleet:picket"] small')).toHaveText('Mars');
  await expect(page.locator('#events .ev', { hasText: 'Jupiter picket arrived at Mars.' })).toHaveCount(1);
  await expect(orderRows(page)).toHaveText([/Refuel at Mars/]);
  await expect(win(page, 'sel').locator('table').first()).toContainText('Refuelling');

  await step(page, '5d').click();
  await expect(page.locator('#events .ev', { hasText: 'Jupiter picket refuelled at Mars.' })).toHaveCount(1);
  await expect(fuel).toHaveText('Fuel 100%');
  await expect(orderRows(page)).toHaveText([/No orders/]);
  await shoot(page, 'orders-done');
  await expectCleanLayout(page);
});

test('the event filter shows one category and clicking an event selects what it names', async ({ page }) => {
  await open(page);
  const visible = page.locator('#events .ev:not([hidden])');
  await page.locator('#evFilter').selectOption('Contacts');
  const eyes = await page.locator('#events .ev[data-cat="eye"]').count();
  expect(eyes).toBeGreaterThan(0);
  await expect(visible).toHaveCount(eyes);
  await page.locator('#evFilter').selectOption('Economy');
  await expect(visible).toHaveCount(await page.locator('#events .ev[data-cat="factory"]').count());
  await page.locator('#evFilter').selectOption('All');
  await expect(visible).toHaveCount(await page.locator('#events .ev').count());

  await page.locator('#events .ev', { hasText: 'Freight convoy began loading' }).click();
  await expect(heading(page)).toHaveText('Freight convoy');
  await page.locator('#events .ev', { hasText: 'Mars finished 2 mines' }).click();
  await expect(heading(page)).toHaveText('Mars');
  await page.locator('#events .ev', { hasText: 'lost its track on C-014' }).click();
  await expect(heading(page)).toHaveText('Contact C-014');
  await page.locator('#events .ev', { hasText: 'Probe group entered' }).click();
  await expect(heading(page)).toHaveText('Probe group');
  await expect(page.locator('#sysSel')).toHaveValue('acen');
  await expect(label(page, 'Probe group')).toBeVisible();

  await step(page, '1d').click();
  await expect(page.locator('#events .ev').first()).toContainText('12 Mar');
  await expect(page.locator('#events .ev').first()).not.toContainText('06:40 Survey group 1 passed');
  await expectCleanLayout(page);
});

test('the map pans by drag, centres on a double-click and moves contacts along their tracks', async ({
  page
}) => {
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

  await label(page, 'Jupiter').dblclick();
  await expect(heading(page)).toHaveText('Jupiter');
  await page.waitForTimeout(150);
  const jupiter = (await label(page, 'Jupiter').boundingBox())!;
  expect(Math.abs(jupiter.x - centre.x)).toBeLessThan(120);
  expect(Math.abs(jupiter.y - centre.y)).toBeLessThan(120);

  await win(page, 'side').locator('[data-tab="display"]').click();
  await page.locator('[data-zoom="0"]').click();
  const contact = await centreOf(page, 'C-014 unknown');
  await step(page, '8h').click();
  await page.waitForTimeout(150);
  const moved = await centreOf(page, 'C-014 unknown');
  expect(Math.hypot(moved.x - contact.x, moved.y - contact.y)).toBeGreaterThan(20);
  await expectCleanLayout(page);
});
