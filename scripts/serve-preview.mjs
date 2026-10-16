import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import permitRoute from '../api/permit-route.mjs';
const root = resolve(process.argv[2] || 'src'), port = Number(process.env.PORT || 4318);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
createServer(async (req, res) => {
  try {
    if (new URL(req.url, 'http://localhost').pathname === '/api/permit-route') return await permitRoute(req, res);
    let path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); if (path === '/') path = '/index.html';
    if (!extname(path)) path += '.html'; const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) || !(await stat(file)).isFile()) throw Error('Not found');
    const body = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'Permissions-Policy': 'camera=(self), geolocation=(self), microphone=()' }); res.end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Local Drivers Lounge preview: http://127.0.0.1:${port}/permitted-loads`));
