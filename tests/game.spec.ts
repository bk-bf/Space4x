import { expect, test, type Page } from '@playwright/test';

const REAL = ['map', 'economy', 'research', 'classes', 'colony'];
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
  for (const key of ['F6', 'F7', 'F8', 'F9']) {
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

test('the colony screen shows its facts without the mock surface scene', async ({ page }) => {
  await open(page, 'screen=colony');
  await expect(page.locator('#colonyPick')).toBeVisible();
  await expect(page.locator('[data-screen="colony"] .pan > h2', { hasText: 'Surface' })).toHaveCount(0);
});
