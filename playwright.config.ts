import { defineConfig } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const FREE_PORT_SCRIPT =
  "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{process.stdout.write(String(s.address().port));s.close()})";

if (!process.env.PORT)
  process.env.PORT = execFileSync(process.execPath, ['-e', FREE_PORT_SCRIPT], { encoding: 'utf8' });

const PORT = Number(process.env.PORT);
const [WIDTH, HEIGHT] = (process.env.SIZE ?? '1440,900').split(',').map(Number);

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  reporter: 'list',
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    browserName: 'chromium',
    viewport: { width: WIDTH || 1440, height: HEIGHT || 900 },
    deviceScaleFactor: 1
  },
  webServer: {
    command: `pnpm exec vite dev --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
