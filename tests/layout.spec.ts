import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATES } from './states';

const SHOTS = process.env.SHOTS;

for (const state of STATES) {
  const run = state.built ? test : test.fixme;
  run(`layout ${state.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?check&${state.query}`);
    const report = page.locator('#check');
    await expect(report).toBeAttached({ timeout: 20_000 });
    const text = (await report.textContent()) ?? '';
    if (SHOTS) {
      mkdirSync(SHOTS, { recursive: true });
      await report.evaluate((el) => el.remove());
      await page.screenshot({ path: join(SHOTS, `${state.name}.png`) });
    }
    expect(errors, 'page errors').toEqual([]);
    expect(text.split('\n'), `layout check for ?${state.query}`).toEqual(['PASS layout']);
  });
}
