import { expect, test, type Locator, type Page } from '@playwright/test';

const DAY = '[data-step="86400"]';
const MONTH = '[data-step="2592000"]';

const nav = (page: Page, screen: string) => page.locator(`[data-nav="${screen}"]`).click();

async function tab(page: Page, id: string) {
  await nav(page, 'economy');
  await page.locator(`[data-tab="${id}"]`).click();
}

async function stepUntil(page: Page, step: string, done: () => Promise<boolean>, limit: number) {
  for (let i = 0; i < limit && !(await done()); i++) await page.locator(step).click();
  expect(await done()).toBe(true);
}

const present = (l: Locator) => async () => (await l.count()) > 0;

async function setCount(page: Page, id: string, n: number) {
  const input = page.locator(`[data-count="${id}"]`);
  await input.fill(String(n));
  await input.press('Tab');
}

test('a new game reaches a founded outpost at the Moon south pole through the interface alone', async ({
  page
}) => {
  test.setTimeout(240_000);
  await page.goto('/');
  await page.getByRole('button', { name: 'New game' }).click();
  await expect(page.locator('[data-nav="map"]')).toHaveClass(/on/);

  await nav(page, 'research');
  await page.locator('#techTree [data-project="3"]').click();
  await page.locator('#programmeScientists button', { hasText: 'Marcus Bell' }).click();
  await expect(page.locator('#programmePlanLabs [data-labs]')).toHaveText('4 / 4');
  await page.locator('#programmeStart').click();
  await expect(page.locator('#techTree [data-project="3"]')).toHaveAttribute('data-status', 'running');
  await expect(page.locator('#programmeLabs [data-labs]')).toHaveText('4 / 4');

  await tab(page, 'construction');
  await page.locator('#items button.ui-tile', { hasText: 'Research lab' }).click();
  await page.locator('#orderAdd').click();
  await expect(page.locator('#queue button.ui-tile')).toHaveCount(1);

  await nav(page, 'classes');
  await page.locator('[data-act="new"]').click();
  await page.locator('#clsName').fill('Lander');
  await page.locator('#clsRole').selectOption('lander');
  for (const [id, n] of [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['landing_legs', 1],
    ['cargo_bay', 1],
    ['booster', 8]
  ] as const) {
    await page.locator(`[data-part="${id}"] button`).click();
    await setCount(page, id, n);
  }
  await expect(page.locator('#climbVerdict')).toContainText('Reaches orbit');
  await expect(page.locator('#issues .error')).toHaveCount(0);
  await page.locator('[data-act="lock"]').click();
  await expect(page.locator('#clsLocked')).toBeVisible();

  await tab(page, 'yard');
  await page.locator('#yardDesigns button', { hasText: 'Lander' }).click();
  await page.locator('#yardAdd').click();
  await expect(page.locator('#yardQueue button')).toHaveCount(1);
  await page.locator(DAY).click();

  await tab(page, 'summary');
  await page
    .locator('[data-screen="economy"] button.ui-tile', { hasText: 'GRCop copper-chromium-niobium alloy' })
    .click();
  await expect(page.locator('[data-tab="stockpiles"]')).toHaveClass(/on/);
  await expect(page.locator('[data-screen="economy"] .ui-card')).toContainText('Made by');

  await tab(page, 'production');
  await page
    .locator('#groups button.ui-tile', { hasText: 'Stainless steel' })
    .filter({ hasText: 'Alloy works' })
    .first()
    .click();
  await page.getByRole('button', { name: 'GRCop copper-chromium-niobium alloy', exact: true }).click();
  await page.locator('input[name="switchCount"]').fill('2');
  await page.locator('#recipeSwitch').click();

  await tab(page, 'launch');
  const lander = page.locator('#launchShips button', { hasText: 'Lander' });
  await stepUntil(page, DAY, present(lander), 40);

  await tab(page, 'construction');
  await stepUntil(page, DAY, async () => (await page.locator('#queue button.ui-tile').count()) === 0, 30);

  await nav(page, 'research');
  await page.locator('#techTree [data-project="1"]').click();
  await expect(page.locator('#programmePlanLabs [data-labs]')).toHaveText('1 / 1');
  await page.locator('#programmeStart').click();
  await expect(page.locator('#techTree [data-project="1"]')).toHaveAttribute('data-status', 'running');

  await stepUntil(
    page,
    MONTH,
    async () => (await page.locator('#techTree [data-project="3"]').getAttribute('data-status')) === 'done',
    30
  );

  await tab(page, 'ships');
  await page.locator('#planGroup').selectOption('Moons of Earth');
  await page.locator('#planPlace').selectOption('surface:luna');
  await page.locator('#planRegion').selectOption({ label: 'South polar cold traps' });
  await page.locator('#planBuildings .ui-tile', { hasText: 'Life support plant' }).click();
  await page.locator('#planToLaunch').click();
  await page.locator('#planOpenLaunch').click();

  await lander.click();
  await expect(page.locator('#launchCargo .ui-rate')).toHaveCount(3);
  await expect(page.locator('#launchReasons')).toHaveCount(0);
  await page.locator('#launchGo').click();
  await expect(page.locator('#launchLog')).toContainText('8 boosters dropped');

  await tab(page, 'ships');
  await page.locator('#vessels button', { hasText: 'Earth orbit' }).click();
  await page.locator('#tripGroup').selectOption('Moons of Earth');
  await page.locator('#tripTo').selectOption({ label: 'Luna surface, south polar cold traps' });
  await page.locator('#tripPlan').click();
  await expect(page.locator('#tripOptions .ui-tile')).not.toHaveCount(0);
  await page.locator('#tripGo').click();
  await expect(page.locator('#tripPlan')).toBeDisabled();

  const landed = page.locator('#vessels button', { hasText: 'Luna surface' });
  await stepUntil(page, DAY, present(landed), 20);
  await landed.click();
  await page.locator('#foundBuilding button', { hasText: 'Life support plant' }).click();
  await expect(page.locator('#foundGo')).toBeEnabled();
  await page.locator('#foundGo').click();

  await expect(page.locator('#siteList [data-site]')).toHaveCount(2);
  await expect(page.locator('#siteList [data-site="luna"]')).toContainText('outpost');
});
