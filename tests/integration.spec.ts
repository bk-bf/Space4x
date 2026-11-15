import { expect, test, type Locator, type Page } from '@playwright/test';

const MONTH = '[data-step="2592000"]';

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

const goTo = (page: Page, screen: string) => page.locator(`[data-nav="${screen}"]`).click();
const chip = (page: Page, title: string) => page.locator(`#chips .chip[title="${title}"]`);
const mapLabel = (page: Page, text: string) =>
  page.locator('#mapLabels span').filter({ hasText: new RegExp(`^${text}( ×\\d+)?$`) });
const term = (page: Page, text: RegExp): Locator =>
  page.locator('dl dt', { hasText: text }).locator('xpath=following-sibling::dd[1]');
const heading = (page: Page, screen: string) => page.locator(`[data-screen="${screen}"] .pan > h2`).first();

test.describe('classes', () => {
  test('a class designed and saved is retooled for and built at a shipyard', async ({ page }) => {
    await open(page, 'screen=classes');
    await page.locator('main.screen [data-act="new"]').click();
    await page.locator('#clsName').fill('Dray');
    await page.locator('main.screen [data-act="save"]').click();
    await expect(page.locator('#clsDirty')).toHaveCount(0);

    await goTo(page, 'economy');
    await page.locator('#colonyTree [data-colony="earth"]').click();
    await page.locator('[data-tab="shipyards"]').click();
    await expect(page.locator('#shipClass option', { hasText: 'Dray' })).toHaveCount(1);
    await page.locator('#shipClass').selectOption({ label: 'Dray, Unassigned' });
    await expect(page.locator('#yardBuild')).toBeDisabled();
    await page.locator('#yardRetool').click();
    await expect(page.locator('#yards tr.pick').first()).toContainText('Retool to Dray');
    for (let i = 0; i < 6; i++) await page.locator(MONTH).click();
    await expect(page.locator('#yards tr.pick').first()).toContainText('Dray');
    await expect(page.locator('#yardBuild')).toBeEnabled();
    await page.locator('#yardBuild').click();
    await expect(page.locator('#slipways tr.pick').first()).toContainText('Dray');

    await goTo(page, 'classes');
    await expect(page.locator('main.screen [data-act="delete"]')).toBeDisabled();
  });
});

test.describe('cross-screen buttons', () => {
  test('a body on the map opens that colony in Economy and in Colony, whatever the URL said', async ({
    page
  }) => {
    await open(page, 'screen=economy&colony=luna');
    await expect(page.locator('#colonyTree [data-colony="luna"]')).toHaveClass(/on/);
    await goTo(page, 'map');
    await mapLabel(page, 'Ceres').click();
    await page.locator('#w-sel [data-go="economy"]').click();
    await expect(page.locator('[data-screen="economy"]')).toBeVisible();
    await expect(page.locator('#colonyTree [data-colony="ceres"]')).toHaveClass(/on/);
    await expect(page.locator('#colonyTree [data-colony="luna"]')).not.toHaveClass(/on/);

    await goTo(page, 'map');
    await mapLabel(page, 'Mars').click();
    await page.locator('#w-sel [data-go="colony"]').click();
    await expect(heading(page, 'colony')).toContainText('Mars');
    await expect(page.locator('#colonyPick')).toHaveValue('mars');
    await page.locator('#openEconomy').click();
    await expect(page.locator('#colonyTree [data-colony="mars"]')).toHaveClass(/on/);
    await page.locator('#openColony').click();
    await expect(heading(page, 'colony')).toContainText('Mars');
  });

  test('Galaxy opens Sol, the one mapped system, and counts what the world holds', async ({ page }) => {
    await open(page, 'screen=galaxy&sys=sol');
    await expect(term(page, /^Colonies$/)).toHaveText('1');
    await expect(term(page, /^Fleets$/)).toHaveText('0');
    await page.locator('[data-act="open-map"]').click();
    await expect(page.locator('#sysSel')).toHaveValue('sol');
    await goTo(page, 'galaxy');
    await page.locator('tr.pick', { hasText: 'Alpha Centauri' }).click();
    await expect(term(page, /^Colonies$/)).toHaveText('?');
    await expect(page.locator('[data-act="open-map"]')).toBeDisabled();
  });
});

test.describe('the top bar', () => {
  test('wealth, people and shipyards agree with the Economy screen and follow it', async ({ page }) => {
    await open(page, 'screen=economy&tab=wealth');
    const wealth = term(page, /^Wealth$/);
    await expect(wealth).toHaveText('18,400');
    await expect(chip(page, 'Wealth')).toHaveText('18,400');
    await expect(chip(page, 'People')).toHaveText('1.2 bn');
    await expect(page.locator('#colonyTree [data-colony="earth"]')).toContainText('1.2 bn');

    await page.locator(MONTH).click();
    const moved = (await wealth.textContent())!;
    expect(moved).not.toBe('18,400');
    await expect(chip(page, 'Wealth')).toHaveText(moved);

    const before = (await chip(page, 'Shipyards busy').textContent())!;
    const [busy, total] = before.split('/').map(Number);
    await page.locator('#colonyTree [data-colony="earth"]').click();
    await page.locator('[data-tab="shipyards"]').click();
    await page.locator('#yardBuild').click();
    await expect(chip(page, 'Shipyards busy')).toHaveText(`${busy! + 1}/${total}`);
  });

  test('every chip is an icon with a title and a value', async ({ page }) => {
    await open(page);
    await expect(page.locator('#chips .chip')).toHaveCount(6);
    for (const title of ['Wealth', 'People', 'Fuel stock', 'Running low', 'Labs busy', 'Shipyards busy']) {
      await expect(chip(page, title).locator('svg, canvas, .ic').first()).toBeVisible();
      await expect(chip(page, title)).toHaveText(/\S/);
    }
  });
});

test.describe('the map labels', () => {
  test('no label sits on the Sun', async ({ page }) => {
    await open(page, 'zoom=inner');
    await expect(mapLabel(page, 'Sun')).toHaveCount(1);
    const overlaps = await page.evaluate(() => {
      const cores = [[255, 250, 224]];
      const cv = document.querySelector<HTMLCanvasElement>('#mapCv')!;
      const r = cv.getBoundingClientRect();
      const k = r.width / cv.width;
      const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      const stars = cores.flatMap((c) => {
        let x0 = Infinity,
          y0 = Infinity,
          x1 = -Infinity,
          y1 = -Infinity;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] !== c[0] || d[i + 1] !== c[1] || d[i + 2] !== c[2]) continue;
          const x = (i / 4) % cv.width,
            y = Math.floor(i / 4 / cv.width);
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
        return x1 < 0 ? [] : [{ x0: x0 * k, y0: y0 * k, x1: x1 * k, y1: y1 * k }];
      });
      const labels = [...document.querySelectorAll<HTMLElement>('#mapLabels span:not([hidden])')].map((s) => {
        const b = s.getBoundingClientRect();
        return { text: s.textContent, x0: b.x - r.x, y0: b.y - r.y, x1: b.right - r.x, y1: b.bottom - r.y };
      });
      return {
        stars: stars.length,
        hits: labels
          .filter((l) => stars.some((s) => l.x0 < s.x1 && l.x1 > s.x0 && l.y0 < s.y1 && l.y1 > s.y0))
          .map((l) => l.text)
      };
    });
    expect(overlaps.stars).toBeGreaterThan(0);
    expect(overlaps.hits).toEqual([]);
  });
});
