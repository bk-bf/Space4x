import { defineConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const FREE_PORTS_SCRIPT =
  "const net=require('net');const a=net.createServer(),b=net.createServer();a.listen(0,'127.0.0.1',()=>b.listen(0,'127.0.0.1',()=>{process.stdout.write(a.address().port+','+b.address().port);a.close();b.close()}))";

const [freeGame, freeGallery] = execFileSync(process.execPath, ['-e', FREE_PORTS_SCRIPT], {
  encoding: 'utf8'
})
  .split(',')
  .map(Number);

process.env.PORT ??= String(freeGame);
process.env.GALLERY_PORT ??= String(process.env.PORT === String(freeGallery) ? freeGame : freeGallery);
const GAME_PORT = Number(process.env.PORT);
const GALLERY_PORT = Number(process.env.GALLERY_PORT);
const [WIDTH, HEIGHT] = (process.env.SIZE ?? '1440,900').split(',').map(Number);

const server = (port: number, gallery: boolean) => ({
  command: `pnpm exec vite dev --host 127.0.0.1 --port ${port} --strictPort`,
  url: `http://127.0.0.1:${port}/`,
  env: { VITE_SPACE4X_GALLERY: gallery ? '1' : '' },
  reuseExistingServer: false,
  timeout: 120_000
});

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  reporter: 'list',
  fullyParallel: true,
  use: {
    browserName: 'chromium',
    viewport: { width: WIDTH || 1440, height: HEIGHT || 900 },
    deviceScaleFactor: 1
  },
  projects: [
    {
      name: 'game',
      testMatch: ['layout.spec.ts', 'game.spec.ts', 'belt.spec.ts', 'save.spec.ts'],
      use: { baseURL: `http://127.0.0.1:${GAME_PORT}` }
    },
    {
      name: 'gallery',
      testIgnore: ['game.spec.ts', 'belt.spec.ts', 'save.spec.ts'],
      use: { baseURL: `http://127.0.0.1:${GALLERY_PORT}` }
    }
  ],
  webServer: [server(GAME_PORT, false), server(GALLERY_PORT, true)]
});
