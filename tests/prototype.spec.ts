import { expect, test, type Page } from '@playwright/test';

const MONTH = '[data-step="2592000"]';

async function open(page: Page, query: string) {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

const tab = (page: Page, id: string) => page.locator(`[data-tab="${id}"]`).click();
const group = (page: Page, ...texts: string[]) => {
  let t = page.locator('#groups button.ui-tile');
  for (const text of texts) t = t.filter({ hasText: text });
  return t;
};
const recipe = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const numeric = (text: string | null) => Number((text ?? '').replace(/[^0-9.]/g, ''));

async function switchRecipe(page: Page, building: string, from: string, to: string, count: number) {
  await tab(page, 'production');
  await group(page, from, building).first().click();
  await recipe(page, to).click();
  await page.locator('input[name="switchCount"]').fill(String(count));
  await page.locator('#recipeSwitch').click();
}

test.describe('the prototype on present-day Earth', () => {
  test('starts with Earth as the only site', async ({ page }) => {
    await open(page, 'screen=economy');
    await expect(page.locator('#siteList [data-site]')).toHaveCount(1);
    await expect(page.locator('#siteList [data-site="earth"]')).toContainText('Earth');
    await expect(page.locator('#siteList')).toContainText('Sol');
    await expect(page.locator('.chip[aria-label="People"]')).toContainText('8,200 M');
    await tab(page, 'people');
    await expect(page.locator('[data-screen="economy"] .ui-card header .t')).toHaveText('Population');
    await expectCleanLayout(page);
  });

  test('switches every rate between a day and a year', async ({ page }) => {
    await open(page, 'screen=economy&tab=stockpiles');
    const wheat = page.locator('#stockpiles button.ui-tile', { hasText: 'Wheat' }).first();
    await expect(page.locator('[data-period="day"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(wheat.locator('.ui-net')).toContainText('/d');
    await page.locator('[data-period="year"]').click();
    await expect(wheat.locator('.ui-net')).toContainText('/yr');
    await tab(page, 'summary');
    await expect(page.locator('[data-screen="economy"] .ui-net').first()).toContainText('/yr');
    await expectCleanLayout(page);
  });

  test('selects a stock tile and shows its card, and the stock changes while the clock runs', async ({
    page
  }) => {
    await open(page, 'screen=economy&tab=stockpiles');
    const wheat = page.locator('#stockpiles button.ui-tile', { hasText: 'Wheat' }).first();
    await wheat.click();
    await expect(wheat).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-screen="economy"] .ui-card header .t')).toHaveText('Wheat');
    const before = await wheat.locator('.ui-amt').textContent();
    await page.locator(MONTH).click();
    await expect(wheat.locator('.ui-amt')).not.toHaveText(before ?? '');
    await page.locator('#showEmpty').click();
    await expect(page.locator('#showEmpty')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-filter="food"]').click();
    await expect(page.locator('#stockpiles button.ui-tile').first()).toBeVisible();
    await expectCleanLayout(page);
  });

  test('builds a queued building, which then produces', async ({ page }) => {
    await open(page, 'screen=economy&tab=construction');
    await page.locator('#items button.ui-tile', { hasText: 'Alloy works' }).click();
    await expect(page.locator('[data-screen="economy"] .ui-card header .t')).toHaveText('Alloy works');
    await recipe(page, 'GRCop copper-chromium-niobium alloy').click();
    await page.locator('#orderAdd').click();
    await expect(page.locator('#queue button.ui-tile')).toHaveCount(1);
    await expect(page.locator('#queue button.ui-tile')).toContainText('Alloy works');
    await page.locator(MONTH).click();
    await expect(page.locator('#queue button.ui-tile')).toHaveCount(0);
    await tab(page, 'production');
    const built = group(page, 'GRCop');
    await expect(built).toHaveCount(1);
    await expect(built.locator('.n')).toHaveText('1');
    await expect(built).toContainText('Alloy works');
    await expectCleanLayout(page);
  });

  test('queues two buildings, reorders, pauses and removes them', async ({ page }) => {
    await open(page, 'screen=economy&tab=construction');
    await page.locator('#items button.ui-tile', { hasText: 'Alloy works' }).click();
    await page.locator('#orderAdd').click();
    await page.locator('#items button.ui-tile', { hasText: 'Polymer plant' }).click();
    await page.locator('#orderAdd').click();
    const queue = page.locator('#queue button.ui-tile');
    await expect(queue).toHaveCount(2);
    await expect(queue.nth(1)).toContainText('Polymer plant');
    await expect(queue.nth(1)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#orderUp').click();
    await expect(queue.nth(0)).toContainText('Polymer plant');
    await expect(page.locator('#orderUp')).toBeDisabled();
    await page.locator('#orderPause').click();
    await expect(queue.nth(0)).toContainText('paused');
    await page.locator('#orderRemove').click();
    await expect(queue).toHaveCount(1);
    await expect(queue.first()).toContainText('Alloy works');
    await expectCleanLayout(page);
  });

  test('switches part of a group to another recipe and switches it off', async ({ page }) => {
    await open(page, 'screen=economy&tab=production');
    await switchRecipe(page, 'Alloy works', 'Stainless steel', 'GRCop copper-chromium-niobium alloy', 10);
    const grcop = group(page, 'GRCop');
    await expect(grcop.locator('.n')).toHaveText('10');
    await expect(grcop).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#groupToggle').click();
    await expect(page.locator('#groupLimit')).toHaveText('Switched off');
    await expect(grcop).toHaveClass(/idle/);
    await page.locator('#groupToggle').click();
    await expect(page.locator('#groupLimit')).toHaveCount(0);
    await expectCleanLayout(page);
  });

  test('runs Earth on power plants: the Power block, and a plant card that sets how many are active', async ({
    page
  }) => {
    await open(page, 'screen=economy');
    await expect(page.locator('#powerBlock')).toBeVisible();
    await expect(page.locator('#generationBar i[data-source="coal_power_station"]')).toHaveCount(1);
    await expect(page.locator('#powerFacts')).toContainText('Firm capacity');
    await expect(page.locator('#powerFacts')).toContainText('GWh');
    await tab(page, 'production');
    const coal = group(page, 'Coal power station');
    await coal.click();
    await expect(coal).toHaveAttribute('aria-pressed', 'true');
    const value = page.locator('#plantActive .val');
    await expect(value).toHaveText('404 / 404');
    await expect(page.locator('#plantMore')).toBeDisabled();
    await page.locator('#plantFewer').click();
    await expect(value).toHaveText('403 / 404');
    await expect(coal).toContainText('403/404');
    await expect(page.locator('#groupToggle')).toHaveCount(0);
    await expectCleanLayout(page);
  });

  test('stops growth when food runs short', async ({ page }) => {
    await open(page, 'screen=economy&scenario=famine');
    const people = page.locator('.chip[aria-label="People"]');
    await expect(page.locator('.chip[aria-label^="Food"]')).toHaveClass(/warn/);
    await expect(page.locator('.chip[aria-label^="Food"]')).toContainText('fed');
    await expect(page.locator('#summaryStats .ui-kpi').first().locator('small')).toContainText('-');
    const before = await people.textContent();
    const clock = await page.locator('#clock').innerText();
    await page.locator(MONTH).click();
    await expect(page.locator('#bPause')).toHaveAttribute('aria-label', /^Paused by: Earth is short of food/);
    await expect(page.locator('#clock')).toHaveText(clock);
    await page.locator(MONTH).click();
    await expect(people).not.toHaveText(before ?? '');
    expect(numeric(await people.textContent())).toBeLessThan(numeric(before));
    await expectCleanLayout(page);
  });

  test('starts milestone 1 at once and opens what it unlocks', async ({ page }) => {
    await open(page, 'screen=economy&tab=production&test');
    const start = () => page.evaluate(() => window.space4xTest?.startProgramme(1));
    expect(await start()).toBe(true);
    expect(await start()).toBe(false);
    await group(page, 'Polymer plant').first().click();
    await expect(page.locator('#recipes').getByRole('button', { name: /Polyimide/ })).toHaveCount(0);
    for (let i = 0; i < 3; i++) await page.locator(MONTH).click();
    await expect(page.locator('#recipes').getByRole('button', { name: /Polyimide/ })).toHaveCount(1);
    await expectCleanLayout(page);
  });
});
