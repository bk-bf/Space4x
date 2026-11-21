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
  const tile = (page: Page, n: number): Locator => page.locator(`#techTree [data-project="${n}"] button`);
  const slot = (page: Page, n: number): Locator => page.locator(`#techTree [data-project="${n}"]`);
  const card = (page: Page): Locator => page.locator('[data-screen="research"] .ui-card');
  const title = (page: Page): Locator => card(page).locator('header .t');
  const kpi = (page: Page, label: string): Locator =>
    page.locator('[data-screen="research"] .ui-kpi').filter({ has: page.getByText(label, { exact: true }) });
  const rtab = (page: Page, id: string) =>
    page.locator(`[data-screen="research"] [data-tab="${id}"]`).click();
  const READY_AT_START = [1, 3, 7, 9, 20, 41, 45, 53, 57, 65];

  test('shows the 74 projects as tiles in a dependency tree, and a tile click selects one', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await expect(page.locator('#techTree .tpos')).toHaveCount(74);
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'ready');
    await expect(slot(page, 2)).toHaveAttribute('data-status', 'locked');
    await expect(title(page)).toHaveText('1. Booster recovery');
    await tile(page, 38).click();
    await expect(title(page)).toHaveText('38. Jump point stabilisation');
    await expect(tile(page, 38)).toHaveClass(/sel/);
    await expect(tile(page, 1)).not.toHaveClass(/sel/);
    await expectCleanLayout(page);
  });

  test('selecting a project outlines what it needs and what needs it, and colours the lines to match', async ({
    page
  }) => {
    await open(page, 'screen=research&project=4');
    await expect(tile(page, 2)).toHaveClass(/needs/);
    await expect(tile(page, 3)).toHaveClass(/needs/);
    await expect(tile(page, 5)).toHaveClass(/feeds/);
    await expect(tile(page, 49)).toHaveClass(/feeds/);
    await expect(tile(page, 7)).not.toHaveClass(/needs|feeds/);
    await expect(page.locator('#techTree path.e.into')).toHaveCount(2);
    await expect(page.locator('#techTree path.e.out')).toHaveCount(6);
    await expect(page.locator('#techTree path.e.done')).toHaveCount(0);
    await open(page, 'screen=research&project=12&reached=3');
    await expect(page.locator('#techTree path.e.done').first()).toHaveAttribute('d', /^M/);
  });

  test('the tiles keep one size and never overlap, in a tall and in a short window', async ({ page }) => {
    for (const size of [
      { width: 1440, height: 900 },
      { width: 1280, height: 720 }
    ]) {
      await page.setViewportSize(size);
      await open(page, 'screen=research');
      const boxes = await page
        .locator('#techTree .tpos button')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
      expect(boxes).toHaveLength(74);
      for (const [i, b] of boxes.entries()) {
        expect(b.width, `project ${i + 1}`).toBe(144);
        expect(b.height, `project ${i + 1}`).toBe(56);
      }
      for (const [i, a] of boxes.entries())
        for (const [j, b] of boxes.entries()) {
          if (i >= j) continue;
          const apart =
            a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
          expect(apart, `${i + 1} and ${j + 1} at ${size.width}`).toBe(true);
        }
    }
  });

  test('the tree scrolls inside its panel, never the page, and brings the selected tile into view', async ({
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
    await page.mouse.move(box.x + box.width - 30, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 230, box.y + 4, { steps: 5 });
    await page.mouse.up();
    await expect.poll(async () => (await metrics()).left).toBeGreaterThan(100);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)
    ).toBeLessThanOrEqual(0);

    await open(page, 'screen=research&project=38');
    const t = (await tile(page, 38).boundingBox())!;
    const v = (await page.locator('#techTree').boundingBox())!;
    expect((await metrics()).left).toBeGreaterThan(0);
    expect(t.x).toBeGreaterThanOrEqual(v.x + 132);
    expect(t.x + t.width).toBeLessThanOrEqual(v.x + v.width + 1);
    await tile(page, 1).click();
    await expect.poll(async () => (await metrics()).left).toBe(0);
  });

  test('the lane labels stay in place while the tree scrolls', async ({ page }) => {
    await open(page, 'screen=research&project=38');
    const label = page.locator('#techTree [data-lane="launch"]');
    const v = (await page.locator('#techTree').boundingBox())!;
    expect(Math.abs((await label.boundingBox())!.x - v.x)).toBeLessThanOrEqual(1);
    await expect(label).toContainText('Launch and logistics');
    await expect(page.locator('#techTree [data-lane]')).toHaveCount(8);
  });

  test('a locked tile names the prerequisites it waits for, and a project whose prerequisites are researched is ready while an unrelated one is not', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await tile(page, 2).hover();
    await expect(page.locator('#ui-tip')).toContainText('Locked until Booster recovery researched');
    await open(page, 'screen=research&reached=3&project=4');
    await expect(slot(page, 4)).toHaveAttribute('data-status', 'ready');
    await expect(slot(page, 5)).toHaveAttribute('data-status', 'locked');
    await expect(page.locator('#requires .ui-tile')).toHaveCount(2);
    await expect(page.locator('#programmeWhy')).toHaveCount(0);
    await expect(page.locator('#programmeStart')).toBeEnabled();
  });

  test('the query selects a project and a tab', async ({ page }) => {
    await open(page, 'screen=research&project=12&rtab=unlocks');
    await expect(title(page)).toHaveText('12. Asteroid mining');
    await expect(page.locator('[data-unlock="12"]')).toHaveClass(/sel/);
    await expect(page.locator('[data-unlock="0"]')).toContainText('At the start');
    await expect(page.locator('[data-unlock="53"]')).toContainText('×1.2 research points a lab');
    await page.locator('[data-unlock="5"]').click();
    await expect(title(page)).toHaveText('5. Autonomous operations');
  });

  test('the strip counts researched and running projects, labs, compute and scientists, and the top bar the labs', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await expect(kpi(page, 'researched').locator('.big')).toHaveText('0 of 74');
    await expect(kpi(page, 'none running')).toBeVisible();
    await expect(kpi(page, 'labs assigned').locator('.big')).toHaveText('0 / 4');
    await expect(kpi(page, '6 unassigned')).toBeVisible();
    await expect(page.locator('#chips [data-chip="labs"]')).toContainText('0 / 4');
    await open(page, 'screen=research&reached=3&start=4');
    await expect(kpi(page, 'researched').locator('.big')).toHaveText('3 of 74');
    await expect(kpi(page, 'labs assigned').locator('.big')).toHaveText('3 / 4');
    await expect(kpi(page, '5 unassigned')).toBeVisible();
    await expect(kpi(page, 'to labs').locator('.big')).toHaveText('54 EFLOP/s');
  });

  test('the projects tab groups projects by state and a tile selects one', async ({ page }) => {
    await open(page, 'screen=research&rtab=programmes');
    const group = (status: string) => page.locator(`.slot[data-status="${status}"]`);
    await expect(page.locator('h3[data-group="running"]')).toContainText('0');
    await expect(page.locator('h3[data-group]')).toHaveCount(6);
    await expect(group('ready')).toHaveCount(READY_AT_START.length);
    await expect(group('locked')).toHaveCount(74 - READY_AT_START.length);
    await page.locator('.slot[data-project="6"] button').click();
    await expect(title(page)).toHaveText('6. Remote-sensing instruments');
    await expectCleanLayout(page);
  });

  test('the card checks the prerequisites and nothing else', async ({ page }) => {
    await open(page, 'screen=research&project=6');
    await expect(page.locator('#programmeStart')).toHaveCount(0);
    await expect(page.locator('#programmeWhy')).toContainText('Needs');
    await expect(page.locator('#requires')).toContainText('Autonomous operations');
    await expect(page.locator('#programmeBill, #siteNeeds, .ui-have')).toHaveCount(0);
    await open(page, 'screen=research&project=6&reached=5');
    await expect(page.locator('#programmeStart')).toBeEnabled();
    await expect(page.locator('#programmeScientists .ui-tile')).toHaveCount(6);
    await expect(page.locator('#programmeWhy')).toHaveCount(0);
  });

  test('the Create button scrolls into a 1280x720 window inside the card column for every project ready at the start', async ({
    page
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await open(page, 'screen=research');
    for (const n of READY_AT_START) {
      await tile(page, n).click();
      await page.locator('#programmeStart').scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollTop)).toBe(0);
      const b = await page.locator('#programmeStart').boundingBox();
      expect(b, `project ${n}`).not.toBeNull();
      expect(b!.y, `project ${n}`).toBeGreaterThanOrEqual(0);
      expect(b!.y + b!.height, `project ${n}`).toBeLessThanOrEqual(720);
      expect(b!.x + b!.width, `project ${n}`).toBeLessThanOrEqual(1280);
    }
  });

  test('a project is created on a scientist and labs, runs with the clock, survives a screen switch and writes an event', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await expect(page.locator('#programmeScientists .ui-tile').first()).toContainText('Aiko Tanaka');
    await expect(page.locator('#programmePlanLabs')).toContainText('3 / 3');
    await page.locator('#programmeStart').click();
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'running');
    await expect(page.locator('#programmeLead')).toContainText('Aiko Tanaka');
    await expect(page.locator('#programmeLabs')).toContainText('3 / 3');
    await page.locator('#programmeLabs button').first().click();
    await expect(page.locator('#programmeLabs')).toContainText('2 / 3');
    await expect(kpi(page, 'labs assigned').locator('.big')).toHaveText('2 / 4');
    await rtab(page, 'programmes');
    await expect(page.locator('.slot[data-status="running"]')).toHaveCount(1);
    await page.locator('[data-nav="economy"]').click();
    await page.locator('[data-nav="research"]').click();
    await expect(page.locator('.slot[data-status="running"]')).toHaveCount(1);
    await advance(page, 30 * DAY, 12);
    await expect(page.locator('.slot[data-status="done"]')).toHaveCount(1);
    await rtab(page, 'tree');
    await expect(slot(page, 1)).toHaveAttribute('data-status', 'done');
    const events = await eventTexts(page);
    expect(events.some((e) => e.includes('Booster recovery researched.'))).toBe(true);
  });

  test("a busy scientist's project is queued and can be cancelled", async ({ page }) => {
    await open(page, 'screen=research&project=9&start=1');
    await page.locator('#programmeScientists .ui-tile', { hasText: 'Aiko Tanaka' }).click();
    await expect(page.locator('#programmeStart')).toHaveText('Queue for Aiko');
    await expect(page.locator('#programmePlanLabs')).toHaveCount(0);
    await page.locator('#programmeStart').click();
    await expect(slot(page, 9)).toHaveAttribute('data-status', 'queued');
    await expect(page.locator('#programmeQueued')).toContainText('Queued for Aiko Tanaka');
    await page.locator('#programmeCancel').click();
    await expect(slot(page, 9)).toHaveAttribute('data-status', 'ready');
  });

  test('a project behind a running prerequisite is queued, waits on it and can be removed', async ({
    page
  }) => {
    await open(page, 'screen=research&project=2&start=1');
    await expect(slot(page, 2)).toHaveAttribute('data-status', 'locked');
    await page.locator('#programmeScientists .ui-tile', { hasText: 'Marcus Bell' }).click();
    await expect(page.locator('#programmeStart')).toHaveText('Queue for Marcus');
    await expect(page.locator('#programmePlanLabs')).toHaveCount(0);
    await page.locator('#programmeStart').click();
    await expect(slot(page, 2)).toHaveAttribute('data-status', 'waiting');
    await expect(page.locator('#programmeWaiting')).toHaveText('Waiting on Booster recovery');
    await expect(page.locator('#programmeQueued')).toContainText('Queued for Marcus Bell');
    await rtab(page, 'programmes');
    await expect(page.locator('.slot[data-status="waiting"]')).toHaveCount(1);
    await page.locator('#programmeCancel').click();
    await expect(page.locator('.slot[data-status="waiting"]')).toHaveCount(0);
    await rtab(page, 'tree');
    await expect(slot(page, 2)).toHaveAttribute('data-status', 'locked');
  });

  test('the scientists tab shows every scientist with a portrait, and their card creates a project', async ({
    page
  }) => {
    await open(page, 'screen=research&rtab=scientists');
    const tiles = page.locator('#scientists .ui-tile.off');
    await expect(tiles).toHaveCount(6);
    await expect(tiles.first().locator('img.portrait.head')).toBeVisible();
    await tiles.nth(1).click();
    await expect(title(page)).toHaveText('Marcus Bell');
    await expect(card(page)).toContainText('Administration 4 labs');
    await page.locator('#scientistProjects [data-project="3"]').click();
    await expect(tiles.nth(1)).toContainText('Closed-loop water and air');
    await expectCleanLayout(page);
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
    await expect(page.locator('[data-screen="intel"] table')).toHaveCount(0);
    await expect(page.locator('#sightingCount')).toHaveText('0');
    await expect(page.locator('#showOnMap')).toBeDisabled();
    await expectCleanLayout(page);
  });
});
