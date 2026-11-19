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
  await expect(page.locator('#chips .chip[title="Food: calories made against calories needed"]')).toHaveText(
    balance
  );
});

test('a milestone in the game build lists the site it needs', async ({ page }) => {
  await open(page, 'screen=research&milestone=8');
  const need = page.locator('#siteNeeds [data-site-need]', { hasText: /ice mine at the lunar south pole/i });
  await expect(need).toHaveAttribute('data-site-need', 'missing');
});

test('the goal bar leads from the start state to the recipe switch that unblocks milestone 1', async ({
  page
}) => {
  await open(page);
  const goal = page.locator('#goal');
  await expect(goal).toHaveAttribute('data-milestone', '1');
  await expect(goal).toHaveAttribute('data-status', 'waiting');
  await expect(page.locator('#goalMilestone')).toContainText('1. Orbital launch');
  await expect(page.locator('#goalWhy')).toContainText('GRCop');
  await expect(page.locator('#goalStep')).toContainText('Switch an Alloy works to GRCop');

  await page.locator('#goalStep').click();
  const economy = page.locator('[data-screen="economy"]');
  await expect(economy).toBeVisible();
  await expect(page.locator('[data-tab="production"]')).toHaveClass(/on/);
  await expect(economy.locator('.ui-card .ttl').first()).toContainText('Alloy works');
  await expect(page.locator('#chosenRecipe')).toContainText('GRCop');
  await expect(page.locator('#recipeSwitch')).toContainText('Switch 1');
  await page.locator('#recipeSwitch').click();

  await expect(page.locator('#goalStep')).toContainText('at the current rate');
  await page.locator('#goalStep').click();
  await expect(page.locator('[data-tab="stockpiles"]')).toHaveClass(/on/);
  await expect(economy.locator('.ui-card .ttl').first()).toContainText('GRCop');

  await page.locator('#goalMilestone').click();
  const research = page.locator('[data-screen="research"]');
  await expect(research).toBeVisible();
  await expect(research.locator('.ui-card .ttl').first()).toContainText('1. Reusable orbital launch');
  await expect(page.locator('#programmeNext')).toContainText('at the current rate');
});

test('after milestone 1 the goal is the propellant depot, which starts at the Ship classes screen', async ({
  page
}) => {
  await open(page, 'reached=1');
  await expect(page.locator('#goal')).toHaveAttribute('data-milestone', '2');
  await expect(page.locator('#goalWhy')).toContainText('No Propellant depot standing');
  await page.locator('#goalStep').click();
  await expect(page.locator('[data-screen="classes"]')).toBeVisible();
});

test('a bill item on the programme card opens its stockpile card even with no stock', async ({ page }) => {
  await open(page, 'screen=research&milestone=1');
  const grcop = page.locator('#programmeBill .ui-have.short').first();
  await expect(grcop).toContainText('not made');
  await grcop.click();
  await expect(page.locator('[data-tab="stockpiles"]')).toHaveClass(/on/);
  await expect(page.locator('#showEmpty')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-screen="economy"] .ui-card .ttl').first()).toContainText('GRCop');
  await expect(page.locator('#stockpiles .ui-tile[aria-pressed="true"]')).toHaveCount(1);
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

test('a two-stage stack is tried in the designer and a site is planned before anything is built', async ({
  page
}) => {
  await open(page, 'screen=classes');
  await designStage(page, 'Booster', [
    ['chemical_engine_methalox', 3],
    ['propellant_tank', 25],
    ['structure_truss', 1],
    ['landing_legs', 1]
  ]);
  await designStage(page, 'Orbiter', [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2]
  ]);
  await expect(page.locator('#stackStages [data-stage]')).toHaveCount(1);
  await page.locator('#stackAdd').selectOption({ label: 'Booster' });
  await expect(page.locator('#stackStages [data-stage]')).toHaveCount(2);
  await expect(page.locator('#stackStages [data-stage="1"]')).toContainText('Booster');
  await expect(page.locator('#stackStages [data-stage="2"]')).toContainText('reaches orbit');
  await expect(page.locator('#stackVerdict')).toContainText('Reaches orbit');
  const ceiling = Number(await page.locator('#stackCeiling').getAttribute('data-ceiling'));
  expect(ceiling).toBeGreaterThan(1000);
  await page.locator('#stackPayload').fill(String(Math.ceil(ceiling / 1000) + 1));
  await page.locator('#stackPayload').press('Tab');
  await expect(page.locator('#stackVerdict')).toContainText('km/s of delta-v');
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
