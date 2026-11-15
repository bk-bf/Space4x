import { expect, test, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOTS = process.env.SHOTS;

async function open(page: Page, query: string) {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

const stat = (page: Page, term: string) => page.locator('.pan dl dt', { hasText: term }).locator('+ dd');
const sections = (page: Page) => page.locator('.col[data-part^="section:"] .tag');
const label = (page: Page) => page.locator('#partLabel');
const cards = (page: Page) => page.locator('#gallery .card');

async function dragOnto(page: Page, source: Locator, x: number, y: number) {
  const stage = (await page.locator('.stage').boundingBox())!;
  await source.dragTo(page.locator('.stage'), { targetPosition: { x: x - stage.x, y: y - stage.y } });
}

test.describe('ship designer', () => {
  test('a part from the palette becomes a section after the selected one and the stats follow', async ({
    page
  }) => {
    await open(page, 'screen=classes&cls=pathfinder');
    await expect(sections(page)).toHaveText(['Reactor', 'Fuel', 'Crew', 'Hull', 'Hull']);
    const mass = Number((await stat(page, 'Mass').textContent())!.replace(/\D/g, ''));
    await expect(stat(page, 'Sections')).toHaveText('7');
    await page.locator('[data-part="core:armor"]').click();
    await expect(sections(page)).toHaveText(['Reactor', 'Armour', 'Fuel', 'Crew', 'Hull', 'Hull']);
    await expect(stat(page, 'Sections')).toHaveText('8');
    await expect(stat(page, 'Armour')).toHaveText('40');
    await expect(label(page)).toHaveText('Section 2 of 6: Armour');
    expect(Number((await stat(page, 'Mass').textContent())!.replace(/\D/g, ''))).toBe(mass + 380);
    await expectCleanLayout(page);
  });

  test('removing the selected section takes it out and the stats follow', async ({ page }) => {
    await open(page, 'screen=classes&cls=pathfinder');
    await page.locator('.col[data-part="section:1"] .tag').click();
    await expect(label(page)).toHaveText('Section 2 of 5: Fuel');
    await expect(stat(page, 'Fuel')).toHaveText('600 kL');
    await page.locator('main.screen [data-act="remove"]').click();
    await expect(sections(page)).toHaveText(['Reactor', 'Crew', 'Hull', 'Hull']);
    await expect(stat(page, 'Fuel')).toHaveText('0 kL');
    await expect(stat(page, 'Sections')).toHaveText('6');
    await expectCleanLayout(page);
  });

  test('sections reorder with the move buttons and by dragging their label', async ({ page }) => {
    await open(page, 'screen=classes&cls=pathfinder');
    await page.locator('.col[data-part="section:0"] .tag').click();
    await expect(page.locator('main.screen [data-act="left"]')).toBeDisabled();
    await page.locator('main.screen [data-act="right"]').click();
    await expect(sections(page)).toHaveText(['Fuel', 'Reactor', 'Crew', 'Hull', 'Hull']);
    await expect(label(page)).toHaveText('Section 2 of 5: Reactor');
    await page.locator('main.screen [data-act="left"]').click();
    await expect(sections(page)).toHaveText(['Reactor', 'Fuel', 'Crew', 'Hull', 'Hull']);

    const last = (await page.locator('.col[data-part="section:4"]').boundingBox())!;
    await dragOnto(
      page,
      page.locator('.col[data-part="section:0"] .tag'),
      last.x + last.width - 1,
      last.y + 80
    );
    await expect(sections(page)).toHaveText(['Fuel', 'Crew', 'Hull', 'Hull', 'Reactor']);
    await expect(label(page)).toHaveText('Section 5 of 5: Reactor');
    await expectCleanLayout(page);
  });

  test('dragging a palette part onto the design drops it where the pointer is', async ({ page }) => {
    await open(page, 'screen=classes&cls=pathfinder');
    const second = (await page.locator('.col[data-part="section:2"]').boundingBox())!;
    await dragOnto(page, page.locator('[data-part="core:ring"]'), second.x + 1, second.y + 60);
    await expect(sections(page)).toHaveText(['Reactor', 'Fuel', 'Ring', 'Crew', 'Hull', 'Hull']);
  });

  test('a hardpoint is added to the selected slot, cleared, and dropped on a slot', async ({ page }) => {
    await open(page, 'screen=classes&cls=pathfinder');
    await expect(stat(page, 'Hardpoints')).toHaveText('4');
    await page.locator('.col[data-part="section:0"] [data-zone="bottom"]').click();
    await expect(page.locator('[data-slot="bottom"]')).toHaveClass(/on/);
    await expect(page.locator('[data-slot="bottom"]')).toContainText('empty');
    await page.locator('[data-part="att:turret"]').click();
    await expect(page.locator('[data-slot="bottom"]')).toContainText('Turret');
    await expect(stat(page, 'Hardpoints')).toHaveText('5');
    await expect(stat(page, 'Weapons')).toHaveText('1 turret');
    await page.locator('[data-clear="bottom"]').click();
    await expect(page.locator('[data-slot="bottom"]')).toContainText('empty');
    await expect(stat(page, 'Hardpoints')).toHaveText('4');

    const zone = (await page.locator('.col[data-part="section:1"] [data-zone="top"]').boundingBox())!;
    await dragOnto(
      page,
      page.locator('[data-part="att:launcher"]'),
      zone.x + zone.width / 2,
      zone.y + zone.height / 2
    );
    await page.locator('.col[data-part="section:1"] .tag').click();
    await expect(page.locator('[data-slot="top"]')).toContainText('Launcher');
    await expect(stat(page, 'Weapons')).toHaveText('1 launcher');
    await expectCleanLayout(page);
  });

  test('the stern and bow are replaced from the palette and the drive sets the speed', async ({ page }) => {
    await open(page, 'screen=classes&cls=pathfinder');
    const speed = async () => Number((await page.locator('#dSpeed').textContent())!.replace(/\D/g, ''));
    const before = await speed();
    await page.locator('[data-part="stern:big"]').click();
    await expect(label(page)).toHaveText('Stern: Main eng.');
    expect(await speed()).toBeGreaterThan(before);
    await page.locator('[data-part="bow:prow"]').click();
    await expect(label(page)).toHaveText('Bow: Prow');
    await expect(stat(page, 'Armour')).toHaveText('20');
    await page.locator('[data-part="stern:engines"]').click();
    await page.locator('main.screen [data-act="engines-more"]').click();
    await page.locator('main.screen [data-act="remove"]').click();
    await expect(page.locator('#dSpeed')).toHaveText('No drive');
  });

  test('a new class is named, saved, listed in the gallery and kept when switching screens', async ({
    page
  }) => {
    await open(page, 'screen=classes');
    await expect(cards(page)).toHaveCount(8);
    await page.locator('#hullSel').selectOption({ label: 'Hauler frame' });
    await page.locator('main.screen [data-act="new"]').click();
    await expect(page.locator('#clsDirty')).toHaveText('unsaved');
    await page.locator('#clsName').fill('Dray');
    await page.locator('#clsRole').fill('Ore hauler');
    await page.locator('[data-part="core:tank"]').click();
    await page.locator('[data-part="core:tank"]').click();
    await page.locator('.col[data-part="section:1"] .tag').click();
    await page.locator('[data-slot="top"]').click();
    await page.locator('[data-part="att:cargo"]').click();
    await expect(page.locator('[data-slot="top"]')).toContainText('Cargo x2');
    await page.locator('main.screen [data-act="layers-more"]').click();
    await expect(page.locator('[data-slot="top"]')).toContainText('Cargo x3');
    await page.locator('main.screen [data-act="save"]').click();
    await expect(page.locator('#clsDirty')).toHaveCount(0);
    await expect(page.locator('#galPage')).toHaveText('9 classes, page 2 of 2');
    await expect(cards(page)).toHaveCount(1);
    const card = cards(page).filter({ hasText: 'Dray' });
    await expect(card).toContainText('Ore hauler');
    await expect(card).toHaveClass(/on/);
    await expectCleanLayout(page);
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true });
      await page.mouse.move(0, 0);
      await page.screenshot({ path: join(SHOTS, 'designed-class.png') });
    }

    await page.locator('[data-nav="economy"]').click();
    await page.locator('[data-nav="classes"]').click();
    await expect(page.locator('#galPage')).toHaveText('9 classes, page 2 of 2');
    await expect(cards(page).filter({ hasText: 'Dray' })).toHaveClass(/on/);
    await expect(page.locator('#clsName')).toHaveValue('Dray');
    await page.locator('[data-page="prev"]').click();
    await expect(cards(page)).toHaveCount(8);
    await expect(cards(page).filter({ hasText: 'Pathfinder' })).toHaveCount(1);
    await expect(sections(page)).toHaveText(['Reactor', 'Tank', 'Tank', 'Truss', 'Crew']);
    await expectCleanLayout(page);
  });

  test('a class is renamed, copied and deleted, and one a fleet uses cannot be deleted', async ({ page }) => {
    await open(page, 'screen=classes&cls=lighthouse');
    await page.locator('#clsName').fill('Beacon');
    await expect(page.locator('#clsDirty')).toHaveText('changed');
    await page.locator('#clsName').press('Enter');
    await expect(cards(page).filter({ hasText: 'Beacon' })).toHaveCount(1);
    await expect(cards(page)).toHaveCount(8);
    await page.locator('main.screen [data-act="copy"]').click();
    await expect(page.locator('#galPage')).toHaveText('9 classes, page 2 of 2');
    await expect(cards(page).filter({ hasText: 'Beacon copy' })).toHaveClass(/on/);
    await page.locator('main.screen [data-act="delete"]').click();
    await expect(page.locator('#galPage')).toHaveCount(0);
    await expect(cards(page)).toHaveCount(8);
    await expect(cards(page).filter({ hasText: 'Beacon' })).toHaveClass(/on/);
    await cards(page).filter({ hasText: 'Bastion' }).click();
    await expect(page.locator('main.screen [data-act="delete"]')).toBeDisabled();
    await expectCleanLayout(page);
  });

  test('picking a class from the gallery shows it with its own stats', async ({ page }) => {
    await open(page, 'screen=classes');
    await cards(page).filter({ hasText: 'Ark' }).click();
    await expect(page.locator('#clsName')).toHaveValue('Ark');
    await expect(sections(page)).toHaveText(['Reactor', 'Tank', 'Truss', 'Ring', 'Truss', 'Ring', 'Crew']);
    await cards(page).filter({ hasText: 'Lighthouse' }).click();
    await expect(page.locator('#dSpeed')).toHaveText('No drive');
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
    await expect(treeCount(page, 'Mars garrison')).toHaveText('13 units');
    await row(page, '1st artillery').click();
    await page.locator('#unitFormation').selectOption({ label: 'Luna guard, Luna' });
    await expect(treeCount(page, 'Mars garrison')).toHaveText('12 units');
    await expect(row(page, '1st artillery')).toHaveCount(0);
    await page.locator('details summary[data-place="Luna"]').click();
    await expect(treeCount(page, 'Luna guard')).toHaveText('5 units');
    await page.locator('summary[data-formation="Luna guard"]').click();
    await expect(row(page, '1st artillery')).toHaveCount(1);
    await expectCleanLayout(page);
  });

  test('the tree expands, collapses and selects a formation that the battlefield then shows', async ({
    page
  }) => {
    await open(page, 'screen=ground');
    const earth = page.locator('summary[data-place="Earth"]');
    await expect(page.locator('summary[data-formation="Home guard"]')).toBeHidden();
    await earth.click();
    await expect(page.locator('summary[data-formation="Home guard"]')).toBeVisible();
    await page.locator('summary[data-formation="Home guard"]').click();
    await expect(page.locator('[data-screen="ground"] .pan > h2').nth(1)).toHaveText('Home guard');
    await expect(page.locator('summary[data-formation="Home guard"]')).toHaveClass(/on/);
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
    await expect(page.locator('main.screen [data-act="disband"]')).toBeDisabled();
    await page.locator('main.screen [data-act="create"]').click();
    await expect(page.locator('summary[data-formation="Mars formation 2"]')).toHaveClass(/on/);
    await expect(treeCount(page, 'Mars formation 2')).toHaveText('0 units');
    await expect(page.locator('summary[data-place="Mars"] small')).toHaveText('2 formations');
    await page.locator('main.screen [data-act="disband"]').click();
    await expect(page.locator('summary[data-formation="Mars formation 2"]')).toHaveCount(0);
    await expect(page.locator('summary[data-place="Mars"] small')).toHaveText('1 formation');
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
    await page.locator('tr.pick', { hasText: 'Unsurveyed' }).click();
    await expect(page.locator('dl dt', { hasText: 'Star' }).locator('+ dd')).toHaveText('Unknown');
    await expect(page.locator('dl dt', { hasText: 'Bodies' }).locator('+ dd')).toHaveText('?');
    await expect(page.locator('main.screen [data-act="open-map"]')).toBeDisabled();
    await page.locator('tr.pick', { hasText: 'Wolf 359' }).click();
    await expect(page.locator('main.screen [data-act="open-map"]')).toBeDisabled();
  });

  test('a system the map knows opens on the system map', async ({ page }) => {
    await open(page, 'screen=galaxy');
    await page.locator('tr.pick', { hasText: 'Alpha Centauri' }).click();
    await page.locator('main.screen [data-act="open-map"]').click();
    await expect(page.locator('#desk')).toBeVisible();
    await expect(page.locator('#sysSel')).toHaveValue('acen');
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
