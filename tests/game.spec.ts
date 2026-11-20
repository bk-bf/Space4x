import { expect, test, type Page } from '@playwright/test';

const REAL = ['map', 'economy', 'research', 'classes'];
const MOCK_SCREENS = ['ground', 'commanders', 'intel', 'galaxy'];
const SITES = ['sol-station', 'deep-well', 'battle', 'boarding', 'salvage', 'gate'];

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

test('the top bar lists only the real screens and is not marked as the gallery', async ({ page }) => {
  await open(page);
  const nav = await page
    .locator('[data-nav]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-nav')));
  expect(nav).toEqual(REAL);
  await expect(page.locator('#top')).not.toHaveClass(/gallery/);
  await expect(page).toHaveTitle('Space4x');
});

for (const id of MOCK_SCREENS) {
  test(`?screen=${id} falls back to the map and its F key does nothing`, async ({ page }) => {
    await open(page, `screen=${id}`);
    await expect(page.locator('[data-nav="map"]')).toHaveClass(/on/);
    await expect(page.locator(`[data-screen="${id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-nav="${id}"]`)).toHaveCount(0);
  });
}

test('the F keys of mock screens do nothing', async ({ page }) => {
  await open(page);
  for (const key of ['F5', 'F6', 'F7', 'F8', 'F9']) {
    await page.keyboard.press(key);
    await expect(page.locator('[data-nav="map"]')).toHaveClass(/on/);
  }
});

test('the map has no site marker, fly-to button or scene', async ({ page }) => {
  await open(page, 'zoom=sol-station&sel=site:gate');
  await page.locator('#w-side [data-tab="display"]').click();
  await expect(page.locator('#presets [data-preset]').first()).toBeAttached();
  for (const id of SITES) await expect(page.locator(`#presets [data-preset="${id}"]`)).toHaveCount(0);
  await expect(page.locator('#mapCv')).not.toHaveAttribute('data-live', /./);
  await expect(page.locator('#siteMock')).toHaveCount(0);
});

test('?screen=colony opens the People tab of Economy, which has no mock surface scene', async ({ page }) => {
  await open(page, 'screen=colony');
  await expect(page.locator('[data-screen="colony"]')).toHaveCount(0);
  await expect(page.locator('[data-screen="economy"]')).toBeVisible();
  await expect(page.locator('[data-tab="people"]')).toHaveClass(/on/);
  await expect(page.locator('[data-screen="economy"] .pan > h2', { hasText: 'Surface' })).toHaveCount(0);
});

test('the game build counts food in calories and the top bar agrees with the Summary', async ({ page }) => {
  await open(page, 'screen=economy');
  await expect(page.locator('#calorieBar [data-food="meat"]')).toHaveAttribute('data-share', /^0\.\d+$/);
  await expect(page.locator('[data-screen="economy"]')).toContainText(
    'kcal a person a day made against 2,800 needed'
  );
  const balance = (await page.locator('#summaryStats .ui-kpi').nth(1).locator('.big').textContent())!;
  await expect(
    page.locator('#chips .chip[aria-label="Food: calories made against calories needed"]')
  ).toHaveText(balance);
});

async function designStage(page: Page, name: string, parts: [string, number][]) {
  await page.locator('[data-act="new"]').click();
  await page.locator('#clsName').fill(name);
  for (const [id, n] of parts) {
    await page.locator(`[data-part="${id}"] button`).click();
    const input = page.locator(`[data-count="${id}"]`);
    await input.fill(String(n));
    await input.press('Tab');
  }
}

async function setPart(page: Page, id: string, n: number) {
  const input = page.locator(`[data-count="${id}"]`);
  await input.fill(String(n));
  await input.press('Tab');
}

test('boosters lift a design to orbit in the designer and a site is planned before anything is built', async ({
  page
}) => {
  await open(page, 'screen=classes');
  await designStage(page, 'Orbiter', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ]);
  await expect(page.locator('#climb [data-climb="boosters"]')).toContainText('0,');
  await expect(page.locator('#climbVerdict')).toContainText('Delta-v to orbit');
  await page.locator('[data-part="booster"] button').click();
  await setPart(page, 'booster', 2);
  await expect(page.locator('#climb [data-climb="boosters"]')).toContainText('2,');
  await expect(page.locator('#climbVerdict')).toContainText('Reaches orbit');
  await expect(page.locator('#climbCeiling')).toHaveAttribute('data-ceiling', '8000');
  await setPart(page, 'booster', 1);
  await expect(page.locator('#climbVerdict')).toContainText('thrust to weight');
  await setPart(page, 'booster', 2);
  await expect(page.locator('#climbVerdict')).toContainText('Reaches orbit');
  await expect(page.locator('[data-screen="classes"] [data-act="lock"]')).toBeEnabled();

  await page.locator('[data-nav="economy"]').click();
  await page.locator('[data-tab="ships"]').click();
  await page.locator('#planGroup').selectOption('Planets');
  await page.locator('#planPlace').selectOption('orbit:earth');
  await expect(page.locator('#planBuildings .ui-tile')).not.toHaveCount(0);
  await page.locator('#planBuildings .ui-tile', { hasText: 'Alloy works' }).click();
  await expect(page.locator('#planCost')).toHaveText('costs 2.7 t');
  await expect(page.locator('#planHave .short')).toHaveCount(2);
  await page.locator('#planGroup').selectOption('Moons of Earth');
  await page.locator('#planPlace').selectOption('surface:luna');
  await expect(page.locator('#planRegion')).toBeVisible();
  await expect(page.locator('#planBuildings .ui-tile')).not.toHaveCount(0);
});

const MONTH_STEP = '[data-step="2592000"]';

test('running at a month a second pauses at a milestone, which shows from Economy', async ({ page }) => {
  await page.goto('/?test&screen=economy');
  await expect(page.locator('#top[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
  const started = await page.evaluate(() => {
    const t = window.space4xTest!;
    t.stock('grcop', 1e9);
    return t.startProgramme(1);
  });
  expect(started).toBe(true);
  await page.locator(MONTH_STEP).click();
  await expect(page.locator('#bPause')).toHaveClass(/on/);
  await page.locator('#bPlay').click();
  await expect(page.locator('#bPause')).toHaveAttribute(
    'aria-label',
    'Paused by: Milestone 1 reached: Reusable orbital launch.',
    { timeout: 60_000 }
  );
  await expect(page.locator('#bPlay')).not.toHaveClass(/on/);
  await expect(page.locator('[data-screen="economy"]')).toBeVisible();
  const clock = await page.locator('#clock').innerText();
  await page.waitForTimeout(400);
  await expect(page.locator('#clock')).toHaveText(clock);
  await page.locator('[data-nav="map"]').click();
  await expect(page.locator('#events .ev.paused')).toContainText('Milestone 1 reached');
});

test('a station running out of food pauses the game and warns in the top bar, which opens it', async ({
  page
}) => {
  await page.goto('/?test&screen=research');
  await expect(page.locator('#top[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
  const id = await page.evaluate(() => window.space4xTest!.station(6, 40));
  const food = page.locator('#chips [data-chip="food"]');
  await expect(food).not.toHaveClass(/warn/);
  await page.locator(MONTH_STEP).click();
  await expect(page.locator('#bPause')).toHaveAttribute(
    'aria-label',
    'Paused by: Luna orbital station runs out of food in 30 days.'
  );
  await expect(food).toHaveClass(/warn/);
  await expect(food).toHaveAttribute('data-site', id);
  await expect(food).toHaveAttribute('aria-label', /Luna orbital station: food runs out in 30 d/);
  await food.click();
  await expect(page.locator('[data-screen="economy"]')).toBeVisible();
  await expect(page.locator(`[data-screen="economy"] [data-site="${id}"]`)).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});
