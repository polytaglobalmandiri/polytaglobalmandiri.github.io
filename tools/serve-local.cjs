const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PGM_LOCAL_PORT || 8765);
const types = {
  '.css': 'text/css', '.html': 'text/html', '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2'
};

http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400).end('Bad request'); return; }
  const target = path.resolve(root, '.' + pathname);
  if (target !== root && !target.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden'); return;
  }
  let file = target;
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); }
  catch { response.writeHead(404).end('Not found'); return; }
  const stream = fs.createReadStream(file);
  stream.on('error', () => { if (!response.headersSent) response.writeHead(404); response.end('Not found'); });
  stream.on('open', () => {
    response.writeHead(200, { 'Content-Type': `${types[path.extname(file).toLowerCase()] || 'application/octet-stream'}; charset=utf-8` });
    if (request.method === 'HEAD') response.end();
    else stream.pipe(response);
  });
}).listen(port, '127.0.0.1', () => console.log(`Portal lokal: http://127.0.0.1:${port}/`));
