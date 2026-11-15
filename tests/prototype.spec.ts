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
const row = (page: Page, table: string, ...cells: string[]) => {
  let r = page.locator(`${table} tr.pick`);
  for (const c of cells) r = r.filter({ has: page.locator('td', { hasText: c }) });
  return r;
};

async function switchRecipe(page: Page, building: string, from: string, to: string, count: number) {
  await tab(page, 'production');
  await row(page, '#groups', building, from).first().click();
  await page.locator('#recipePick').selectOption({ label: to });
  await page.locator('input[name="switchCount"]').fill(String(count));
  await page.locator('#recipeSwitch').click();
}

test.describe('the prototype on present-day Earth', () => {
  test('starts with Earth as the only site', async ({ page }) => {
    await open(page, 'screen=economy');
    await expect(page.locator('#colonyTree [data-colony]')).toHaveCount(1);
    await expect(page.locator('#colonyTree [data-colony="earth"]')).toContainText('Earth');
    await expect(page.locator('#colonyTree summary')).toHaveText([/Sol/]);
    await expect(page.locator('.chip[title="People"]')).toContainText('8.20 bn');
    await expect(page.locator('.chip[title="Milestones reached"]')).toContainText('0/29');
    await page.locator('#openColony').click();
    await expect(page.locator('#colonyPick option')).toHaveText(['Earth']);
    await expectCleanLayout(page);
  });

  test('changes stockpiles while the clock runs', async ({ page }) => {
    await open(page, 'screen=economy&tab=stockpiles');
    const cell = page.locator('#stockpiles tr', { hasText: 'Wheat' }).first().locator('td').nth(1);
    const before = await cell.textContent();
    await page.locator(MONTH).click();
    await expect(cell).not.toHaveText(before ?? '');
    await expectCleanLayout(page);
  });

  test('builds a queued building, which then produces', async ({ page }) => {
    await open(page, 'screen=economy&tab=construction');
    await page.locator('#items tr.pick', { hasText: 'Alloy works' }).click();
    await expect(page.locator('#chosen')).toHaveText('Alloy works');
    await page.locator('#buildRecipe').selectOption({ label: 'GRCop copper-chromium-niobium alloy' });
    await page.locator('#orderAdd').click();
    await expect(page.locator('#queue tr.pick')).toHaveCount(1);
    await expect(page.locator('#queue tr.pick')).toContainText('Alloy works');
    await page.locator(MONTH).click();
    await expect(page.locator('#queueEmpty')).toBeVisible();
    await tab(page, 'production');
    const built = page.locator('#groups tr.pick', { hasText: 'GRCop' });
    await expect(built).toHaveCount(1);
    await expect(built.locator('td').nth(2)).toHaveText('1');
    await expect(built.locator('td').nth(4)).toContainText('t GRCop');
    await expectCleanLayout(page);
  });

  test('switches part of a group to another recipe and switches it off', async ({ page }) => {
    await open(page, 'screen=economy&tab=production');
    await switchRecipe(page, 'Alloy works', 'Stainless steel', 'GRCop copper-chromium-niobium alloy', 10);
    const grcop = page.locator('#groups tr.pick', { hasText: 'GRCop' });
    await expect(grcop.locator('td').nth(2)).toHaveText('10');
    await expect(grcop).toHaveClass(/on/);
    await page.locator('#groupToggle').click();
    await expect(grcop.locator('td').nth(5)).toHaveText('Switched off');
    await page.locator('#groupToggle').click();
    await expect(grcop.locator('td').nth(5)).toHaveText('Running');
    await expectCleanLayout(page);
  });

  test('stops growth when food runs short', async ({ page }) => {
    await open(page, 'screen=economy&scenario=famine');
    const people = page.locator('.chip[title="People"]');
    await expect(page.locator('.chip[title^="Food"]')).toHaveClass(/warn/);
    await expect(page.locator('.chip[title^="Food"]')).toContainText('fed');
    const pane = page.locator('[data-screen="economy"]');
    await expect(
      pane.locator('dt', { hasText: 'Growth' }).first().locator('xpath=following-sibling::dd[1]')
    ).toContainText('-');
    const before = await people.textContent();
    await page.locator(MONTH).click();
    await expect(people).not.toHaveText(before ?? '');
    const after = Number((await people.textContent())?.replace(/[^0-9.]/g, ''));
    expect(after).toBeLessThan(Number(before?.replace(/[^0-9.]/g, '')));
    await expectCleanLayout(page);
  });

  test('starts milestone 1 once its needs are met and opens what it unlocks', async ({ page }) => {
    await open(page, 'screen=economy&tab=milestones');
    const first = page.locator('#milestones tr.pick').first();
    await expect(first.locator('td').nth(3)).toContainText('GRCop short');
    await expect(page.locator('#programmeStart')).toHaveCount(0);
    await switchRecipe(page, 'Alloy works', 'Stainless steel', 'GRCop copper-chromium-niobium alloy', 1);
    await page.locator('[data-step="86400"]').click();
    await tab(page, 'milestones');
    await expect(first.locator('td').nth(3)).toContainText('Ready to start');
    await page.locator('#programmeStart').click();
    await expect(first.locator('td').nth(3)).toContainText('Running');
    await tab(page, 'production');
    await page.locator('#groups tr.pick', { hasText: 'Polymer plant' }).first().click();
    await expect(page.locator('#recipePick option', { hasText: 'Polyimide' })).toHaveCount(0);
    for (let i = 0; i < 3; i++) await page.locator(MONTH).click();
    await expect(page.locator('.chip[title="Milestones reached"]')).toContainText('1/29');
    await expect(page.locator('#recipePick option', { hasText: 'Polyimide' })).toHaveCount(1);
    await tab(page, 'milestones');
    await expect(first.locator('td').nth(3)).toContainText('Done');
    await expectCleanLayout(page);
  });
});
