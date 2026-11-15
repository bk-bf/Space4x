import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { STATES } from './states';

const SHOTS = process.env.SHOTS;

for (const state of STATES) {
  const run = state.built ? test : test.fixme;
  run(`layout ${state.name}`, async ({ page }, info) => {
    const mode = info.project.name;
    test.skip(mode === 'game' && state.mock, 'the game build has no mock screens or scenes');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`/?check&${state.query}`);
    const report = page.locator('#check');
    await expect(report).toBeAttached({ timeout: 20_000 });
    const text = (await report.textContent()) ?? '';
    if (SHOTS) {
      mkdirSync(join(SHOTS, mode), { recursive: true });
      await report.evaluate((el) => el.remove());
      await page.screenshot({ path: join(SHOTS, mode, `${state.name}.png`) });
    }
    expect(errors, 'page errors').toEqual([]);
    expect(text.split('\n'), `layout check for ?${state.query}`).toEqual(['PASS layout']);
  });
}
