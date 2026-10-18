/* OmaBerry Desktop Server (Zero-Dependency Node.js 22 Server)
 * - Static HTTP File Server for /web
 * - Zero-Dependency RFC 6455 WebSocket Server
 * - Integrated PTY Shell Bridge, Safe FS API, and Telemetry
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PtyBridge = require('./pty-bridge');
const fsApi = require('./fs-api');
const sysApi = require('./sys-api');

const PORT = parseInt(process.env.OMABERRY_PORT || '9820', 10);
// Loopback by default. The browser and this server live on the same device,
// so there is no reason to hand a shell and a filesystem to the rest of the
// LAN. Set OMABERRY_HOST=0.0.0.0 only behind an SSH tunnel or a firewall.
const HOST = process.env.OMABERRY_HOST || '127.0.0.1';
const WEB_DIR = path.resolve(__dirname, '../web');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8'
};

/* ── HTTP Static File Handler ─────────────────────────────────── */
function handleHttpRequest(req, res) {
  let reqUrl = req.url.split('?')[0];
  if (reqUrl === '/' || reqUrl === '') reqUrl = '/index.html';

  const safePath = path.normalize(reqUrl).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(WEB_DIR, safePath);

  if (!filePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

/* ── Lightweight RFC 6455 WebSocket Implementation ───────────── */
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class SimpleWebSocket {
  constructor(socket) {
    this.socket = socket;
    this.readyState = 1; // OPEN
    this.buffer = Buffer.alloc(0);
    this.onmessage = null;
    this.onclose = null;

    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('close', () => this.handleClose());
    this.socket.on('error', () => this.handleClose());
  }

  send(data) {
    if (this.readyState !== 1) return;
    const payload = Buffer.from(data, 'utf8');
    const len = payload.length;
    let header;

    if (len <= 125) {
      header = Buffer.from([0x81, len]);
    } else if (len <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x81;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x81;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }

    this.socket.write(Buffer.concat([header, payload]));
  }

  handleData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (this.buffer.length >= 2) {
      const byte0 = this.buffer[0];
      const byte1 = this.buffer[1];
      const opcode = byte0 & 0x0f;
      const isMasked = (byte1 & 0x80) !== 0;
      let payloadLen = byte1 & 0x7f;
      let offset = 2;

      // Handle close frame (opcode 8)
      if (opcode === 8) {
        this.socket.end();
        this.handleClose();
        return;
      }

      if (payloadLen === 126) {
        if (this.buffer.length < 4) return;
        payloadLen = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (payloadLen === 127) {
        if (this.buffer.length < 10) return;
        payloadLen = Number(this.buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLength = isMasked ? 4 : 0;
      const totalFrameLen = offset + maskLength + payloadLen;

      if (this.buffer.length < totalFrameLen) {
        return; // Wait for full frame
      }

      let payload = this.buffer.slice(offset + maskLength, totalFrameLen);

      if (isMasked) {
        const mask = this.buffer.slice(offset, offset + 4);
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      this.buffer = this.buffer.slice(totalFrameLen);

      // Text frame (opcode 1)
      if (opcode === 1 && this.onmessage) {
        this.onmessage(payload.toString('utf8'));
      }
    }
  }

  handleClose() {
    if (this.readyState !== 3) {
      this.readyState = 3; // CLOSED
      if (this.onclose) this.onclose();
    }
  }
}

/* ── Server Init & WebSocket Upgrade Hook ─────────────────────── */
const server = http.createServer(handleHttpRequest);

/* A page served from anywhere on the LAN could otherwise open
 * ws://127.0.0.1:9820 and get the PTY. Only same-origin callers pass. */
function originAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;            // non-browser client
  try {
    const u = new URL(origin);
    const host = (req.headers.host || '').split(':')[0];
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === host;
  } catch (e) {
    return false;
  }
}

server.on('upgrade', (req, socket, head) => {
  if (!originAllowed(req)) {
    socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  if (req.headers['upgrade'] && req.headers['upgrade'].toLowerCase() === 'websocket') {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
    const responseHeaders = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n'
    ];

    socket.write(responseHeaders.join('\r\n'));

    const ws = new SimpleWebSocket(socket);
    handleWsConnection(ws);
  } else {
    socket.destroy();
  }
});

/* ── WebSocket Client Connection Handler ──────────────────────── */
function handleWsConnection(ws) {
  console.log('[OmaBerry] Client connected to shell session');

  const ptyBridge = new PtyBridge(ws);

  // Periodic telemetry interval
  const sysTimer = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(sysApi.getMetrics()));
    }
  }, 4000);

  ws.onmessage = function (data) {
    try {
      const msg = JSON.parse(data);
      switch (msg.type) {
        case 'pty:write':
          ptyBridge.write(msg.data);
          break;

        case 'fs:list':
          fsApi.handleList(ws, msg.path);
          break;

        case 'fs:read':
          fsApi.handleRead(ws, msg.path);
          break;

        case 'fs:write':
          fsApi.handleWrite(ws, msg.path, msg.content);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;
      }
    } catch (e) {
      console.error('[OmaBerry] WS Message error:', e);
    }
  };

  ws.onclose = function () {
    console.log('[OmaBerry] Client disconnected');
    clearInterval(sysTimer);
    ptyBridge.destroy();
  };
}

/* ── Listen ───────────────────────────────────────────────────── */
server.listen(PORT, HOST, () => {
  console.log(`===============================================`);
  console.log(` OmaBerry Server running for BlackBerry Q20    `);
  console.log(` Listening at: http://${HOST}:${PORT}         `);
  console.log(` Root Web Dir: ${WEB_DIR}                      `);
  console.log(`===============================================`);
});
