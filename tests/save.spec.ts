import { expect, test, type Page } from '@playwright/test';

const MONTH = '[data-step="2592000"]';

async function boot(page: Page, url = '/') {
  if (url) await page.goto(url);
  await expect(page.locator('#top[data-ready="true"]')).toBeAttached({ timeout: 20_000 });
}

async function reload(page: Page) {
  await page.reload();
  await boot(page, '');
}

const clock = (page: Page) => page.locator('#clock').innerText();

async function menu(page: Page, item: string) {
  if (!(await page.locator('#menu').isVisible())) await page.locator('#bSet').click();
  await page.locator(`#${item}`).click();
}

test('Escape opens the menu paused and Resume runs the game again', async ({ page }) => {
  await boot(page);
  await page.locator('#bPlay').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeVisible();
  await expect(page.locator('#bPause')).toHaveClass(/on/);
  await expect(page.locator('#menuLoad')).toBeDisabled();
  await page.locator('#menuResume').click();
  await expect(page.locator('#menu')).toHaveCount(0);
  await expect(page.locator('#bPlay')).toHaveClass(/on/);
  await page.locator('#bSet').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toHaveCount(0);
});

test('a game survives a reload, keeps manual saves and starts again on New game', async ({ page }) => {
  test.setTimeout(90_000);
  await boot(page);
  const start = await clock(page);

  await page.locator(MONTH).click();
  await expect(page.locator('#clock')).not.toHaveText(start);
  const month = await clock(page);
  await page.locator('[data-nav="classes"]').click();
  await page.locator('[data-act="new"]').click();
  await expect(page.locator('#classList button')).toHaveCount(1);

  await reload(page);
  await expect(page.locator('#clock')).toHaveText(month);
  await expect(page.locator('[data-nav="classes"]')).toHaveClass(/on/);
  await expect(page.locator('#classList button')).toHaveCount(1);

  await menu(page, 'menuLoad');
  await expect(page.locator('#saves .save-row')).toHaveCount(1);
  await expect(page.locator('#saves .save-row[data-kind="auto"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('#saves')).toHaveCount(0);

  await menu(page, 'menuSave');
  await page.locator('#newSave').click();
  await expect(page.locator('#saves')).toHaveCount(0);
  await expect(page.locator('#menuSave')).toHaveText('Saved');
  await page.locator('#menuResume').click();

  await page.locator(MONTH).click();
  await expect(page.locator('#clock')).not.toHaveText(month);

  page.once('dialog', (d) => void d.accept());
  await menu(page, 'menuNew');
  await expect(page.locator('#menu')).toHaveCount(0);
  await expect(page.locator('#clock')).toHaveText(start);
  await expect(page.locator('#classList button')).toHaveCount(0);

  await reload(page);
  await expect(page.locator('#clock')).toHaveText(start);
  await menu(page, 'menuLoad');
  await expect(page.locator('#saves .save-row')).toHaveCount(3);
  await page.locator('#saves .save-row[data-kind="manual"] .main').click();
  await expect(page.locator('#saves')).toHaveCount(0);
  await expect(page.locator('#menu')).toHaveCount(0);
  await expect(page.locator('#clock')).toHaveText(month);
  await expect(page.locator('#classList button')).toHaveCount(1);

  await menu(page, 'menuLoad');
  await page.locator('#saves .save-row[data-kind="manual"] .del').click();
  await page.locator('#saves .save-row[data-kind="manual"] [aria-label="Yes"]').click();
  await expect(page.locator('#saves .save-row[data-kind="manual"]')).toHaveCount(0);
  await expect(page.locator('#saves .save-row')).toHaveCount(2);
});

test('autosave can be switched off and then writes nothing', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await boot(page);
  await menu(page, 'menuAutosave');
  await expect(page.locator('#menuAutosave')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('#menuResume').click();
  await page.locator(MONTH).click();
  await reload(page);
  await expect(page.locator('#clock')).toHaveText('15 Nov 2026 06:00');
  await page.locator('#bSet').click();
  await expect(page.locator('#menuAutosave')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#menuLoad')).toBeDisabled();
});

test('a save of another version is dropped with an event instead of loading', async ({ page }) => {
  await boot(page);
  const start = await clock(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('space4x', 1);
        open.onsuccess = () => {
          const tx = open.result.transaction('saves', 'readwrite');
          const store = tx.objectStore('saves');
          store.put({ version: 0, game: { time: 0, step: 1 } }, 'save:old');
          store.put(
            { version: 0, time: 0, milestones: 0, sites: 1, ships: 0, savedAt: Date.now(), kind: 'auto' },
            'meta:old'
          );
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        };
        open.onerror = () => reject(open.error);
      })
  );
  await reload(page);
  await expect(page.locator('#clock')).toHaveText(start);
  await expect(page.locator('#events .ev.w', { hasText: 'was dropped because it is version 0' })).toHaveCount(
    1
  );
  await page.locator('#bSet').click();
  await expect(page.locator('#menuLoad')).toBeDisabled();
});

test('a test link neither loads nor writes the save', async ({ page }) => {
  await boot(page);
  await page.locator(MONTH).click();
  await reload(page);
  const month = await clock(page);
  await boot(page, '/?check');
  await expect(page.locator('#clock')).not.toHaveText(month);
  await page.locator(MONTH).click();
  await page.locator(MONTH).click();
  await boot(page, '/');
  await expect(page.locator('#clock')).toHaveText(month);
});

test('a scripted game at milestone 6 is saved and loaded exactly, and opens again after a reload', async ({
  page
}) => {
  test.setTimeout(180_000);
  await boot(page, '/?test');
  const reached = await page.evaluate(() => {
    const t = window.space4xTest!;
    t.play(4);
    t.crewedStation();
    t.play(6);
    return t.state();
  });
  expect(reached.done).toContain(6);
  const saved = await page.evaluate(() => window.space4xTest!.snapshot());
  const time = await clock(page);

  await menu(page, 'menuSave');
  await page.locator('#newSave').click();
  await expect(page.locator('#saves')).toHaveCount(0);
  await page.locator('#menuResume').click();

  await reload(page);
  await expect(page.locator('#clock')).not.toHaveText(time);
  await menu(page, 'menuLoad');
  await page.locator('#saves .save-row[data-kind="manual"] .main').click();
  await expect(page.locator('#clock')).toHaveText(time);
  expect(await page.evaluate(() => window.space4xTest!.snapshot())).toBe(saved);

  await boot(page, '/');
  await expect(page.locator('#clock')).toHaveText(time);
});

test('autosave runs on its timer and the latest autosave opens after a reload', async ({ page }) => {
  await boot(page);
  const start = await clock(page);
  await page.locator('[data-step="86400"]').click();
  await page.locator('#bPlay').click();
  await expect(page.locator('#clock')).not.toHaveText(start);
  await page.waitForTimeout(2500);
  await menu(page, 'menuLoad');
  const row = page.locator('#saves .save-row[data-kind="auto"]');
  await expect(row).toHaveCount(1);
  await expect(row.locator('.when-game')).not.toHaveText(start.slice(0, 11));
  await page.keyboard.press('Escape');
  await page.locator('#menuResume').click();
  await page.locator('#bPause').click();
  const paused = await clock(page);

  await reload(page);
  await expect(page.locator('#clock')).toHaveText(paused);
  await menu(page, 'menuLoad');
  await expect(page.locator('#saves .save-row').first()).toHaveAttribute('data-kind', 'auto');
});

test('the page warns before closing with progress autosave will not keep', async ({ page }) => {
  await boot(page);
  const asked: string[] = [];
  page.on('dialog', (d) => {
    asked.push(d.type());
    void d.dismiss();
  });
  await menu(page, 'menuAutosave');
  await page.locator('#menuResume').click();
  await page.locator(MONTH).click();
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => asked).toEqual(['beforeunload']);
});

test('the page closes without a warning when autosave keeps the progress', async ({ page }) => {
  await boot(page);
  const asked: string[] = [];
  page.on('dialog', (d) => {
    asked.push(d.type());
    void d.dismiss();
  });
  await page.locator(MONTH).click();
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => page.isClosed()).toBe(true);
  expect(asked).toEqual([]);
});
