#!/usr/bin/env node
/*
 * Máy chủ tĩnh cục bộ — KHÔNG cần cài thêm gói nào.
 *   node serve.js                 → http://localhost:8080
 *   PORT=3000 node serve.js       → đổi cổng
 *   HOST=0.0.0.0 node serve.js    → cho điện thoại cùng Wi-Fi truy cập thử
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8'
};

// Không phục vụ file nội bộ của dự án
const BLOCKED = /^(\/node_modules\/|\/\.git|\/package(-lock)?\.json$|\/serve\.js$|\/tools\/)/;

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400).end('Yêu cầu không hợp lệ');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.join(ROOT, path.normalize(pathname));

  // Chặn thoát khỏi thư mục gốc (../)
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('Không được phép');
    return;
  }
  if (BLOCKED.test(pathname)) {
    res.writeHead(404).end('Không tìm thấy');
    return;
  }

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Không tìm thấy: ' + pathname);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Website Tổ Toán đang chạy: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
