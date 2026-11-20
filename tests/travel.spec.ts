import { expect, test, type Page } from '@playwright/test';

const MONTH = '[data-step="2592000"]';

async function open(page: Page, query: string) {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

const goTo = (page: Page, screen: string) => page.locator(`[data-nav="${screen}"]`).click();
const tab = (page: Page, id: string) => page.locator(`[data-tab="${id}"]`).click();
const add = (page: Page, id: string) => page.locator(`[data-part="${id}"] button`).click();

async function setCount(page: Page, id: string, n: number) {
  const input = page.locator(`[data-count="${id}"]`);
  await input.fill(String(n));
  await input.press('Tab');
}

async function design(page: Page, name: string, role: string, parts: [string, string, number][]) {
  await page.locator('[data-act="new"]').click();
  await page.locator('#clsName').fill(name);
  await page.locator('#clsRole').selectOption(role);
  for (const [, id, n] of parts) {
    await add(page, id);
    await setCount(page, id, n);
  }
  await expect(page.locator('#issues .error')).toHaveCount(0);
  await page.locator('[data-act="lock"]').click();
  await expect(page.locator('#clsLocked')).toBeVisible();
}

test.describe('leaving Earth', () => {
  test('designs ships with boosters, builds them, launches one, founds a station and delivers cargo', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await open(page, 'screen=classes');
    await design(page, 'Shuttle', 'freighter', [
      ['propulsion', 'chemical_engine_methalox', 1],
      ['structure', 'propellant_tank', 3],
      ['structure', 'cargo_bay', 1],
      ['propulsion', 'booster', 1]
    ]);
    await design(page, 'Orbiter', 'freighter', [
      ['propulsion', 'chemical_engine_methalox', 1],
      ['structure', 'propellant_tank', 6],
      ['structure', 'structure_truss', 1],
      ['structure', 'cargo_bay', 2],
      ['propulsion', 'booster', 2]
    ]);
    await expect(page.locator('#classList button')).toHaveCount(2);

    await goTo(page, 'economy');
    await tab(page, 'production');
    await page
      .locator('#groups button.ui-tile', { hasText: 'Stainless steel' })
      .filter({ hasText: 'Alloy works' })
      .first()
      .click();
    await page.getByRole('button', { name: 'GRCop copper-chromium-niobium alloy', exact: true }).click();
    await page.locator('input[name="switchCount"]').fill('2');
    await page.locator('#recipeSwitch').click();

    await tab(page, 'yard');
    await expect(page.locator('#yardQueue button')).toHaveCount(0);
    for (const name of ['Shuttle', 'Orbiter']) {
      await page.locator('#yardDesigns button', { hasText: name }).click();
      await page.locator('#yardAdd').click();
    }
    await expect(page.locator('#yardQueue button')).toHaveCount(2);
    await page.locator('#yardQueue button').first().click();
    await expect(page.locator('#yardQueue button').first()).toContainText('Shuttle');
    await page.locator('#yardDown').click();
    await expect(page.locator('#yardQueue button').first()).toContainText('Orbiter');
    await page.locator('#yardUp').click();
    await expect(page.locator('#yardQueue button').first()).toContainText('Shuttle');
    await page.locator('#yardPause').click();
    await expect(page.locator('#yardPause')).toContainText('Resume');
    await page.locator('#yardPause').click();
    await expect(page.locator('#yardPause')).toContainText('Pause');
    await expect(page.locator('input[name="yardPercent"]')).toHaveValue('100');
    await page.locator('input[name="yardPercent"]').fill('50');
    await page.locator('input[name="yardPercent"]').dispatchEvent('change');
    await page.locator('#yardQueue button').nth(1).click();
    await expect(page.locator('input[name="yardPercent"]')).toHaveValue('0');
    await page.locator('input[name="yardPercent"]').fill('80');
    await page.locator('input[name="yardPercent"]').dispatchEvent('change');
    await expect(page.locator('input[name="yardPercent"]')).toHaveValue('50');
    await expect(page.locator('.sbar i')).toHaveCount(2);
    await expectCleanLayout(page);
    for (let i = 0; i < 2; i++) await page.locator(MONTH).click();
    await expect(page.locator('#yardQueue button')).toHaveCount(0);

    await tab(page, 'ships');
    await expect(page.locator('#vessels button')).toHaveCount(2);

    await tab(page, 'launch');
    await expect(page.locator('#launchShips button')).toHaveCount(2);
    await page.locator('#launchShips button', { hasText: 'Orbiter' }).click();
    await expect(page.locator('#launchBoosters')).toContainText('2,');
    await page.locator('#launchPayload [data-filter="cargo"]').click();
    for (const [material, kg] of [
      ['Stainless steel', 1500],
      ['Aluminium', 200],
      ['Copper', 100],
      ['Stainless steel', 1000]
    ] as const) {
      await page.locator('#launchMaterial').selectOption({ label: material });
      await page.locator('input[name="launchAmount"]').fill(String(kg));
      await page.locator('#launchCargoAdd').click();
    }
    await expect(page.locator('#launchCargo .ui-rate')).toHaveCount(3);
    await expect(page.locator('#launchCargo')).toContainText('2.5 t');
    await expect(page.locator('#launchPlan')).toContainText('Thrust to weight');
    await expect(page.locator('#launchReasons')).toHaveCount(0);
    const ceiling = page.locator('#launchCeiling [data-ceiling]');
    const lifts = Number(await ceiling.getAttribute('data-ceiling'));
    expect(lifts).toBeGreaterThan(2_800);
    await expect(ceiling).toContainText('2.5 t of 8 t');
    await page.locator('#launchShips button', { hasText: 'Orbiter' }).click();
    await expect(page.locator('#launchPlan')).toHaveCount(0);
    await page.locator('#launchShips button', { hasText: 'Orbiter' }).click();
    await expect(ceiling).toHaveAttribute('data-ceiling', String(lifts));
    await expect(page.locator('#launchGo')).toBeEnabled();
    await expectCleanLayout(page);
    await page.locator('#launchGo').click();
    await expect(page.locator('#launchLog .entry')).toHaveCount(1);
    await expect(page.locator('#launchLog')).toContainText('2 boosters dropped');

    await tab(page, 'ships');
    const orbiter = page.locator('#vessels button', { hasText: 'Earth orbit' });
    await expect(orbiter).toHaveCount(1);
    await orbiter.click();
    await expect(page.locator('#foundBuilding button', { hasText: 'Fibre works' })).toHaveCount(1);
    await page.locator('#foundBuilding button', { hasText: 'Fibre works' }).click();
    await expect(page.locator('#foundGo')).toBeEnabled();
    await page.locator('#foundGo').click();

    await expect(page.locator('#siteList [data-site]')).toHaveCount(2);
    await expect(page.locator('#siteList [data-site="orbit-earth"]')).toContainText('orbital station');
    await tab(page, 'stockpiles');
    await expect(page.locator('#stockpiles button.ui-tile', { hasText: 'Stainless steel' })).toContainText(
      '1 t'
    );
    await expectCleanLayout(page);
  });

  test('a scripted player reaches milestone 3 with a station in orbit', async ({ page }) => {
    test.setTimeout(180_000);
    await open(page, 'screen=economy&test=1');
    const report = await page.evaluate(() => window.space4xTest!.play(3));
    expect(report.reached.map((r: { number: number }) => r.number)).toEqual([1, 2, 3]);
    const state = await page.evaluate(() => window.space4xTest!.state());
    expect(state.done).toEqual([1, 2, 3]);
    expect(state.sites).toEqual(['earth', 'orbit-earth']);
    expect(state.launches).toBe(2);
    await page.locator(MONTH).click();
    await expect(page.locator('#siteList [data-site]')).toHaveCount(2);
  });
});

test.describe('ships and supply tabs', () => {
  test('the Ships tab filters by state and gives a ship an order', async ({ page }) => {
    await open(page, 'screen=economy&tab=ships&scenario=travel');
    await expect(page.locator('#vessels button')).toHaveCount(6);
    await page.locator('[data-filter="trip"]').click();
    await expect(page.locator('#vessels button')).toHaveCount(1);
    await page.locator('[data-filter="all"]').click();
    await page.locator('#vessels button', { hasText: 'Orbiter 2' }).click();
    await page.locator('#orderType [data-filter="wait"]').click();
    await page.locator('input[name="orderHours"]').fill('5');
    await page.locator('#orderAdd').click();
    await expect(page.locator('#vesselOrders')).toContainText('Wait');
    await page.locator('#orderRemove').click();
    await expect(page.locator('#noOrders')).toBeVisible();
    await expectCleanLayout(page);
  });

  test('the Ships tab loads a manifest in one order and unloads all cargo', async ({ page }) => {
    await open(page, 'screen=economy&tab=ships&scenario=travel');
    await page.locator('#vessels button', { hasText: /Tug 5Tug/ }).click();
    await page.locator('#orderType [data-filter="load"]').click();
    await page.locator('#orderAll').uncheck();
    await page.locator('#orderItem').selectOption('cargo:stainless_steel');
    await page.locator('input[name="orderAmount"]').fill('500');
    await expect(page.locator('#loadPreview li')).toHaveCount(1);
    await expect(page.locator('#loadPreview')).toContainText('takes 0.5 t');
    await page.locator('#manifestAdd').click();
    await page.locator('#orderItem').selectOption('cargo:food_ration');
    await page.locator('input[name="orderAmount"]').fill('100000');
    await page.locator('#manifestAdd').click();
    await expect(page.locator('#loadPreview li')).toHaveCount(2);
    await expect(page.locator('#loadPreview li').nth(1)).toContainText('of 100 t');
    await page.locator('#loadPreview [data-manifest-drop="0"]').click();
    await expect(page.locator('#loadPreview li')).toHaveCount(1);
    await page.locator('#orderItem').selectOption('cargo:stainless_steel');
    await page.locator('#manifestAdd').click();
    await page.locator('#orderAdd').click();
    await expect(page.locator('#vesselOrders .ord')).toHaveCount(1);
    await expect(page.locator('#vesselOrders')).toContainText('Load 2 items');
    await page.locator('#vesselOrders .ord').hover();
    await expect(page.locator('#ui-tip')).toContainText('Food ration');
    await expect(page.locator('#ui-tip')).toContainText('Stainless steel');
    await page.locator('#orderType [data-filter="unload"]').click();
    await expect(page.locator('#orderItem option').first()).toHaveText('All cargo');
    await page.locator('#orderItem').selectOption('all-cargo');
    await expect(page.locator('input[name="orderAmount"]')).toHaveCount(0);
    await page.locator('#orderAdd').click();
    await expect(page.locator('#vesselOrders .ord')).toHaveCount(2);
    await expect(page.locator('#vesselOrders .ord').nth(1)).toContainText('Unload all cargo');
    await expectCleanLayout(page);
  });

  test('the Supply tab shows what propellant a station can load and runs several materials', async ({
    page
  }) => {
    await open(page, 'screen=economy&tab=supply&colony=orbit-earth&scenario=travel');
    await expect(page.locator('#propellantLoad .ui-tile')).toHaveCount(3);
    const methalox = page.locator('#propellantLoad .ui-tile', { hasText: 'Methane and oxygen' });
    await expect(methalox).toContainText('549 t');
    await methalox.hover();
    await expect(page.locator('#ui-tip')).toContainText('liquid methane and liquid oxygen, 1 : 3.6 by mass');
    const kerolox = page.locator('#propellantLoad .ui-tile', { hasText: 'Kerosene' });
    await expect(kerolox).toContainText('Cannot load');
    await kerolox.hover();
    await expect(page.locator('#ui-tip')).toContainText('Short of rp-1 kerosene');
    await page.locator('#supplyTable button', { hasText: 'Stainless steel' }).click();
    await page.locator('#supplySource').selectOption({ label: 'Luna orbital station' });
    await page.locator('#supplyShip button').first().click();
    await page.locator('input[name="supplyAmount"]').fill('1000');
    await page.locator('#supplyAdd').click();
    await page.locator('#supplyTable button', { hasText: 'Food ration' }).click();
    await expect(page.locator('#supplySource')).toBeDisabled();
    await page.locator('input[name="supplyAmount"]').fill('200');
    await page.locator('#supplyAdd').click();
    await expect(page.locator('#supplyManifest li')).toHaveCount(2);
    await expect(page.locator('#supplyHold')).toContainText('1.2 t of');
    await page.locator('#supplyStart').click();
    await expect(page.locator('#supplyMessage')).toHaveCount(0);
    await expect(page.locator('#supplyRuns button.stop')).toHaveCount(1);
    await expect(page.locator('#supplyRuns')).toContainText('and 1 more');
    await expect(page.locator('#supplyRuns')).toContainText('1.2 t');
    await expect(page.locator('#supplyManifest')).toHaveCount(0);
    await expectCleanLayout(page);
  });

  test('the Supply tab lists what a station needs and refuses a run from a launch site', async ({ page }) => {
    await open(page, 'screen=economy&tab=supply&colony=orbit-earth&scenario=travel');
    await expect(page.locator('#supplyTable button')).toHaveCount(4);
    await page.locator('#supplyTable button', { hasText: 'Stainless steel' }).click();
    await expect(page.locator('#supplySource option')).toHaveText(['Earth', 'Luna orbital station']);
    await expect(page.locator('#supplyShip button')).toHaveCount(4);
    await page.locator('#supplyShip button').first().click();
    await page.locator('#supplyStart').click();
    await expect(page.locator('#supplyMessage')).toContainText('launch site');
    await expect(page.locator('#supplyRuns')).toHaveCount(0);
    await expectCleanLayout(page);
  });
});

test.describe('ships on the map', () => {
  test('a ship on a trip is listed, selected and shown in the Selection window', async ({ page }) => {
    await open(page, 'sel=ship:ship-4&scenario=travel');
    await expect(page.locator('#shipTrip')).toContainText('Luna orbit');
    await expect(page.locator('#shipOrders')).toContainText('Dock at Luna orbital station');
    await expect(page.locator('#shipList tr.pick')).toHaveCount(6);
    await page.locator('#baseList tr.pick', { hasText: 'Earth orbital station' }).click();
    await expect(page.locator('#w-sel')).toContainText('Orbital station');
    await expect(page.locator('#w-sel')).toContainText('6 of 6 berths');
    await page.locator('[data-go="ships"]').click();
    await expect(page.locator('[data-screen="economy"]')).toBeVisible();
    await expectCleanLayout(page);
  });
});
