import { expect, test, type Locator, type Page } from '@playwright/test';

const MONTH = '[data-step="2592000"]';

async function open(page: Page, query = '') {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

const goTo = (page: Page, screen: string) => page.locator(`[data-nav="${screen}"]`).click();
const chip = (page: Page, title: string) => page.locator(`#chips .chip[aria-label^="${title}"]`);
const mapLabel = (page: Page, text: string) =>
  page.locator('#mapLabels span').filter({ hasText: new RegExp(`^${text}( ×\\d+)?$`) });
const term = (page: Page, text: RegExp): Locator =>
  page.locator('dl dt', { hasText: text }).locator('xpath=following-sibling::dd[1]');

test.describe('classes', () => {
  test('a class designed from nothing can be named and deleted while nothing builds it', async ({ page }) => {
    await open(page, 'screen=classes');
    await page.locator('main.screen [data-act="new"]').click();
    await page.locator('#clsName').fill('Dray');
    await expect(page.locator('#classList [data-class]')).toHaveText(['Dray']);
    await expect(page.locator('main.screen [data-act="delete"]')).toBeEnabled();
  });
});

test.describe('cross-screen buttons', () => {
  test('Earth on the map opens its site in Economy', async ({ page }) => {
    await open(page, 'screen=economy&tab=stockpiles');
    await goTo(page, 'map');
    await mapLabel(page, 'Earth').click();
    await expect(page.locator('#w-sel [data-go="colony"]')).toHaveCount(0);
    await page.locator('#w-sel [data-go="economy"]').click();
    await expect(page.locator('[data-screen="economy"]')).toBeVisible();
    await expect(page.locator('#siteList [data-site="earth"]')).toHaveClass(/sel/);
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
  test('people, power and milestones agree with the Economy screen and follow the clock', async ({
    page
  }) => {
    await open(page, 'screen=economy');
    const stat = (n: number) => page.locator('#summaryStats .ui-kpi').nth(n).locator('.big');
    const people = stat(0);
    await expect(chip(page, 'People')).toHaveText((await people.textContent())!);
    await expect(page.locator('#siteList [data-site="earth"]')).toContainText(
      (await chip(page, 'People').textContent())!
    );
    await expect(chip(page, 'Power: generation less demand')).toHaveText((await stat(2).textContent())!);
    await expect(chip(page, 'Food: calories made against calories needed')).toHaveText(
      (await stat(1).textContent())!
    );

    const before = (await people.textContent())!;
    for (let i = 0; i < 3; i++) await page.locator(MONTH).click();
    await expect(people).not.toHaveText(before);
    await expect(chip(page, 'People')).toHaveText((await people.textContent())!);
    await goTo(page, 'research');
    await expect(page.locator('[data-screen="research"]')).toContainText('0 of 29 reached');
  });

  test('the Summary counts food in calories and the top bar agrees', async ({ page }) => {
    await open(page, 'screen=economy');
    const bar = page.locator('#calorieBar');
    await expect(page.locator('#calorieShares')).toContainText(/Wheat \d+%/);
    await expect(page.locator('#calorieShares')).toContainText(/Meat \d+%/);
    await expect(bar.locator('[data-food="wheat"]')).toHaveAttribute('data-share', /^0\.\d+$/);
    await expect(bar.locator('[data-food="meat"]')).toHaveAttribute('data-share', /^0\.\d+$/);
    await expect(page.locator('[data-screen="economy"]')).toContainText(
      'kcal a person a day made against 2,800 needed'
    );
    const balance = (await page.locator('#summaryStats .ui-kpi').nth(1).locator('.big').textContent())!;
    expect(balance).toMatch(/^\+\d+%$/);
    await expect(chip(page, 'Food: calories made against calories needed')).toHaveText(balance);
  });

  test('every chip is an icon with a title and a value', async ({ page }) => {
    await open(page);
    await expect(page.locator('#chips .chip')).toHaveCount(5);
    for (const title of [
      'People',
      'Food: calories made against calories needed',
      'Power: generation less demand',
      'Compute',
      'Scarcest material'
    ]) {
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
