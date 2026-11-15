import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BENCH = process.env.SPACE4X_BENCH;
const SHOTS = process.env.SHOTS;
const FRAMES = Number(process.env.SPACE4X_BENCH_FRAMES) || 90;

const VIEWS: readonly (readonly [string, string])[] = [
  ['system', 'system'],
  ['inner', 'inner'],
  ['sun', 'star'],
  ['earth', 'earth'],
  ['fleet-earth-orbit', 'convoy'],
  ['station-over-earth', 'convoy:3000'],
  ['jupiter', 'jupiter'],
  ['site-sol-station', 'sol-station'],
  ['site-deep-well', 'deep-well'],
  ['site-battle', 'battle'],
  ['site-boarding', 'boarding'],
  ['site-salvage', 'salvage'],
  ['site-gate', 'gate'],
  ['swarm-400-mid', 'convoy:30&swarm=400'],
  ['swarm-400-near', 'convoy:8&swarm=400'],
  ['swarm-400-far', 'convoy:3000&swarm=400']
];

test.describe('map bench', () => {
  test.skip(!BENCH, 'set SPACE4X_BENCH=1 to measure the map');
  for (const [name, zoom] of VIEWS)
    test(`bench ${name}`, async ({ page }) => {
      const rows: string[] = [];
      for (const mode of ['', '&nc', '&move']) {
        await page.goto(`/?zoom=${zoom}&bench=${FRAMES}${mode}`);
        await expect(page).toHaveTitle(/^BENCH/, { timeout: 120_000 });
        rows.push(await page.title());
      }
      if (SHOTS) {
        mkdirSync(SHOTS, { recursive: true });
        await page.goto(`/?zoom=${zoom}`);
        await page.waitForTimeout(1500);
        await page.screenshot({ path: join(SHOTS, `map-${name}.png`) });
      }
      console.log(`${name}: ${rows.join(' | ')}`);
    });
});
