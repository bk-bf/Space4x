import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const ASTEROIDS: { name: string; type: string }[] = JSON.parse(
  readFileSync('src/lib/game/data/asteroids.json', 'utf8')
);
const win = (page: Page, id: string) => page.locator(`#w-${id}`);
const heading = (page: Page) => win(page, 'sel').locator('.tb span').first();
const labelOf = (page: Page, target: string) => page.locator(`#mapLabels span[data-target="${target}"]`);
const MONTH = '[data-step="2592000"]';

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

const ship = (page: Page, name: string) => page.locator('#vessels button', { hasText: name });

const row = (page: Page, table: string, ...cells: string[]) => {
  let r = page.locator(`${table} tr.pick`);
  for (const c of cells) r = r.filter({ has: page.locator('td', { hasText: c }) });
  return r;
};

test.describe('asteroids on the map', () => {
  test('are not labelled across the whole system and do not flood the view', async ({ page }) => {
    await open(page);
    await page.waitForTimeout(500);
    const named = await page
      .locator('#mapLabels span:not([hidden])')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-target') ?? ''));
    const rocks = ASTEROIDS.map((a) => a.name);
    const shown = await page
      .locator('#mapLabels span:not([hidden])')
      .evaluateAll((els, names) => els.filter((e) => names.includes(e.textContent ?? '')).length, rocks);
    expect(shown).toBe(0);
    expect(named).toContain('body:neptune');
    await expectCleanLayout(page);
  });

  test('are named when zoomed toward the belt and selected by their label', async ({ page }) => {
    await open(page, 'zoom=belt');
    await page.waitForTimeout(600);
    const names = await page
      .locator('#mapLabels span:not([hidden])')
      .evaluateAll((els) => els.map((e) => e.getAttribute('data-target') ?? ''));
    const rocks = names.filter((t) => t.startsWith('body:') && !['body:mars', 'body:earth'].includes(t));
    expect(rocks.length).toBeGreaterThan(8);
    expect(rocks.length).toBeLessThan(ASTEROIDS.length);
    await expect(labelOf(page, 'body:ceres')).toBeVisible();
    await labelOf(page, 'body:ceres').click();
    await expect(heading(page)).toHaveText('Ceres');
    await expect(win(page, 'sel').locator('#asteroidFacts')).toContainText('Carbonaceous');
    await expect(win(page, 'sel').locator('#asteroidFacts')).toContainText('Mass');
    await expect(win(page, 'sel')).toContainText('Not surveyed');
    await expect(win(page, 'sel').locator('#regionsUnknown')).toBeVisible();
    await expectCleanLayout(page);
  });

  test('are listed in the Bodies tab, filterable by group and class', async ({ page }) => {
    await open(page);
    await page.locator('#w-side [data-tab="bodies"]').click();
    await expect(page.locator('#rockList tr.pick')).toHaveCount(ASTEROIDS.length);
    await expectCleanLayout(page);
    await page.locator('#rockFilter').selectOption('metallic');
    await expect(page.locator('#rockList tr.pick')).toHaveCount(
      ASTEROIDS.filter((a) => a.type === 'metallic').length
    );
    await row(page, '#rockList', 'Psyche').click();
    await expect(heading(page)).toHaveText('Psyche');
    await expect(win(page, 'sel').locator('#asteroidFacts')).toContainText('Metallic');
    await page.locator('#rockFilter').selectOption('near');
    await expect(row(page, '#rockList', 'Bennu')).toHaveCount(1);
    await expect(row(page, '#rockList', 'Psyche')).toHaveCount(0);
  });

  test('can be shown from the selection window', async ({ page }) => {
    await open(page, 'sel=body:bennu');
    await page.locator('#w-side [data-tab="display"]').click();
    await win(page, 'sel').locator('[data-go="show"]').click();
    await expect
      .poll(async () => Number(await page.locator('#zoomNow').getAttribute('data-mpp')))
      .toBeLessThan(50);
    await expectCleanLayout(page);
  });
});

test.describe('the Moon', () => {
  test('starts surveyed and shows its regions with grades', async ({ page }) => {
    await open(page, 'sel=body:luna');
    const sel = win(page, 'sel');
    await expect(sel).toContainText('Survey');
    await expect(sel.locator('#regions [data-region]')).toHaveCount(4);
    await expect(sel.locator('[data-region="luna-south-pole"]')).toContainText('Water');
    await expect(sel.locator('[data-region="luna-maria"]')).toContainText('Ilmenite');
    await expect(sel.locator('[data-region="luna-highlands"]')).toContainText('Anorthite');
    await expectCleanLayout(page);
  });
});

test.describe('survey through the UI', () => {
  test('a probe in orbit of Mars reveals its regions after the survey time', async ({ page }) => {
    test.setTimeout(90_000);
    await open(page, 'sel=body:mars');
    await expect(win(page, 'sel').locator('#regionsUnknown')).toBeVisible();
    await open(page, 'screen=economy&tab=ships&scenario=belt');
    await ship(page, 'Survey probe 1').click();
    await page.locator('#orderType [data-filter="survey"]').click();
    await page.locator('#orderSurvey').selectOption({ label: 'Mars' });
    await page.locator('#orderAdd').click();
    await expect(page.locator('#vesselOrders')).toContainText('Survey Mars');
    await expectCleanLayout(page);
    await page.locator(MONTH).click();
    await expect(page.locator('#vesselOrders')).toContainText('Survey Mars');
    await page.locator(MONTH).click();
    await page.locator(MONTH).click();
    await expect(page.locator('#noOrders')).toBeVisible();
    await page.locator('[data-nav="map"]').click();
    await page.locator('#w-side [data-tab="bodies"]').click();
    await row(page, '#w-side', 'Mars').first().click();
    await expect(heading(page)).toHaveText('Mars');
    await expect(win(page, 'sel').locator('#regionsUnknown')).toHaveCount(0);
    await expect(win(page, 'sel').locator('[data-region="mars-polar-layered-deposits"]')).toContainText(
      'Water'
    );
    await expect(win(page, 'sel')).toContainText('Done');
    await expectCleanLayout(page);
  });
});

test.describe('food at an outpost', () => {
  test('the Summary counts the crew in calories and how long the rations last', async ({ page }) => {
    await open(page, 'screen=economy&colony=luna&scenario=belt&outpost=1');
    const term = (text: RegExp) =>
      page.locator('dl dt', { hasText: text }).locator('xpath=following-sibling::dd[1]');
    await expect(term(/^Calories made$/)).toHaveText('0 kcal a day against 11.2 k kcal needed');
    await expect(term(/^Calorie shares$/)).toHaveText('Food ration 100%');
    await expect(term(/^Food in store$/)).toHaveText('5.00 t, 3.4 y');
  });
});

test.describe('sampling through the UI', () => {
  test('a sample order is offered and a probe without a sampling arm is told so', async ({ page }) => {
    await open(page, 'screen=economy&tab=ships&scenario=belt');
    await ship(page, 'Survey probe 2').click();
    await page.locator('#orderType [data-filter="sample"]').click();
    await page.locator('#orderAdd').click();
    await expect(page.locator('#vesselOrders')).toContainText('Take a sample');
    await expect(page.locator('#vesselBlocked')).toContainText('no sampling arm');
    await expectCleanLayout(page);
  });
});

test.describe('founding in a region', () => {
  test('asks for the region, offers what it can work, and shows the region in the economy', async ({
    page
  }) => {
    test.setTimeout(90_000);
    await open(page, 'screen=economy&tab=ships&scenario=belt');
    await ship(page, 'Lander').click();
    await expect(page.locator('#foundRegion option')).toHaveText([
      'South polar cold traps',
      'Maria',
      'Highlands',
      'Procellarum KREEP terrane'
    ]);
    await page.locator('#foundRegion').selectOption({ label: 'Maria' });
    const buildings = page.locator('#foundBuilding button');
    await expect(buildings.filter({ hasText: 'Regolith excavator' })).toHaveCount(1);
    await expect(buildings.filter({ hasText: 'Ice mine' })).toHaveCount(0);
    await page.locator('#foundRegion').selectOption({ label: 'South polar cold traps' });
    await expect(buildings.filter({ hasText: 'Ice mine' })).toHaveCount(1);
    await page.locator('#foundRegion').selectOption({ label: 'Maria' });
    await buildings.filter({ hasText: 'Regolith excavator' }).click();
    await expectCleanLayout(page);
    await page.locator('#foundGo').click();
    await expect(page.locator('#siteRegion')).toContainText('Maria');
    await expect(page.locator('#siteRegion')).toContainText('Ilmenite');
    await page.locator('[data-tab="production"]').click();
    await expect(page.locator('#groups')).toContainText('Regolith excavator');
    await expect(page.locator('#groups')).toContainText('Grade');
    await expectCleanLayout(page);
  });

  test('shows the region and the grade an extraction group applies', async ({ page }) => {
    await open(page, 'screen=economy&tab=production&colony=luna&scenario=belt&outpost=1');
    await expect(page.locator('#groups')).toContainText('Ice mine');
    await expect(page.locator('#groups')).toContainText('2.00');
    await page.locator('[data-tab="summary"]').click();
    await expect(page.locator('#siteRegion')).toContainText('South polar cold traps');
    await expect(page.locator('#siteRegion')).toContainText('Water');
    await expectCleanLayout(page);
  });
});
