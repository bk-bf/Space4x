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
