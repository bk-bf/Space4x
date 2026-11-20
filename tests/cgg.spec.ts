import { expect, test, type Page } from '@playwright/test';

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
const issue = (page: Page, code: string) => page.locator(`[data-issue="${code}"]`);
const part = (page: Page, id: string) => page.locator(`[data-part="${id}"]`);
const add = (page: Page, id: string) => part(page, id).locator('button');
const figure = (page: Page, key: string) => page.locator(`[data-screen="classes"] [data-stat="${key}"]`);
const value = (page: Page, key: string) => figure(page, key).locator('.big');
const label = (page: Page, key: string) => figure(page, key).locator('small');
const count = (page: Page, id: string) => page.locator(`[data-count="${id}"]`);
const lock = (page: Page) => page.locator('[data-act="lock"]');
const drawing = (page: Page) =>
  page.locator('[data-screen="classes"] canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());

async function setCount(page: Page, id: string, n: number) {
  await count(page, id).fill(String(n));
  await count(page, id).press('Tab');
}

test.describe('ship designer', () => {
  test('a class is built from nothing, its errors appear and resolve, and it locks', async ({ page }) => {
    await open(page, 'screen=classes');
    await expect(page.locator('#emptyDesign')).toBeVisible();
    await expect(page.locator('#noClass')).toBeVisible();
    await expect(lock(page)).toBeDisabled();

    await page.locator('[data-act="new"]').click();
    await expect(page.locator('#emptyDesign')).toBeVisible();
    await expect(issue(page, 'no-parts')).toBeVisible();
    await page.locator('#clsName').fill('Dray');
    await add(page, 'propellant_tank').click();
    await expect(page.locator('#emptyDesign')).toHaveCount(0);
    await expect(issue(page, 'no-parts')).toHaveCount(0);
    await expect(issue(page, 'no-engine')).toBeVisible();
    await expect(lock(page)).toBeDisabled();

    await add(page, 'chemical_engine_methalox').click();
    await expect(issue(page, 'no-engine')).toHaveCount(0);
    await expect(page.locator('#issues .error')).toHaveCount(0);
    await expect(label(page, 'mass')).toHaveText('dry 2.1 t');
    await expect(value(page, 'propellant')).toHaveText('16 t');
    await expect(label(page, 'propellant')).toHaveText('methane and oxygen');

    await setCount(page, 'propellant_tank', 40);
    await expect(issue(page, 'no-liftoff')).toBeVisible();
    await expect(page.locator('#issues .error')).toHaveCount(0);
    await expect(lock(page)).toBeEnabled();
    await expect(label(page, 'twr-earth')).toContainText('too low');

    await setCount(page, 'propellant_tank', 3);
    await expect(issue(page, 'no-liftoff')).toHaveCount(0);
    await expect(label(page, 'twr-earth')).toContainText('lifts off');
    await expect(page.locator('#noIssues')).toBeVisible();
    await expect(lock(page)).toBeEnabled();

    await lock(page).click();
    await expect(page.locator('#clsLocked')).toBeVisible();
    await expect(page.locator('#isLocked')).toBeVisible();
    await expect(page.locator('#clsName')).toBeDisabled();
    await expect(page.locator('#clsRole')).toBeDisabled();
    await expect(page.locator('#clsYard')).toBeDisabled();
    await expect(add(page, 'chemical_engine_methalox')).toBeDisabled();
    await expect(count(page, 'propellant_tank')).toBeDisabled();
    await expect(page.locator('[data-take="propellant_tank"]')).toBeDisabled();
    await expect(lock(page)).toBeDisabled();
    await expect(page.locator('[data-act="copy"]')).toBeEnabled();

    await page.locator('[data-act="copy"]').click();
    await expect(page.locator('#clsName')).toHaveValue('Dray copy');
    await expect(page.locator('#clsName')).toBeEnabled();
    await expect(add(page, 'chemical_engine_methalox')).toBeEnabled();
    await expect(page.locator('#classList [data-class]')).toHaveText(['Dray (locked)', 'Dray copy']);
    await expectCleanLayout(page);
  });

  test('clicking a component with no class open starts one with that component', async ({ page }) => {
    await open(page, 'screen=classes');
    await add(page, 'chemical_engine_methalox').click();
    await expect(page.locator('#classList [data-class]')).toHaveText(['New class']);
    await expect(page.locator('[data-line="chemical_engine_methalox"]')).toBeVisible();
    await expect(part(page, 'chemical_engine_methalox')).toContainText('×1');
  });

  test('a class is renamed, given a role and deleted, and the class list picks between classes', async ({
    page
  }) => {
    await open(page, 'screen=classes');
    await page.locator('[data-act="new"]').click();
    await page.locator('#clsName').fill('Dray');
    await page.locator('#clsRole').selectOption('freighter');
    await page.locator('[data-act="new"]').click();
    await expect(page.locator('#clsRole')).toHaveValue('launcher');
    await expect(page.locator('#classList [data-class]')).toHaveText(['Dray', 'New class']);
    await page.locator('#classList [data-class]').first().click();
    await expect(page.locator('#clsName')).toHaveValue('Dray');
    await expect(page.locator('#clsRole')).toHaveValue('freighter');
    await page.locator('[data-act="delete"]').click();
    await expect(page.locator('#classList [data-class]')).toHaveText(['New class']);
    await page.locator('[data-act="delete"]').click();
    await expect(page.locator('#classList [data-class]')).toHaveCount(0);
    await expect(page.locator('#noClass')).toBeVisible();
    await expect(page.locator('[data-act="delete"]')).toBeDisabled();
  });

  test('the yard a class is built at is chosen among the yards that can build every part', async ({
    page
  }) => {
    await open(page, 'screen=classes&new=crewed&reached=6');
    await expect(page.locator('#clsYard')).toHaveValue('orbital_shipyard');
    await expect(page.locator('#clsYard option')).toHaveText(['Shipyard', 'Orbital shipyard (locked)']);
    await expect(label(page, 'built-at')).toHaveText('can be built at');
    await expect(value(page, 'built-at')).toContainText('Orbital shipyard');
    await page.locator('#clsYard').selectOption('rocket_factory');
    await expect(page.locator('#clsYard')).toHaveValue('rocket_factory');
  });

  test('components the milestones have not reached are dimmed and name what they wait for', async ({
    page
  }) => {
    await open(page, 'screen=classes');
    await expect(add(page, 'chemical_engine_methalox')).toBeEnabled();
    await expect(add(page, 'chemical_engine_hydrolox')).toBeDisabled();
    await expect(part(page, 'chemical_engine_hydrolox')).toHaveAttribute('data-locked', '6');
    await expect(part(page, 'chemical_engine_hydrolox')).toContainText('locked');
    await part(page, 'chemical_engine_hydrolox').hover();
    await expect(page.locator('#ui-tip')).toContainText('Crewed lunar landing and surface outpost');
    await expect(page.locator('#ui-tip')).toContainText('needs LEO station first');
    await open(page, 'screen=classes&reached=6');
    await expect(add(page, 'chemical_engine_hydrolox')).toBeEnabled();
    await expect(part(page, 'chemical_engine_hydrolox')).not.toHaveAttribute('data-locked', /./);
    await expect(part(page, 'hall_thruster')).toHaveAttribute('data-locked', '13');
  });

  test('the components are grouped by kind with a name and a key figure', async ({ page }) => {
    await open(page, 'screen=classes');
    await expect(page.locator('.ui-tile.cmp')).not.toHaveCount(0);
    await expect(part(page, 'chemical_engine_methalox').locator('.ui-amt')).toHaveText('363 s');
    await expect(part(page, 'chemical_engine_methalox').locator('.ui-nm')).toContainText('Methalox');
    await expect(page.getByText('Drives', { exact: true })).toBeVisible();
    await expect(page.getByText('Structure', { exact: true })).toBeVisible();
  });

  test('the numbers follow the design: mass, delta-v and thrust to weight', async ({ page }) => {
    await open(page, 'screen=classes&new=stage');
    await expect(label(page, 'mass')).toHaveText('dry 5 t');
    await expect(value(page, 'mass')).toHaveText('74 t');
    await expect(value(page, 'payload')).toHaveText('4 t');
    await expect(value(page, 'propellant')).toHaveText('65 t');
    await expect(value(page, 'delta-v')).toHaveText('7.51 km/s');
    await expect(value(page, 'dv-empty')).toHaveText('9.41 km/s');
    await expect(value(page, 'twr')).toHaveText('3.15');
    await expect(value(page, 'twr-earth')).toHaveText('3.15');
    await expect(label(page, 'twr-earth')).toHaveText('Earth, lifts off');
    await expect(issue(page, 'short-of-orbit')).toBeVisible();

    await setCount(page, 'propellant_tank', 8);
    await expect(value(page, 'dv-empty')).toHaveText(/^1[0-9]\.\d\d km\/s$/);
    await expectCleanLayout(page);
  });

  test('the payload shown can be lowered and changes mass and delta-v', async ({ page }) => {
    await open(page, 'screen=classes&new=stage');
    await expect(page.locator('#payload')).toHaveValue('4');
    await page.locator('#payload').fill('0');
    await page.locator('#payload').press('Tab');
    await expect(value(page, 'mass')).toHaveText('70 t');
    await expect(value(page, 'delta-v')).toHaveText('9.41 km/s');
    await page.locator('#payload').fill('99');
    await page.locator('#payload').press('Tab');
    await expect(page.locator('#payload')).toHaveValue('4');
    await expect(value(page, 'mass')).toHaveText('74 t');
  });

  test('a crewed vehicle reports crew, life support, power and heat, and has no errors', async ({ page }) => {
    await open(page, 'screen=classes&reached=6&new=crewed');
    await expect(value(page, 'crew')).toHaveText('2');
    await expect(label(page, 'crew')).toHaveText('berths 4');
    await expect(value(page, 'endurance')).toHaveText('100 days');
    await expect(label(page, 'power')).toContainText('20 kW');
    await expect(label(page, 'heat')).toContainText('sheds');
    await expect(page.locator('#issues .error')).toHaveCount(0);
    await expect(lock(page)).toBeEnabled();

    await page.locator('[data-take="heat_shield"]').click();
    await expect(page.locator('[data-line="heat_shield"]')).toHaveCount(0);
    await expect(issue(page, 'no-reentry')).toBeVisible();
    await expect(lock(page)).toBeDisabled();
    await expect(page.locator('#noIssues')).toHaveCount(0);
  });

  test('every warning and error of the design is listed as a flag, and the build cost as materials', async ({
    page
  }) => {
    await open(page, 'screen=classes&new=stage');
    await expect(page.locator('#issues .warning')).not.toHaveCount(0);
    await expect(page.locator('#issues .flag')).not.toHaveCount(0);
    expect(await page.locator('#issues .flag.warning').count()).toBe(
      await page.locator('#issues [data-issue]').count()
    );
    await expect(page.locator('[data-screen="classes"] .ui-rate').first()).toBeVisible();
  });

  test('the drawing is made from the components and changes with them', async ({ page }) => {
    await open(page, 'screen=classes&new=stage');
    await page.waitForTimeout(300);
    const before = await drawing(page);
    await setCount(page, 'propellant_tank', 8);
    await page.waitForTimeout(300);
    expect(await drawing(page)).not.toBe(before);
  });

  test('designs stay when another screen is shown and the propellant can be set', async ({ page }) => {
    await open(page, 'screen=classes&new=stage');
    await page.locator('[data-load="methalox"]').fill('10000');
    await page.locator('[data-load="methalox"]').press('Tab');
    await expect(value(page, 'propellant')).toHaveText('10 t');
    await goTo(page, 'map');
    await goTo(page, 'classes');
    await expect(page.locator('#classList [data-class]')).toHaveText(['Small stage']);
    await expect(value(page, 'propellant')).toHaveText('10 t');
    await page.locator('[data-fill="methalox"]').click();
    await expect(value(page, 'propellant')).toHaveText('65 t');
  });

  test('the other screens that read classes work with none designed', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await open(page, 'screen=intel');
    await expect(page.locator('[data-screen="intel"]')).toBeVisible();
    await goTo(page, 'commanders');
    await expect(page.locator('[data-screen="commanders"]')).toBeVisible();
    await goTo(page, 'map');
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });
});

const row = (page: Page, name: string) =>
  page.locator('#stage [data-screen="ground"] tr.pick', { hasText: name });
const treeCount = (page: Page, formation: string) =>
  page.locator(`summary[data-formation="${formation}"] small`);

test.describe('ground forces', () => {
  test('selecting a unit shows its detail and a stance change reaches the table', async ({ page }) => {
    await open(page, 'screen=ground');
    await row(page, '1st armour').click();
    await expect(page.locator('[data-screen="ground"] .pan > h2').last()).toHaveText('1st armour');
    await expect(page.locator('[data-stance="Reserve"]')).toHaveClass(/on/);
    await page.locator('[data-stance="Advance"]').click();
    await expect(page.locator('[data-stance="Advance"]')).toHaveClass(/on/);
    await expect(row(page, '1st armour')).toContainText('Advance');
    await expect(page.locator('dl dt', { hasText: 'Supply use' }).locator('+ dd')).toHaveText('12.6 a day');
    await expectCleanLayout(page);
  });

  test('supply and morale follow the clock by stance', async ({ page }) => {
    await open(page, 'screen=ground');
    const cell = async (name: string, column: number) =>
      Number((await row(page, name).locator('td').nth(column).textContent())!.replace(/\D/g, ''));
    const supply = (name: string) => cell(name, 4);
    await row(page, '1st armour').click();
    await page.locator('[data-stance="Advance"]').click();
    const armour = await supply('1st armour');
    const morale = await cell('1st armour', 3);
    const rifle = await supply('1st rifle battalion');
    await page.locator('#steps button', { hasText: '30d' }).click();
    await expect.poll(() => supply('1st armour')).toBeLessThan(armour - 10);
    expect(await cell('1st armour', 3)).toBeLessThan(morale);
    expect(await supply('1st rifle battalion')).toBeGreaterThanOrEqual(rifle);
    await expectCleanLayout(page);
  });

  test('a unit moves to another formation and both counts change', async ({ page }) => {
    await open(page, 'screen=ground');
    await expect(treeCount(page, 'Home guard')).toHaveText('13 units');
    await row(page, '1st artillery').click();
    await page.locator('#unitFormation').selectOption({ label: 'Coastal guard, Earth' });
    await expect(treeCount(page, 'Home guard')).toHaveText('12 units');
    await expect(row(page, '1st artillery')).toHaveCount(0);
    await expect(treeCount(page, 'Coastal guard')).toHaveText('5 units');
    await page.locator('summary[data-formation="Coastal guard"]').click();
    await expect(row(page, '1st artillery')).toHaveCount(1);
    await expectCleanLayout(page);
  });

  test('the tree expands, collapses and selects a formation that the battlefield then shows', async ({
    page
  }) => {
    await open(page, 'screen=ground');
    const earth = page.locator('summary[data-place="Earth"]');
    await expect(page.locator('summary[data-formation="Capital guard"]')).toBeVisible();
    await earth.click();
    await expect(page.locator('summary[data-formation="Capital guard"]')).toBeHidden();
    await earth.click();
    await page.locator('summary[data-formation="Capital guard"]').click();
    await expect(page.locator('[data-screen="ground"] .pan > h2').nth(1)).toHaveText('Capital guard');
    await expect(page.locator('summary[data-formation="Capital guard"]')).toHaveClass(/on/);
    await expect(page.locator('#groundCv ~ .labels .hit')).toHaveCount(5);
    await earth.click();
    await expect(page.locator('summary[data-formation="Spaceport guard"]')).toBeHidden();
    await expectCleanLayout(page);
  });

  test('a unit is picked by clicking its sprite on the battlefield', async ({ page }) => {
    await open(page, 'screen=ground');
    await page.locator('.hit[data-unit="3rd armour"]').click();
    await expect(row(page, '3rd armour')).toHaveClass(/on/);
  });

  test('a formation is created and disbanded', async ({ page }) => {
    await open(page, 'screen=ground');
    await expect(page.locator('summary[data-place="Earth"] small')).toHaveText('5 formations');
    await page.locator('main.screen [data-act="create"]').click();
    await expect(page.locator('summary[data-formation="Earth formation 6"]')).toHaveClass(/on/);
    await expect(treeCount(page, 'Earth formation 6')).toHaveText('0 units');
    await expect(page.locator('summary[data-place="Earth"] small')).toHaveText('6 formations');
    await page.locator('main.screen [data-act="disband"]').click();
    await expect(page.locator('summary[data-formation="Earth formation 6"]')).toHaveCount(0);
    await expect(page.locator('summary[data-place="Earth"] small')).toHaveText('5 formations');
    await expectCleanLayout(page);
  });
});

const zoom = async (page: Page) => Number((await page.locator('#galZoom').textContent())!.replace('x', ''));
const starAt = async (page: Page, name: string) => {
  const view = (await page.locator('#galCv').boundingBox())!;
  const lab = page.locator(`.lab[data-system="${name}"]`);
  return {
    x: view.x + Number(await lab.getAttribute('data-cx')),
    y: view.y + Number(await lab.getAttribute('data-cy'))
  };
};

test.describe('galaxy', () => {
  test('the wheel zooms smoothly about the cursor', async ({ page }) => {
    await open(page, 'screen=galaxy');
    const sol = await starAt(page, 'Sol');
    await page.mouse.move(sol.x, sol.y);
    const start = await zoom(page);
    const seen = new Set<number>([start]);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, -60);
      await page.waitForTimeout(60);
      seen.add(await zoom(page));
    }
    expect(await zoom(page)).toBeGreaterThan(start * 1.4);
    expect(seen.size).toBeGreaterThan(3);
    const after = await starAt(page, 'Sol');
    expect(Math.abs(after.x - sol.x)).toBeLessThan(3);
    expect(Math.abs(after.y - sol.y)).toBeLessThan(3);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 80);
    await expect.poll(() => zoom(page)).toBeLessThan(start);
    await expectCleanLayout(page);
  });

  test('dragging pans the map', async ({ page }) => {
    await open(page, 'screen=galaxy');
    const before = await starAt(page, 'Sol');
    await page.mouse.move(before.x + 200, before.y + 160);
    await page.mouse.down();
    await page.mouse.move(before.x + 260, before.y + 200, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await starAt(page, 'Sol')).x).toBeCloseTo(before.x + 60, -1);
    expect(Math.abs((await starAt(page, 'Sol')).y - (before.y + 40))).toBeLessThan(3);
    await expect(page.locator('[data-screen="galaxy"] .pan > h2').nth(1)).toHaveText('Sol');
  });

  test('clicking a star or a table row selects the system and shows its facts', async ({ page }) => {
    await open(page, 'screen=galaxy');
    const title = page.locator('[data-screen="galaxy"] .pan > h2').nth(1);
    const acen = await starAt(page, 'Alpha Centauri');
    await page.mouse.click(acen.x, acen.y);
    await expect(title).toHaveText('Alpha Centauri');
    await expect(page.locator('dl dt', { hasText: 'Star' }).locator('+ dd')).toHaveText('G2 and K1 pair');
    await page.locator('tr.pick', { hasText: 'Sirius' }).click();
    await expect(title).toHaveText('Sirius');
    await expect(page.locator('main.screen tr.pick.on')).toContainText('Sirius');
    await expectCleanLayout(page);
  });

  test('an unsurveyed system shows unknown facts and cannot be opened on the map', async ({ page }) => {
    await open(page, 'screen=galaxy');
    await page.locator('tr.pick', { hasText: 'Beyond jump point A' }).click();
    await expect(page.locator('dl dt', { hasText: 'Star' }).locator('+ dd')).toHaveText('Unknown');
    await expect(page.locator('dl dt', { hasText: 'Bodies' }).locator('+ dd')).toHaveText('?');
    await expect(page.locator('main.screen [data-act="open-map"]')).toBeDisabled();
    await page.locator('tr.pick', { hasText: 'Alpha Centauri' }).click();
    await expect(page.locator('main.screen [data-act="open-map"]')).toBeDisabled();
  });

  test('Sol, the one system the map knows, opens on the system map', async ({ page }) => {
    await open(page, 'screen=galaxy');
    await page.locator('tr.pick', { hasText: 'Sol' }).click();
    await expect(page.locator('dl dt', { hasText: 'Jump points' }).locator('+ dd')).toHaveText(
      '1, unsurveyed'
    );
    await page.locator('main.screen [data-act="open-map"]').click();
    await expect(page.locator('#desk')).toBeVisible();
    await expect(page.locator('#sysSel')).toHaveValue('sol');
  });

  test('show all fits every system and centre moves the selection to the middle', async ({ page }) => {
    await open(page, 'screen=galaxy');
    await page.locator('tr.pick', { hasText: 'Tau Ceti' }).click();
    await page.locator('main.screen [data-act="centre"]').click();
    const view = (await page.locator('#galCv').boundingBox())!;
    const tau = await starAt(page, 'Tau Ceti');
    expect(Math.abs(tau.x - (view.x + view.width / 2))).toBeLessThan(3);
    expect(Math.abs(tau.y - (view.y + view.height / 2))).toBeLessThan(3);
    await page.locator('main.screen [data-act="fit"]').click();
    await expect(page.locator('.lab[data-system="Procyon"]')).toBeVisible();
    await expect(page.locator('.lab[data-system="Tau Ceti"]')).toBeVisible();
  });
});
