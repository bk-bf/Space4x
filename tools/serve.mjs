#!/usr/bin/env node
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const option = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : fallback;
};

const dir = resolve(option('dir', 'build'));
const host = option('host', '127.0.0.1');
const port = Number(option('port', '8800'));

const fileAt = (path) => {
  try {
    return statSync(path).isFile() ? path : null;
  } catch {
    return null;
  }
};

const resolveRequest = (pathname) => {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.split('/').some((part) => part.startsWith('.') && part !== '')) return null;
  const target = resolve(dir, `.${decoded}`);
  if (target !== dir && !target.startsWith(dir + sep)) return null;
  const exact = fileAt(target) ?? fileAt(resolve(target, 'index.html'));
  if (exact) return exact;
  return extname(decoded) === '' ? fileAt(resolve(dir, 'index.html')) : null;
};

createServer((req, res) => {
  const file =
    req.method === 'GET' || req.method === 'HEAD'
      ? resolveRequest(new URL(req.url, 'http://x').pathname)
      : null;
  if (!file) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file)] ?? 'application/octet-stream',
    'cache-control': file.includes(`${sep}_app${sep}immutable${sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache'
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(file).pipe(res);
}).listen(port, host, () => process.stdout.write(`serving ${dir} on http://${host}:${port}/\n`));
