import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const base = '/mtg_lifecounter_pwa/';
const root = resolve('dist-subpath');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(base)) { response.writeHead(404).end(); return; }
    const file = resolve(root, pathname.slice(base.length) || 'index.html');
    if (!file.startsWith(`${root}/`)) { response.writeHead(403).end(); return; }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    response.end(content);
  } catch { response.writeHead(404).end(); }
}).listen(4174, '127.0.0.1');