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

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const panel = (page: Page, title: string): Locator =>
  page.locator('.pan').filter({ has: page.locator('h2', { hasText: new RegExp(`^\\s*${escape(title)}`) }) });

const rows = (page: Page, title: string): Locator => panel(page, title).locator('tr.pick');

const row = (page: Page, title: string, text: string): Locator => rows(page, title).filter({ hasText: text });

const node = (page: Page, n: number): Locator => page.locator(`#techLabels [data-milestone="${n}"]`);

async function advance(page: Page, seconds: number, times = 1) {
  for (let i = 0; i < times; i++) await page.locator(`#steps [data-step="${seconds}"]`).click();
}

async function eventTexts(page: Page): Promise<string[]> {
  await page.locator('[data-nav="map"]').click();
  await expect(page.locator('#desk')).toBeVisible();
  return page.locator('#events .ev').allTextContents();
}

test.describe('research', () => {
  test('shows the 29 milestones as a chain, and a node click selects one', async ({ page }) => {
    await open(page, 'screen=research');
    await expect(page.locator('#techLabels span')).toHaveCount(29);
    await expect(node(page, 1)).toHaveClass(/waiting/);
    await expect(node(page, 2)).toHaveClass(/locked/);
    await node(page, 29).click();
    await expect(page.locator('#techLabels .sel')).toHaveText('29');
    await expect(page.locator('#milestoneDetail h3').first()).toHaveText('29. Jump point stabilisation');
    await expect(row(page, 'Milestones', 'Jump point stabilisation')).toHaveClass(/on/);
    await expectCleanLayout(page);
  });

  test('the query selects a milestone', async ({ page }) => {
    await open(page, 'screen=research&milestone=12');
    await expect(page.locator('#milestoneDetail h3').first()).toHaveText('12. Cislunar propellant economy');
  });

  test('a programme started here runs with the clock, survives a screen switch and writes an event', async ({
    page
  }) => {
    await open(page, 'screen=economy&tab=production');
    await page.locator('#groups tr.pick', { hasText: 'Stainless steel' }).first().click();
    await page.locator('#recipePick').selectOption({ label: 'GRCop copper-chromium-niobium alloy' });
    await page.locator('input[name="switchCount"]').fill('1');
    await page.locator('#recipeSwitch').click();
    await advance(page, DAY);
    await page.locator('[data-nav="research"]').click();
    await expect(node(page, 1)).toHaveClass(/ready/);
    await page.locator('#programmeStart').click();
    await expect(node(page, 1)).toHaveClass(/running/);
    await expect(panel(page, 'Running').locator('tr', { hasText: 'Reusable orbital launch' })).toBeVisible();
    await page.locator('[data-nav="economy"]').click();
    await page.locator('[data-nav="research"]').click();
    await expect(node(page, 1)).toHaveClass(/running/);
    await advance(page, 30 * DAY, 3);
    await expect(node(page, 1)).toHaveClass(/done/);
    await expect(page.locator('#chips .chip[title="Milestones reached"]')).toHaveText('1/29');
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
