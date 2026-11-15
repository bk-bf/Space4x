import { expect, test, type Locator, type Page } from '@playwright/test';

const FIELDS = ['propulsion', 'power', 'sensors', 'weapons', 'defence', 'industry', 'biology', 'logistics'];
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

const tech = (page: Page, id: string): Locator => page.locator(`#techLabels [data-tech="${id}"]`);

const labsChip = (page: Page): Locator => page.locator('#chips .chip[title="Labs busy"]');

async function advance(page: Page, seconds: number, times = 1) {
  for (let i = 0; i < times; i++) await page.locator(`#steps [data-step="${seconds}"]`).click();
}

async function eventTexts(page: Page): Promise<string[]> {
  await page.locator('[data-nav="map"]').click();
  await expect(page.locator('#desk')).toBeVisible();
  return page.locator('#events .ev').allTextContents();
}

test.describe('research', () => {
  test('each of the eight field tabs shows its own tree of eight technologies', async ({ page }) => {
    await open(page, 'screen=research');
    const seen = new Set<string>();
    for (const field of FIELDS) {
      await page.locator(`.tabs2 [data-tab="${field}"]`).click();
      await expect(page.locator(`.tabs2 [data-tab="${field}"]`)).toHaveClass(/on/);
      await expect(page.locator('#techLabels span')).toHaveCount(8);
      for (const name of await page.locator('#techLabels span').allTextContents()) seen.add(name);
    }
    expect(seen.size).toBe(64);
    await expectCleanLayout(page);
  });

  test('the tree marks nodes done, running, open and locked, and a node click selects it', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await expect(tech(page, 'nuclear-thermal')).toHaveClass(/done/);
    await expect(tech(page, 'ion-drive')).toHaveClass(/running/);
    await expect(tech(page, 'fusion-torch')).toHaveClass(/open/);
    await expect(tech(page, 'plasma-drive')).toHaveClass(/locked/);
    await tech(page, 'plasma-drive').click();
    await expect(panel(page, 'Plasma drive')).toContainText('Locked, missing Ion drive, Fusion torch');
    await expect(page.locator('#techLabels .sel')).toHaveText('Plasma drive');
  });

  test('the query selects a field and a project in it', async ({ page }) => {
    await open(page, 'screen=research&field=sensors');
    await expect(page.locator('.tabs2 [data-tab="sensors"]')).toHaveClass(/on/);
    await expect(tech(page, 'phased-radar')).toBeVisible();
    await expect(panel(page, 'Deep-space sensors')).toBeVisible();
  });

  test('starting an open project takes labs, shows as running and moves the labs chip', async ({ page }) => {
    await open(page, 'screen=research');
    await expect(labsChip(page)).toHaveText('4/5');
    await tech(page, 'fusion-torch').click();
    await expect(panel(page, 'Fusion torch').locator('#projectStart')).toBeVisible();
    await panel(page, 'Fusion torch').locator('#projectStart').click();
    await expect(tech(page, 'fusion-torch')).toHaveClass(/running/);
    await expect(row(page, 'Running', 'Fusion torch')).toContainText('Okafor');
    await expect(labsChip(page)).toHaveText('5/5');
    await expect(page.locator('#labsLine')).toHaveText('5 of 5 labs busy');
    await expect(row(page, 'Scientists', 'Okafor')).toContainText('3 of 3');
    await tech(page, 'laser-sail').click();
    await expect(page.locator('#projectBlocked')).toHaveText('No free labs');
    await expectCleanLayout(page);
  });

  test('the lead and the number of labs for a new project come from the lists', async ({ page }) => {
    await open(page, 'screen=research');
    await row(page, 'Open projects', 'Cold sleep').click();
    await expect(page.locator('.tabs2 [data-tab="biology"]')).toHaveClass(/on/);
    await expect(panel(page, 'Cold sleep')).toBeVisible();
    await row(page, 'Scientists', 'Rahman').click();
    await expect(page.locator('#projectLead')).toHaveValue('rahman');
    await expect(page.locator('#projectLabs option')).toHaveCount(1);
    await page.locator('#projectLead').selectOption('tanaka');
    await expect(row(page, 'Scientists', 'Tanaka')).toHaveClass(/on/);
    await expect(page.locator('#projectLabs option')).toHaveCount(1);
    await page.locator('#projectStart').click();
    await expect(row(page, 'Running', 'Cold sleep')).toContainText('Tanaka');
    await expect(labsChip(page)).toHaveText('5/5');
    await expectCleanLayout(page);
  });

  test('labs move between projects within what is free and what the lead can run', async ({ page }) => {
    await open(page, 'screen=research');
    await row(page, 'Running', 'Ion drive').click();
    await expect(panel(page, 'Ion drive').locator('#labsUp')).toBeEnabled();
    await panel(page, 'Ion drive').locator('#labsUp').click();
    await expect(labsChip(page)).toHaveText('5/5');
    await expect(panel(page, 'Ion drive').locator('#labsUp')).toBeDisabled();
    await panel(page, 'Ion drive').locator('#labsDown').click();
    await panel(page, 'Ion drive').locator('#labsDown').click();
    await expect(labsChip(page)).toHaveText('3/5');
    await expect(row(page, 'Scientists', 'Okafor')).toContainText('1 of 3');
    await expectCleanLayout(page);
  });

  test('a cancelled project frees its labs and keeps its progress for later', async ({ page }) => {
    await open(page, 'screen=research');
    await row(page, 'Running', 'Ion drive').click();
    await panel(page, 'Ion drive').locator('#projectCancel').click();
    await expect(tech(page, 'ion-drive')).toHaveClass(/open/);
    await expect(rows(page, 'Running')).toHaveCount(3);
    await expect(labsChip(page)).toHaveText('2/5');
    await expect(tech(page, 'ion-drive')).toHaveAttribute('title', 'Ion drive, 64%');
    await panel(page, 'Ion drive').locator('#projectStart').click();
    await expect(tech(page, 'ion-drive')).toHaveClass(/running/);
    await expect(tech(page, 'ion-drive')).toHaveAttribute('title', 'Ion drive, 64%');
  });

  test('running projects finish with the clock, open dependants, free labs and write an event', async ({
    page
  }) => {
    await open(page, 'screen=research');
    await advance(page, 30 * DAY, 6);
    await expect(tech(page, 'ion-drive')).toHaveClass(/done/);
    await expect(tech(page, 'plasma-drive')).toHaveClass(/locked/);
    await expect(rows(page, 'Running')).toHaveCount(2);
    await expect(labsChip(page)).toHaveText('1/5');
    await page.locator('.tabs2 [data-tab="sensors"]').click();
    await expect(tech(page, 'deep-space-sensors')).toHaveClass(/done/);
    await expect(tech(page, 'wide-array')).toHaveClass(/locked/);
    const events = await eventTexts(page);
    expect(events.some((e) => e.includes('Ion drive finished under Okafor.'))).toBe(true);
    expect(events.some((e) => e.includes('Deep-space sensors finished under Tanaka.'))).toBe(true);
  });

  test('finishing the last missing prerequisite opens a locked project', async ({ page }) => {
    await open(page, 'screen=research');
    for (const name of ['Ion drive', 'Composite armour']) {
      await row(page, 'Running', name).click();
      await panel(page, name).locator('#projectCancel').click();
    }
    await expect(labsChip(page)).toHaveText('1/5');
    await page.locator('.tabs2 [data-tab="sensors"]').click();
    await expect(tech(page, 'wide-array')).toHaveClass(/locked/);
    await tech(page, 'phased-radar').click();
    await page.locator('#projectLead').selectOption('tanaka');
    await page.locator('#projectLabs').selectOption('3');
    await page.locator('#projectStart').click();
    await expect(labsChip(page)).toHaveText('4/5');
    await advance(page, 30 * DAY, 3);
    await expect(tech(page, 'deep-space-sensors')).toHaveClass(/done/);
    await expect(tech(page, 'phased-radar')).toHaveClass(/running/);
    await expect(tech(page, 'wide-array')).toHaveClass(/locked/);
    await advance(page, 30 * DAY, 3);
    await expect(tech(page, 'phased-radar')).toHaveClass(/done/);
    await expect(tech(page, 'wide-array')).toHaveClass(/open/);
    await expect(labsChip(page)).toHaveText('0/5');
    const events = await eventTexts(page);
    expect(events.some((e) => e.includes('Phased radar finished under Tanaka. Now open: Wide array.'))).toBe(
      true
    );
  });

  test('research state survives switching screens', async ({ page }) => {
    await open(page, 'screen=research');
    await tech(page, 'fusion-torch').click();
    await panel(page, 'Fusion torch').locator('#projectStart').click();
    await page.locator('.tabs2 [data-tab="power"]').click();
    await page.locator('[data-nav="economy"]').click();
    await expect(page.locator('#stage > [data-screen="research"]')).toHaveCount(0);
    await page.locator('[data-nav="research"]').click();
    await expect(page.locator('.tabs2 [data-tab="power"]')).toHaveClass(/on/);
    await expect(row(page, 'Running', 'Fusion torch')).toBeVisible();
    await expect(labsChip(page)).toHaveText('5/5');
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
