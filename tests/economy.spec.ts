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

const queueNames = (page: Page) => page.locator('#queue tr.pick td:nth-child(2)').allTextContents();
const pane = (page: Page) => page.locator('[data-screen="economy"] .pb').last();

test.describe('the economy screen', () => {
  test('groups colonies by system and switches the right side when one is picked', async ({ page }) => {
    await open(page, 'screen=economy');
    await expect(page.locator('#colonyTree summary')).toHaveText([/Sol/, /Alpha Centauri/]);
    await expect(page.locator('#colonyTree [data-colony]')).toHaveCount(6);
    await expect(page.locator('#colonyTree [data-colony="mars"]')).toHaveClass(/on/);
    await expect(page.locator('[data-screen="economy"] .pan > h2').last()).toContainText('Mars');
    await page.locator('#colonyTree [data-colony="luna"]').click();
    await expect(page.locator('#colonyTree [data-colony="luna"]')).toHaveClass(/on/);
    await expect(page.locator('[data-screen="economy"] .pan > h2').last()).toContainText('Luna');
    await expect(pane(page)).toContainText('400,000');
    await expectCleanLayout(page);
  });

  test('shows every tab without rendering an internal id', async ({ page }) => {
    await open(page, 'screen=economy');
    for (const tab of ['industry', 'mining', 'shipyards', 'stockpiles', 'wealth', 'summary']) {
      await page.locator(`[data-tab="${tab}"]`).click();
      await expect(page.locator(`[data-tab="${tab}"]`)).toHaveClass(/on/);
      const text = (await pane(page).textContent()) ?? '';
      expect(text).not.toMatch(/cargo-container|sensor-array|hull-plating|drive-coil|fuel-tank/);
      await expectCleanLayout(page);
    }
  });

  test('adds an order to the queue and builds it with the share chosen', async ({ page }) => {
    await open(page, 'screen=economy&tab=industry');
    expect(await queueNames(page)).toEqual(['Mine', 'Habitat dome', 'Hull plating']);
    await page.locator('#items tr.pick', { hasText: 'Research lab' }).click();
    await expect(page.locator('#chosen')).toHaveText('Research lab');
    await page.locator('input[name="quantity"]').fill('3');
    await page.locator('input[name="share"]').fill('10');
    await page.locator('#orderAdd').click();
    expect(await queueNames(page)).toEqual(['Mine', 'Habitat dome', 'Hull plating', 'Research lab']);
    const row = page.locator('#queue tr.pick', { hasText: 'Research lab' });
    await expect(row).toContainText('3 of 3');
    await expect(row).toContainText('10%');
    await expect(row).toContainText('Building');
    await expectCleanLayout(page);
  });

  test('moves, pauses, resumes and removes orders', async ({ page }) => {
    await open(page, 'screen=economy&tab=industry');
    await expect(page.locator('#orderUp')).toBeDisabled();
    await page.locator('#queue tr.pick', { hasText: 'Habitat dome' }).click();
    await page.locator('#orderUp').click();
    expect(await queueNames(page)).toEqual(['Habitat dome', 'Mine', 'Hull plating']);
    await expect(page.locator('#orderUp')).toBeDisabled();
    await page.locator('#orderDown').click();
    expect(await queueNames(page)).toEqual(['Mine', 'Habitat dome', 'Hull plating']);
    await page.locator('#orderPause').click();
    const dome = page.locator('#queue tr.pick', { hasText: 'Habitat dome' });
    await expect(dome).toContainText('Paused');
    await expect(dome).toContainText('0');
    await expect(page.locator('#orderPause')).toHaveText('Resume');
    await page.locator('#orderPause').click();
    await expect(dome).toContainText('Building');
    await page.locator('#orderRemove').click();
    expect(await queueNames(page)).toEqual(['Mine', 'Hull plating']);
    await expect(page.locator('#orderRemove')).toBeDisabled();
    await expectCleanLayout(page);
  });

  test('over-allocating capacity starves the later orders', async ({ page }) => {
    await open(page, 'screen=economy&tab=industry');
    await page.locator('#queue tr.pick', { hasText: 'Mine' }).click();
    await page.locator('input[name="orderShare"]').fill('90');
    await page.locator('input[name="orderShare"]').dispatchEvent('change');
    const plating = page.locator('#queue tr.pick', { hasText: 'Hull plating' });
    await expect(plating).toContainText('Over capacity');
  });

  test('advancing the clock builds the queue and adds the installations to the colony', async ({ page }) => {
    await open(page, 'screen=economy&tab=industry');
    const mine = page.locator('#queue tr.pick', { hasText: 'Mine' });
    await expect(mine).toContainText('2 of 4');
    await expect(mine).toContainText('7 Apr 2087');
    await page.locator(MONTH).click();
    await expect(page.locator('#queue tr.pick', { hasText: 'Mine' })).toHaveCount(0);
    await page.locator('[data-tab="summary"]').click();
    await expect(page.locator('tr', { hasText: /^Mine10/ })).toBeVisible();
  });

  test('a stalled order says which mineral it waits for', async ({ page }) => {
    await open(page, 'screen=economy&tab=industry&colony=europa');
    await expect(page.locator('#queueEmpty')).toBeVisible();
    await page.locator('#items tr.pick', { hasText: 'Factory' }).click();
    await page.locator('#orderAdd').click();
    const row = page.locator('#queue tr.pick', { hasText: 'Factory' });
    await expect(row).toContainText('No factories');
  });

  test('mining output is mines times accessibility and depletes with the clock', async ({ page }) => {
    await open(page, 'screen=economy&tab=mining');
    const iron = page.locator('tr', { hasText: /^Iron/ });
    await expect(iron).toContainText('1,080,000');
    await expect(iron).toContainText('0.70');
    await expect(iron).toContainText('1,568');
    await page.locator(MONTH).click();
    await expect(iron).not.toContainText('1,080,000');
    await expect(iron).toContainText('1,960');
    await page.locator('#queueMines').click();
    await expect(page.locator('#chosen')).toHaveText('Mine');
  });

  test('a shipyard task is timed, can be queued and finishes with the clock', async ({ page }) => {
    await open(page, 'screen=economy&tab=shipyards');
    await expect(page.locator('#tasks tr.pick')).toHaveCount(1);
    await page.locator('#yardSlipway').click();
    await expect(page.locator('#tasks tr.pick')).toHaveCount(2);
    await expect(page.locator('#tasks tr.pick').nth(1)).toContainText('Add slipway');
    await expect(page.locator('#tasks tr.pick').nth(1)).toContainText(/\d{4}/);
    await page.locator('#tasks tr.pick').nth(1).click();
    await page.locator('#taskCancel').click();
    await expect(page.locator('#tasks tr.pick')).toHaveCount(1);
    for (let i = 0; i < 5; i++) await page.locator(MONTH).click();
    await expect(page.locator('#tasks tr.pick')).toHaveCount(0);
    await expect(page.locator('#yards tr.pick')).toContainText('25,000');
    await expectCleanLayout(page);
  });

  test('a ship build picks a class and a slipway and progresses', async ({ page }) => {
    await open(page, 'screen=economy&tab=shipyards&colony=luna');
    await expect(page.locator('#yards tr.pick')).toHaveCount(2);
    await expect(page.locator('#slipways tr.pick').nth(1)).toContainText('Free');
    await expect(page.locator('#yardBuild')).toBeEnabled();
    await page.locator('#yardBuild').click();
    const slip = page.locator('#slipways tr.pick').nth(1);
    await expect(slip).toContainText('Atlas');
    await expect(slip).toContainText('0%');
    await page.locator(MONTH).click();
    await expect(slip).not.toContainText(/\s0%/);
    await page.locator('#slipways tr.pick').nth(1).click();
    await page.locator('#yardCancelBuild').click();
    await expect(slip).toContainText('Free');
  });

  test('retooling needs an idle yard and then switches what it builds', async ({ page }) => {
    await open(page, 'screen=economy&tab=shipyards&colony=luna');
    await page.locator('#yards tr.pick').nth(1).click();
    await expect(page.locator('#yardRetool')).toBeDisabled();
    await page.locator('#yards tr.pick').nth(0).click();
    await page.locator('#slipways tr.pick').nth(0).click();
    await page.locator('#yardCancelBuild').click();
    await page.locator('#shipClass').selectOption('ark');
    await expect(page.locator('#yardRetool')).toBeEnabled();
    await page.locator('#yardRetool').click();
    await expect(page.locator('#yards tr.pick').first()).toContainText('Retool to Ark');
    for (let i = 0; i < 6; i++) await page.locator(MONTH).click();
    await expect(page.locator('#yards tr.pick').first()).toContainText('Ark');
  });

  test('toggles a shipping line subsidy', async ({ page }) => {
    await open(page, 'screen=economy&tab=wealth');
    await page.locator('tr.pick', { hasText: 'Ceres Star' }).click();
    await expect(page.locator('#lineSubsidy')).toHaveText('Subsidise');
    await page.locator('#lineSubsidy').click();
    await expect(page.locator('#lineSubsidy')).toHaveText('Stop subsidy');
    await expect(page.locator('tr.pick', { hasText: 'Ceres Star' })).toContainText('600 a year');
  });

  test('wealth moves with the clock', async ({ page }) => {
    await open(page, 'screen=economy&tab=wealth');
    const wealth = page.locator('dl dt', { hasText: /^Wealth$/ }).locator('xpath=following-sibling::dd[1]');
    await expect(wealth).toHaveText('18,400');
    await page.locator(MONTH).click();
    await expect(wealth).not.toHaveText('18,400');
  });
});

test.describe('the colony screen', () => {
  test('picks a colony and agrees with the economy screen', async ({ page }) => {
    await open(page, 'screen=colony');
    const people = page.locator('dl dt', { hasText: /^People$/ }).locator('xpath=following-sibling::dd[1]');
    await expect(page.locator('[data-screen="colony"] .pan > h2').first()).toContainText('Mars');
    await expect(people).toHaveText('2.4 M');
    await page.locator('#colonyPick').selectOption('luna');
    await expect(page.locator('[data-screen="colony"] .pan > h2').first()).toContainText('Luna');
    await expect(people).toHaveText('400,000');
    await expect(
      page.locator('dt', { hasText: /^Mines$/ }).locator('xpath=following-sibling::dd[1]')
    ).toHaveText('6');
    await expectCleanLayout(page);
    await page.locator('#openEconomy').click();
    await expect(page.locator('[data-screen="economy"]')).toBeVisible();
    await expect(page.locator('#colonyTree [data-colony="luna"]')).toHaveClass(/on/);
    await page.locator('[data-tab="summary"]').click();
    await expect(pane(page)).toContainText('400,000');
  });

  test('shows the numbers the economy changes', async ({ page }) => {
    await open(page, 'screen=economy&tab=industry');
    await page.locator(MONTH).click();
    await page.locator('#openColony').click();
    await expect(page.locator('[data-screen="colony"]')).toBeVisible();
    await expect(
      page.locator('dt', { hasText: /^Mines$/ }).locator('xpath=following-sibling::dd[1]')
    ).toHaveText('10');
  });
});
