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

const postRow = (page: Page, label: string): Locator =>
  rows(page, 'Posts').filter({ has: page.getByRole('cell', { name: label, exact: true }) });

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
  const nameColumn = async (page: Page) =>
    rows(page, 'Officers').locator('td:nth-child(2)').allTextContents();

  test('the query selects an officer and the panel shows portrait, post, age, service and skills', async ({
    page
  }) => {
    await open(page, 'screen=commanders&cmd=3');
    await expect(panel(page, 'Captain S. Novak')).toBeVisible();
    await expect(page.locator('.portrait canvas')).toHaveAttribute('width', '60');
    await expect(panel(page, 'Captain S. Novak').locator('dl').first()).toContainText('Survey office');
    await expect(panel(page, 'Captain S. Novak').locator('dl').first()).toContainText('Service');
    await expect(panel(page, 'Captain S. Novak').locator('.skill')).toHaveCount(5);
    const lit = await page
      .locator('.portrait canvas')
      .evaluate(
        (c: HTMLCanvasElement) => new Set([...c.getContext('2d')!.getImageData(0, 0, 60, 64).data]).size
      );
    expect(lit).toBeGreaterThan(20);
    await expectCleanLayout(page);
  });

  test('selecting a row shows that officer', async ({ page }) => {
    await open(page, 'screen=commanders');
    await row(page, 'Officers', 'M. Chen').click();
    await expect(row(page, 'Officers', 'M. Chen')).toHaveClass(/on/);
    await expect(panel(page, 'Captain M. Chen').locator('dl').first()).toContainText('Unassigned');
    await expect(panel(page, 'Captain M. Chen').locator('dl').first()).toContainText('57');
  });

  test('the table sorts by column in both directions', async ({ page }) => {
    await open(page, 'screen=commanders');
    expect((await nameColumn(page))[0]).toBe('R. Vasquez');
    await page.locator('#sortDir').selectOption('asc');
    expect((await nameColumn(page))[0]).toBe('C. Brandt');
    await page.locator('#sortBy').selectOption('name');
    await page.locator('#sortDir').selectOption('desc');
    expect((await nameColumn(page))[0]).toBe('H. Yilmaz');
    await page.locator('#sortBy').selectOption('age');
    expect((await nameColumn(page))[0]).toBe('R. Vasquez');
    await page.locator('#sortDir').selectOption('asc');
    expect((await nameColumn(page))[0]).toBe('C. Brandt');
    await page.locator('#sortBy').selectOption('post');
    await page.locator('#sortDir').selectOption('asc');
    await expect(rows(page, 'Officers').first()).toContainText('Governor, Earth');
    await expectCleanLayout(page);
  });

  test('the table filters by rank and by assigned or unassigned', async ({ page }) => {
    await open(page, 'screen=commanders');
    await page.locator('#rankFilter').selectOption('captain');
    await expect(rows(page, 'Officers')).toHaveCount(3);
    await expect(page.locator('#officerCount')).toHaveText('3 of 14');
    await page.locator('#assignFilter').selectOption('unassigned');
    await expect(rows(page, 'Officers')).toHaveCount(2);
    await expect(rows(page, 'Officers').last()).toContainText('I. Petrov');
    await page.locator('#rankFilter').selectOption('all');
    await expect(rows(page, 'Officers')).toHaveCount(8);
    await page.locator('#assignFilter').selectOption('assigned');
    await expect(rows(page, 'Officers')).toHaveCount(6);
    await expectCleanLayout(page);
  });

  test('an officer is assigned to a colony or staff from the game state lists, and no fleet or ship exists', async ({
    page
  }) => {
    await open(page, 'screen=commanders');
    await row(page, 'Officers', 'I. Petrov').click();
    for (const kind of ['fleet', 'ship']) {
      await page.locator('#postKind').selectOption(kind);
      await expect(page.locator('#postRef option')).toHaveText(['None exist yet']);
      await expect(page.locator('#assign')).toBeDisabled();
    }
    await page.locator('#postKind').selectOption('governor');
    await expect(page.locator('#postRef option')).toHaveText(['Governor, Earth (T. Nakamura)']);
    await page.locator('#assign').click();
    await expect(row(page, 'Officers', 'I. Petrov')).toContainText('Governor, Earth');
    await expect(row(page, 'Officers', 'T. Nakamura')).toContainText('Unassigned');
    await page.locator('#postKind').selectOption('staff');
    await page.locator('#postRef').selectOption({ label: 'Naval academy (F. Moreau)' });
    await page.locator('#assign').click();
    await expect(row(page, 'Officers', 'F. Moreau')).toContainText('Unassigned');
    await expect(row(page, 'Officers', 'I. Petrov')).toContainText('Naval academy');
    await expectCleanLayout(page);
  });

  test('taking a held post relieves its holder, and releasing leaves the officer unassigned', async ({
    page
  }) => {
    await open(page, 'screen=commanders');
    await row(page, 'Officers', 'I. Petrov').click();
    await page.locator('#postKind').selectOption('staff');
    await page.locator('#postRef').selectOption({ label: 'Launch office (J. Okonkwo)' });
    await page.locator('#assign').click();
    await expect(row(page, 'Officers', 'J. Okonkwo')).toContainText('Unassigned');
    await expect(postRow(page, 'Launch office')).toContainText('I. Petrov');
    await page.locator('#postKind').selectOption('none');
    await expect(page.locator('#assign')).toHaveText('Release');
    await page.locator('#assign').click();
    await expect(row(page, 'Officers', 'I. Petrov')).toContainText('Unassigned');
    await expect(postRow(page, 'Launch office')).toContainText('Vacant');
    const events = await eventTexts(page);
    expect(
      events.some((e) => e.includes('I. Petrov was posted to Launch office. J. Okonkwo was relieved.'))
    ).toBe(true);
    expect(events.some((e) => e.includes('I. Petrov was released from Launch office.'))).toBe(true);
  });

  test('a row in the posts table picks the post for the assignment form', async ({ page }) => {
    await open(page, 'screen=commanders');
    await row(page, 'Officers', 'D. Kaur').click();
    await postRow(page, 'Survey office').click();
    await expect(page.locator('#postKind')).toHaveValue('staff');
    await expect(page.locator('#postRef')).toHaveValue('survey-office');
    await page.locator('#assign').click();
    await expect(row(page, 'Officers', 'D. Kaur')).toContainText('Survey office');
  });

  test('a promotion moves the officer up one rank until the highest', async ({ page }) => {
    await open(page, 'screen=commanders');
    await row(page, 'Officers', 'H. Yilmaz').click();
    await expect(page.locator('#promote')).toHaveText('Promote to Lt commander');
    await page.locator('#promote').click();
    await expect(panel(page, 'Lt commander H. Yilmaz')).toBeVisible();
    await expect(row(page, 'Officers', 'H. Yilmaz')).toContainText('Lt commander');
    await row(page, 'Officers', 'R. Vasquez').click();
    await expect(page.locator('#promote')).toBeDisabled();
    await expect(page.locator('#promote')).toHaveText('Highest rank');
  });

  test('officers age with the clock', async ({ page }) => {
    await open(page, 'screen=commanders');
    const age = () => row(page, 'Officers', 'R. Vasquez').locator('td').last();
    await expect(age()).toHaveText('63');
    await advance(page, 30 * DAY, 12);
    await advance(page, 5 * DAY);
    await advance(page, DAY);
    await expect(age()).toHaveText('64');
    await row(page, 'Officers', 'R. Vasquez').click();
    await expect(panel(page, 'Admiral R. Vasquez').locator('dl').first()).toContainText('64');
  });

  test('the selected officer and the sort survive switching screens', async ({ page }) => {
    await open(page, 'screen=commanders');
    await page.locator('#sortBy').selectOption('name');
    await row(page, 'Officers', 'E. Larsen').click();
    await page.locator('[data-nav="intel"]').click();
    await page.locator('[data-nav="commanders"]').click();
    await expect(page.locator('#sortBy')).toHaveValue('name');
    await expect(panel(page, 'Lt commander E. Larsen')).toBeVisible();
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
