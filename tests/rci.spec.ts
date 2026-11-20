import { expect, test, type Locator, type Page } from '@playwright/test';

const DAY = 86400;

async function open(page: Page, query: string) {
  await page.goto(`/?check&${query}`);
  await expect(page.locator('#check')).toBeAttached({ timeout: 20_000 });
  await page.evaluate(() => document.querySelector('#check')?.remove());
}

async function expectCleanLayout(page: Page) {
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.space4xLayoutCheck?.() ?? ['no layout check'])).toEqual([]);
}

async function advance(page: Page, seconds: number, times = 1) {
  for (let i = 0; i < times; i++) await page.locator(`#steps [data-step="${seconds}"]`).click();
}

async function eventTexts(page: Page): Promise<string[]> {
  await page.locator('[data-nav="map"]').click();
  await expect(page.locator('#desk')).toBeVisible();
  return page.locator('#events .ev').allTextContents();
}

test.describe('research', () => {
  const tile = (page: Page, n: number): Locator => page.locator(`#techTree [data-milestone="${n}"] button`);
  const slot = (page: Page, n: number): Locator => page.locator(`#techTree [data-milestone="${n}"]`);
  const card = (page: Page): Locator => page.locator('[data-screen="research"] .ui-card');
  const title = (page: Page): Locator => card(page).locator('header .t');
  const kpi = (page: Page, label: string): Locator =>
    page.locator('[data-screen="research"] .ui-kpi').filter({ has: page.getByText(label, { exact: true }) });
  const rtab = (page: Page, id: string) =>
    page.locator(`[data-screen="research"] [data-tab="${id}"]`).click();

  test('shows the 29 milestones as tiles in a dependency tree, and a tile click selects one', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await expect(page.locator('#techTree .tpos')).toHaveCount(29);
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'ready');
    await expect(slot(page, 2)).toHaveAttribute('data-status', 'locked');
    await expect(title(page)).toHaveText('1. Reusable orbital launch');
    await tile(page, 29).click();
    await expect(title(page)).toHaveText('29. Jump point stabilisation');
    await expect(tile(page, 29)).toHaveClass(/sel/);
    await expect(tile(page, 1)).not.toHaveClass(/sel/);
    await expectCleanLayout(page);
  });

  test('selecting a milestone outlines what it needs and what it opens, and colours the lines to match', async ({
    page
  }) => {
    await open(page, 'screen=research&milestone=3');
    await expect(tile(page, 1)).toHaveClass(/needs/);
    await expect(tile(page, 2)).toHaveClass(/needs/);
    await expect(tile(page, 6)).toHaveClass(/feeds/);
    await expect(tile(page, 11)).toHaveClass(/feeds/);
    await expect(tile(page, 5)).not.toHaveClass(/needs|feeds/);
    await expect(page.locator('#techTree path.e.into')).toHaveCount(2);
    await expect(page.locator('#techTree path.e.out')).toHaveCount(3);
    await expect(page.locator('#techTree path.e.done')).toHaveCount(0);
    await open(page, 'screen=research&milestone=12&reached=3');
    await expect(page.locator('#techTree path.e.done').first()).toHaveAttribute('d', /^M/);
  });

  test('the tiles keep one size and never overlap, in a tall and in a short window', async ({ page }) => {
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ]) {
      await page.setViewportSize(size);
      await open(page, 'screen=research');
      const boxes = [];
      for (let n = 1; n <= 29; n++) {
        const b = await tile(page, n).boundingBox();
        expect(b, `milestone ${n}`).not.toBeNull();
        expect(b!.width, `milestone ${n}`).toBe(144);
        expect(b!.height, `milestone ${n}`).toBe(56);
        boxes.push({ n, ...b! });
      }
      for (const a of boxes)
        for (const b of boxes) {
          if (a.n >= b.n) continue;
          const apart =
            a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
          expect(apart, `${a.n} and ${b.n} at ${size.width}`).toBe(true);
        }
    }
  });

  test('the whole tree is in view without vertical scrolling at 1440x900', async ({ page }) => {
    await open(page, 'screen=research');
    const m = await page.locator('#techTree').evaluate((el) => ({
      sh: el.scrollHeight,
      ch: el.clientHeight,
      page: document.documentElement.scrollHeight - innerHeight
    }));
    expect(m.sh).toBeLessThanOrEqual(m.ch + 1);
    expect(m.page).toBeLessThanOrEqual(0);
  });

  test('the tree scrolls sideways inside its panel and brings the selected tile into view', async ({
    page
  }) => {
    await open(page, 'screen=research');
    const tree = page.locator('#techTree');
    const metrics = () =>
      tree.evaluate((el) => ({ left: el.scrollLeft, wide: el.scrollWidth, shown: el.clientWidth }));
    const first = await metrics();
    expect(first.wide).toBeGreaterThan(first.shown);
    expect(first.left).toBe(0);
    const box = (await tree.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 400);
    await expect.poll(async () => (await metrics()).left).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
    const wheeled = (await metrics()).left;
    await page.mouse.move(box.x + box.width - 30, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 230, box.y + 4, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await metrics()).left).toBeGreaterThan(wheeled + 100);

    await open(page, 'screen=research&milestone=29');
    const t = (await tile(page, 29).boundingBox())!;
    const v = (await page.locator('#techTree').boundingBox())!;
    expect((await metrics()).left).toBeGreaterThan(0);
    expect(t.x).toBeGreaterThanOrEqual(v.x + 132);
    expect(t.x + t.width).toBeLessThanOrEqual(v.x + v.width + 1);
    await tile(page, 1).click();
    await expect.poll(async () => (await metrics()).left).toBe(0);
  });

  test('the lane labels stay in place while the tree scrolls', async ({ page }) => {
    await open(page, 'screen=research&milestone=29');
    const label = page.locator('#techTree [data-lane="launch"]');
    const v = (await page.locator('#techTree').boundingBox())!;
    expect(Math.abs((await label.boundingBox())!.x - v.x)).toBeLessThanOrEqual(1);
    await expect(label).toContainText('Launch and logistics');
    await expect(page.locator('#techTree [data-lane]')).toHaveCount(8);
  });

  test('a locked tile names the prerequisites it waits for, and a milestone whose prerequisites are done is not locked while a lower unrelated one is open', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await tile(page, 3).hover();
    await expect(page.locator('#ui-tip')).toContainText(
      'Locked until Orbital launch and Propellant transfer done'
    );
    await open(page, 'screen=research&reached=4&milestone=6');
    await expect(slot(page, 5)).toHaveAttribute('data-status', 'ready');
    await expect(slot(page, 6)).toHaveAttribute('data-status', 'ready');
    await expect(slot(page, 7)).toHaveAttribute('data-status', 'locked');
    await expect(page.locator('#requires .ui-tile')).toHaveCount(1);
    await expect(page.locator('#programmeWhy')).toHaveCount(0);
    await expect(page.locator('#programmeStart')).toBeEnabled();
    await tile(page, 7).hover();
    await expect(page.locator('#ui-tip')).toContainText('Locked until Lunar outpost done');
  });

  test('the query selects a milestone and a tab', async ({ page }) => {
    await open(page, 'screen=research&milestone=12&rtab=unlocks');
    await expect(title(page)).toHaveText('12. Cislunar propellant economy');
    await expect(page.locator('[data-unlock="12"]')).toHaveClass(/sel/);
    await expect(page.locator('[data-unlock="0"]')).toContainText('At the start');
    await page.locator('[data-unlock="5"]').click();
    await expect(title(page)).toHaveText('5. Data centres and autonomy');
  });

  test('the strip counts reached, running and ready projects, compute and what is open', async ({ page }) => {
    await open(page, 'screen=research');
    await expect(kpi(page, 'milestones reached').locator('.big')).toHaveText('0 of 29');
    await expect(kpi(page, 'none running')).toBeVisible();
    await expect(kpi(page, 'ready to start').locator('.big')).toHaveText('1');
    await expect(kpi(page, 'buildings and parts open').locator('.big')).not.toHaveText('0');
    await open(page, 'screen=research&reached=3');
    await expect(kpi(page, 'milestones reached').locator('.big')).toHaveText('3 of 29');
  });

  test('the programmes tab groups milestones by state and a tile selects one', async ({ page }) => {
    await open(page, 'screen=research&rtab=programmes');
    const group = (status: string) => page.locator(`.slot[data-status="${status}"]`);
    await expect(page.locator('h3[data-group="running"]')).toContainText('0');
    await expect(page.locator('h3[data-group]')).toHaveCount(4);
    await expect(group('ready')).toHaveCount(1);
    await expect(group('locked')).toHaveCount(28);
    await expect(group('ready').locator('.ui-nm')).toHaveText('Orbital launch');
    await page.locator('.slot[data-milestone="6"] button').click();
    await expect(title(page)).toHaveText('6. Crewed lunar landing and surface outpost');
    await expectCleanLayout(page);
  });

  test('the card checks the prerequisites and nothing else', async ({ page }) => {
    await open(page, 'screen=research&milestone=6');
    await expect(page.locator('#programmeStart')).toBeDisabled();
    await expect(page.locator('#programmeWhy')).toContainText('Needs');
    await expect(page.locator('#requires')).toContainText('LEO station');
    await expect(page.locator('#programmeBill, #siteNeeds, .ui-have')).toHaveCount(0);
    await open(page, 'screen=research&milestone=6&reached=5');
    await expect(page.locator('#programmeStart')).toBeEnabled();
    await expect(page.locator('#programmeWhy')).toHaveCount(0);
    await open(page, 'screen=research&milestone=2&reached=1');
    await expect(page.locator('#requires .ui-tile')).toHaveCount(1);
  });

  test('the Start button stays inside a 1280x720 window for every milestone', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page, 'screen=research');
    for (let n = 1; n <= 29; n++) {
      await tile(page, n).click();
      const b = await page.locator('#programmeStart').boundingBox();
      expect(b, `milestone ${n}`).not.toBeNull();
      expect(b!.y, `milestone ${n}`).toBeGreaterThanOrEqual(0);
      expect(b!.y + b!.height, `milestone ${n}`).toBeLessThanOrEqual(720);
      expect(b!.x + b!.width, `milestone ${n}`).toBeLessThanOrEqual(1280);
    }
  });

  test('a programme is started here, runs with the clock, survives a screen switch and writes an event', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'ready');
    await expect(page.locator('#programmeWhy')).toHaveCount(0);
    await expect(page.locator('#programmeStart')).toBeEnabled();
    await page.locator('#programmeStart').click();
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'running');
    await expect(page.locator('#programmeStart')).toHaveCount(0);
    await expect(page.locator('#programmeProgress')).toBeVisible();
    await expect(kpi(page, 'next done in 60 d')).toBeVisible();
    await rtab(page, 'programmes');
    await expect(page.locator('.slot[data-status="running"]')).toHaveCount(1);
    await page.locator('[data-nav="economy"]').click();
    await page.locator('[data-nav="research"]').click();
    await expect(page.locator('.slot[data-status="running"]')).toHaveCount(1);
    await advance(page, 30 * DAY, 3);
    await expect(page.locator('.slot[data-status="done"]')).toHaveCount(1);
    await rtab(page, 'tree');
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'done');
    await expect(page.locator('#techTree path.e').first()).toHaveAttribute('d', /^M/);
    const events = await eventTexts(page);
    expect(events.some((e) => e.includes('Milestone 1 reached: Reusable orbital launch.'))).toBe(true);
  });
});

test.describe('commanders', () => {
  const tile = (page: Page, name: string): Locator =>
    page.locator('.ui-tile.off').filter({ has: page.locator('.ui-nm b', { hasText: name }) });
  const tiles = (page: Page): Locator => page.locator('.ui-tile.off');
  const names = (page: Page) => tiles(page).locator('.ui-nm b').allTextContents();
  const slot = (page: Page, label: string): Locator =>
    page.locator('.ui-card .ui-tile.slot').filter({ has: page.getByText(label, { exact: true }) });
  const card = (page: Page): Locator => page.locator('.ui-card');
  const stat = (page: Page, label: string): Locator =>
    page.locator('.ui-kpi').filter({ has: page.getByText(label, { exact: true }) });
  const chip = (page: Page, id: string): Locator => page.locator(`[data-filter="${id}"]`);
  const postTab = (page: Page, tab: 'officers' | 'posts') => page.locator(`[data-tab="${tab}"]`).click();
  const faceOf = (page: Page, name: string) => tile(page, name).locator('img.portrait').getAttribute('src');

  test('the query selects an officer and the card shows bust, gender, post, service, best skill and skills', async ({
    page
  }) => {
    await open(page, 'screen=commanders&cmd=3');
    await expect(card(page).locator('.t')).toHaveText('S. Novak');
    await expect(card(page).locator('.s')).toHaveText('Captain, age 55');
    const flow = card(page).locator('.flow').first();
    await expect(flow).toContainText('GenderMale');
    await expect(flow).toContainText('PostSurvey office');
    await expect(flow).toContainText('Served');
    await expect(flow).toContainText('Best at');
    await expect(card(page).locator('[role="meter"]')).toHaveCount(5);
    const bust = card(page).locator('img.portrait.bust');
    await expect(bust).toHaveAttribute('width', '192');
    await expect(bust).toHaveAttribute('height', '216');
    expect(await bust.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([64, 72]);
    expect(await bust.evaluate((i) => getComputedStyle(i).imageRendering)).toBe('pixelated');
    await expect(tiles(page)).toHaveCount(14);
    await expectCleanLayout(page);
  });

  test('every officer has a portrait tile with name, rank and post', async ({ page }) => {
    await open(page, 'screen=commanders');
    await expect(tiles(page)).toHaveCount(14);
    const head = tiles(page).first().locator('img.portrait.head');
    expect(await head.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([32, 36]);
    await expect(tile(page, 'S. Novak')).toContainText('Captain');
    await expect(tile(page, 'S. Novak')).toContainText('Survey office');
    await expect(tile(page, 'M. Chen')).toContainText('unassigned');
    await expect(stat(page, 'officers')).toContainText('14');
    await expect(stat(page, 'in a post')).toContainText('6');
    await expect(stat(page, 'posts vacant')).toContainText('0');
    await expect(stat(page, 'flag officers')).toContainText('2');
  });

  test('selecting a tile shows that officer', async ({ page }) => {
    await open(page, 'screen=commanders');
    await tile(page, 'M. Chen').click();
    await expect(tile(page, 'M. Chen')).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page).locator('.t')).toHaveText('M. Chen');
    await expect(card(page).locator('.s')).toHaveText('Captain, age 57');
    await expect(card(page).locator('.flow').first()).toContainText('Postunassigned');
    await expect(card(page).locator('.flow').first()).toContainText('GenderFemale');
  });

  test('the same officer keeps the same face when the order changes', async ({ page }) => {
    await open(page, 'screen=commanders');
    const before = await faceOf(page, 'R. Vasquez');
    await page.locator('#sortDir').selectOption('asc');
    expect((await names(page))[0]).toBe('C. Brandt');
    expect(await faceOf(page, 'R. Vasquez')).toBe(before);
    expect(await faceOf(page, 'C. Brandt')).not.toBe(before);
  });

  test('the officers sort by each key in both directions', async ({ page }) => {
    await open(page, 'screen=commanders');
    expect((await names(page))[0]).toBe('R. Vasquez');
    await page.locator('#sortDir').selectOption('asc');
    expect((await names(page))[0]).toBe('C. Brandt');
    await page.locator('#sortBy').selectOption('name');
    await page.locator('#sortDir').selectOption('desc');
    expect((await names(page))[0]).toBe('H. Yilmaz');
    await page.locator('#sortBy').selectOption('age');
    expect((await names(page))[0]).toBe('R. Vasquez');
    await page.locator('#sortDir').selectOption('asc');
    expect((await names(page))[0]).toBe('C. Brandt');
    await page.locator('#sortBy').selectOption('post');
    await page.locator('#sortDir').selectOption('asc');
    await expect(tiles(page).first()).toContainText('Governor, Earth');
    await expectCleanLayout(page);
  });

  test('the officers filter by post group and by rank', async ({ page }) => {
    await open(page, 'screen=commanders');
    await expect(chip(page, 'all')).toContainText('All 14');
    await expect(chip(page, 'assigned')).toContainText('Assigned 6');
    await expect(chip(page, 'none')).toContainText('Unassigned 8');
    await expect(chip(page, 'governor')).toContainText('Governors 1');
    await expect(chip(page, 'staff')).toContainText('Staff 5');
    await expect(chip(page, 'fleet')).toHaveCount(0);
    await expect(chip(page, 'ship')).toHaveCount(0);
    await chip(page, 'governor').click();
    expect(await names(page)).toEqual(['T. Nakamura']);
    await expect(chip(page, 'governor')).toHaveAttribute('aria-pressed', 'true');
    await chip(page, 'staff').click();
    await expect(tiles(page)).toHaveCount(5);
    await chip(page, 'all').click();
    await page.locator('#rankFilter').selectOption('captain');
    expect(await names(page)).toEqual(['M. Chen', 'S. Novak', 'I. Petrov']);
    await chip(page, 'none').click();
    expect(await names(page)).toEqual(['M. Chen', 'I. Petrov']);
    await page.locator('#rankFilter').selectOption('all');
    await expect(tiles(page)).toHaveCount(8);
    await chip(page, 'assigned').click();
    await expect(tiles(page)).toHaveCount(6);
    await expectCleanLayout(page);
  });

  test('an officer is assigned to a colony or staff post from the game state, and no fleet or ship exists', async ({
    page
  }) => {
    await open(page, 'screen=commanders');
    await tile(page, 'I. Petrov').click();
    await expect(card(page).locator('.ui-tile.slot .ui-nm b')).toHaveText([
      'Governor, Earth',
      'Home fleet command',
      'Naval staff',
      'Naval academy',
      'Launch office',
      'Survey office',
      'Unassign'
    ]);
    await expect(slot(page, 'Unassign')).toBeDisabled();
    await slot(page, 'Governor, Earth').hover();
    await expect(page.locator('#ui-tip')).toContainText('Now held by T. Nakamura');
    await slot(page, 'Governor, Earth').click();
    await expect(tile(page, 'I. Petrov')).toContainText('Governor, Earth');
    await expect(tile(page, 'T. Nakamura')).toContainText('unassigned');
    await expect(slot(page, 'Governor, Earth')).toHaveAttribute('aria-pressed', 'true');
    await slot(page, 'Naval academy').click();
    await expect(tile(page, 'F. Moreau')).toContainText('unassigned');
    await expect(tile(page, 'I. Petrov')).toContainText('Naval academy');
    await expectCleanLayout(page);
  });

  test('taking a held post relieves its holder, and releasing leaves the officer unassigned', async ({
    page
  }) => {
    await open(page, 'screen=commanders');
    await tile(page, 'I. Petrov').click();
    await slot(page, 'Launch office').click();
    await expect(tile(page, 'J. Okonkwo')).toContainText('unassigned');
    await postTab(page, 'posts');
    await expect(tile(page, 'Launch office')).toContainText('I. Petrov');
    await postTab(page, 'officers');
    await slot(page, 'Unassign').click();
    await expect(tile(page, 'I. Petrov')).toContainText('unassigned');
    await postTab(page, 'posts');
    await expect(tile(page, 'Launch office')).toContainText('vacant');
    await expect(stat(page, 'posts vacant')).toContainText('1');
    const events = await eventTexts(page);
    expect(
      events.some((e) => e.includes('I. Petrov was posted to Launch office. J. Okonkwo was relieved.'))
    ).toBe(true);
    expect(events.some((e) => e.includes('I. Petrov was released from Launch office.'))).toBe(true);
  });

  test('a held post tile selects its holder and a vacant one takes the selected officer', async ({
    page
  }) => {
    await open(page, 'screen=commanders');
    await postTab(page, 'posts');
    await expect(page.locator('h3', { hasText: 'Governors' })).toBeVisible();
    await expect(page.locator('h3', { hasText: 'Staff' })).toBeVisible();
    await expect(tiles(page)).toHaveCount(6);
    await tile(page, 'Survey office').click();
    await expect(card(page).locator('.t')).toHaveText('S. Novak');
    await slot(page, 'Unassign').click();
    await expect(tile(page, 'Survey office')).toHaveClass(/warn/);
    await expect(tile(page, 'Survey office')).toContainText('vacant');
    await postTab(page, 'officers');
    await tile(page, 'D. Kaur').click();
    await postTab(page, 'posts');
    await tile(page, 'Survey office').click();
    await expect(tile(page, 'Survey office')).toContainText('D. Kaur');
    await expect(tile(page, 'Survey office')).not.toHaveClass(/warn/);
    await expect(stat(page, 'posts vacant')).toContainText('0');
    await expectCleanLayout(page);
  });

  test('a promotion moves the officer up one rank until the highest', async ({ page }) => {
    await open(page, 'screen=commanders');
    await tile(page, 'H. Yilmaz').click();
    await expect(page.locator('#promote')).toHaveText('Promote to Lt commander');
    await page.locator('#promote').click();
    await expect(card(page).locator('.s')).toHaveText('Lt commander, age 35');
    await expect(tile(page, 'H. Yilmaz')).toContainText('Lt commander');
    await tile(page, 'R. Vasquez').click();
    await expect(page.locator('#promote')).toBeDisabled();
    await expect(page.locator('#promote')).toHaveText('Highest rank');
  });

  test('officers age with the clock', async ({ page }) => {
    await open(page, 'screen=commanders');
    await tile(page, 'R. Vasquez').click();
    await expect(card(page).locator('.s')).toHaveText('Admiral, age 63');
    await advance(page, 30 * DAY, 12);
    await advance(page, 5 * DAY);
    await advance(page, DAY);
    await expect(card(page).locator('.s')).toHaveText('Admiral, age 64');
  });

  test('the selected officer, the tab and the sort survive switching screens', async ({ page }) => {
    await open(page, 'screen=commanders');
    await page.locator('#sortBy').selectOption('name');
    await tile(page, 'E. Larsen').click();
    await page.locator('[data-nav="intel"]').click();
    await page.locator('[data-nav="commanders"]').click();
    await expect(page.locator('#sortBy')).toHaveValue('name');
    await expect(card(page).locator('.t')).toHaveText('E. Larsen');
    await postTab(page, 'posts');
    await page.locator('[data-nav="intel"]').click();
    await page.locator('[data-nav="commanders"]').click();
    await expect(page.locator('[data-tab="posts"]')).toHaveClass(/on/);
  });
});

test.describe('intelligence', () => {
  test('with nothing seen beyond our own craft the screen says so', async ({ page }) => {
    await open(page, 'screen=intel');
    await expect(page.locator('#noGroups')).toBeVisible();
    await expect(page.locator('#noClasses')).toBeVisible();
    await expect(page.locator('#noSightings')).toBeVisible();
    await expect(page.locator('#sightingCount')).toHaveText('0');
    await expect(page.locator('#showOnMap')).toBeDisabled();
    await expectCleanLayout(page);
  });
});
