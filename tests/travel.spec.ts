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
const add = (page: Page, id: string) => page.locator(`[data-add="${id}"]`).click();

async function setCount(page: Page, id: string, n: number) {
  const input = page.locator(`[data-count="${id}"]`);
  await input.fill(String(n));
  await input.press('Tab');
}

async function design(page: Page, name: string, role: string, parts: [string, string, number][]) {
  await page.locator('[data-act="new"]').click();
  await page.locator('#clsName').fill(name);
  await page.locator('#clsRole').selectOption(role);
  for (const [kind, id, n] of parts) {
    await tab(page, kind);
    await add(page, id);
    await setCount(page, id, n);
  }
  await expect(page.locator('#issues .error')).toHaveCount(0);
  await page.locator('[data-act="lock"]').click();
  await expect(page.locator('#clsLocked')).toBeVisible();
}

const row = (page: Page, table: string, ...cells: string[]) => {
  let r = page.locator(`${table} tr.pick`);
  for (const c of cells) r = r.filter({ has: page.locator('td', { hasText: c }) });
  return r;
};

test.describe('leaving Earth', () => {
  test('designs a two-stage launcher and a station module, builds them, launches, founds a station and delivers cargo', async ({
    page
  }) => {
    test.setTimeout(120_000);
    await open(page, 'screen=classes');
    await design(page, 'Booster', 'launcher', [
      ['propulsion', 'chemical_engine_methalox', 3],
      ['structure', 'propellant_tank', 25],
      ['structure', 'structure_truss', 1],
      ['structure', 'landing_legs', 1]
    ]);
    await design(page, 'Orbiter', 'freighter', [
      ['propulsion', 'chemical_engine_methalox', 1],
      ['structure', 'propellant_tank', 6],
      ['structure', 'structure_truss', 1],
      ['structure', 'cargo_bay', 2]
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
    await expect(page.locator('#yardEmpty')).toBeVisible();
    for (const name of ['Booster', 'Orbiter']) {
      await page.locator('#yardDesign').selectOption({ label: name });
      await page.locator('#yardAdd').click();
    }
    await expect(page.locator('#yardQueue tr.pick')).toHaveCount(2);
    await expectCleanLayout(page);
    for (let i = 0; i < 2; i++) await page.locator(MONTH).click();
    await expect(page.locator('#yardEmpty')).toBeVisible();

    await tab(page, 'ships');
    await expect(page.locator('#vessels tr.pick')).toHaveCount(2);

    await tab(page, 'launch');
    const names = await page.locator('#launchStage option').allTextContents();
    expect(names.some((n) => n.startsWith('Booster'))).toBe(true);
    await page.locator('#launchStage').selectOption({ label: names.find((n) => n.startsWith('Booster'))! });
    await page.locator('#launchAdd').click();
    const upper = (await page.locator('#launchStage option').allTextContents()).find((n) =>
      n.startsWith('Orbiter')
    )!;
    await page.locator('#launchStage').selectOption({ label: upper });
    await page.locator('#launchAdd').click();
    await expect(page.locator('#stages tr')).toHaveCount(3);
    await page.locator('#launchPayload').selectOption('cargo');
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
    await expect(page.locator('#launchCargo')).toContainText('Stainless steel');
    await expect(page.locator('#launchPlan')).toContainText('Thrust to weight');
    await expect(page.locator('#launchReasons')).toHaveCount(0);
    await expect(page.locator('#launchGo')).toBeEnabled();
    await expectCleanLayout(page);
    await page.locator('#launchGo').click();
    await expect(page.locator('#launchLog tr')).toHaveCount(2);
    await expect(page.locator('#launchLog')).toContainText('1 back, 0 lost');

    await tab(page, 'ships');
    const orbiter = page.locator('#vessels tr.pick', { hasText: 'Earth orbit' });
    await expect(orbiter).toHaveCount(1);
    await orbiter.click();
    await expect(page.locator('#foundBuilding option', { hasText: 'Fibre works' })).toHaveCount(1);
    await page.locator('#foundBuilding').selectOption({ label: 'Fibre works' });
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
    await expect(page.locator('.chip[title="Milestones reached"]')).toContainText('3/29');
    await expect(page.locator('#siteList [data-site]')).toHaveCount(2);
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
