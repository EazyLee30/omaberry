#!/usr/bin/env node
/* OmaBerry desktop simulator for macOS.
 *
 * Runs the *real* web/ directory against a macOS host so the desktop can be
 * seen and driven without a Q20 in hand. Nothing in server/ is touched and
 * nothing in web/ is conditional on the platform: the shell, the filesystem
 * and the telemetry are all supplied here instead.
 *
 * What is real and what is faked:
 *   real   web/ (every byte), the shell you are running, your keystrokes,
 *          the WebSocket protocol, the pinyin IME, the trackpad accumulator
 *   faked  the device itself -- no QNX, no Krait, no 720x720 panel
 *
 * Two shims exist because web/ is written for the phone:
 *   - web/ asks for /accounts/1000/shared, which does not exist here. It is
 *     mapped onto a sandbox directory so the file manager cannot wander
 *     around the real filesystem.
 *   - server/sys-api.js reports the Q20's fixed 2 cores. On a Mac those
 *     numbers would be a lie told to a System Monitor widget, so real
 *     os.loadavg() is used instead.
 *
 * Usage:
 *   node sim/server.js                 # then open http://127.0.0.1:9821
 *   node sim/server.js --port 9000
 *   node sim/server.js --sandbox ~/some/dir
 */

'use strict';

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const WEB_DIR = path.resolve(__dirname, '../web');

/* The phone's shared partition, as the web code spells it. */
const DEVICE_ROOT = '/accounts/1000/shared';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon'
};

/* ── arguments ──────────────────────────────────────────────────── */

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const PORT = parseInt(arg('port', '9821'), 10);
const SANDBOX = path.resolve(arg('sandbox', path.join(os.homedir(), '.omaberry-sim')));

/* ── sandbox ────────────────────────────────────────────────────── */

function ensureSandbox() {
  fs.mkdirSync(SANDBOX, { recursive: true });
  const readme = path.join(SANDBOX, 'README.txt');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(readme,
      'OmaBerry simulator sandbox\n' +
      '===========================\n\n' +
      'This directory stands in for /accounts/1000/shared on the Q20.\n' +
      'Everything the Files workspace shows lives here, and nothing outside\n' +
      'it is reachable: paths from the web layer are mapped onto this folder\n' +
      'before they touch the disk.\n\n' +
      'Try:\n' +
      '  ls -la\n' +
      '  cat README.txt\n' +
      '  echo hello > note.txt\n');
  }
  const docs = path.join(SANDBOX, 'notes');
  fs.mkdirSync(docs, { recursive: true });
  const todo = path.join(docs, 'todo.txt');
  if (!fs.existsSync(todo)) {
    fs.writeFileSync(todo, '- 复刻 Omarchy 桌面\n- 中文输入法\n- 触控板手势\n');
  }
  return SANDBOX;
}

/* Map a device path onto the sandbox, refusing anything that escapes it. */
function resolveDevicePath(devicePath) {
  let rel = String(devicePath || DEVICE_ROOT);
  if (rel === DEVICE_ROOT || rel === DEVICE_ROOT + '/') rel = '';
  else if (rel.startsWith(DEVICE_ROOT + '/')) rel = rel.slice(DEVICE_ROOT.length + 1);
  else rel = rel.replace(/^\/+/, '');       // bare paths are relative to the root
  const full = path.resolve(SANDBOX, rel);
  if (full !== SANDBOX && !full.startsWith(SANDBOX + path.sep)) return null;
  return full;
}

/* ── telemetry ──────────────────────────────────────────────────── */

function metrics() {
  const total = os.totalmem();
  const free = os.freemem();
  const cores = os.cpus() ? os.cpus().length : 2;
  const load = os.loadavg ? os.loadavg()[0] : 0;
  return {
    type: 'sysinfo',
    cpu: Math.min(100, Math.round((load / cores) * 100)),
    memUsedMb: Math.round((total - free) / 1048576),
    memFreeMb: Math.round(free / 1048576),
    memTotalMb: Math.round(total / 1048576),
    uptimeSec: Math.round(os.uptime()),
    platform: 'darwin-sim',
    arch: process.arch
  };
}

/* ── websocket ──────────────────────────────────────────────────── */
/* Enough of RFC 6455 to talk to our own client on loopback: text frames in,
   text frames out, close and ping. No extensions, no fragmentation. */

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

class Ws {
  constructor(socket) {
    this.socket = socket;
    this.buffer = Buffer.alloc(0);
    this.onmessage = null;
    this.onclose = null;

    socket.on('data', (chunk) => this._feed(chunk));
    socket.on('close', () => this.onclose && this.onclose());
    socket.on('error', () => this.onclose && this.onclose());
  }

  _feed(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      if (this.buffer.length < 2) return;
      const b0 = this.buffer[0];
      const b1 = this.buffer[1];
      const opcode = b0 & 0x0f;
      let len = b1 & 0x7f;
      let off = 2;

      if (len === 126) {
        if (this.buffer.length < 4) return;
        len = this.buffer.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this.buffer.length < 10) return;
        len = Number(this.buffer.readBigUInt64BE(2));
        off = 10;
      }

      // Client frames are always masked.
      let mask = null;
      if (b1 & 0x80) {
        if (this.buffer.length < off + 4) return;
        mask = this.buffer.slice(off, off + 4);
        off += 4;
      }
      if (this.buffer.length < off + len) return;

      const payload = Buffer.from(this.buffer.slice(off, off + len));
      this.buffer = this.buffer.slice(off + len);
      if (mask) {
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }

      if (opcode === 0x8) { this.socket.end(); return; }       // close
      if (opcode === 0x9) { this._frame(0xA, payload); continue; } // ping -> pong
      if (opcode === 0x1 && this.onmessage) this.onmessage(payload.toString('utf8'));
    }
  }

  _frame(opcode, payload) {
    const len = payload.length;
    let header;
    if (len <= 125) {
      header = Buffer.from([0x80 | opcode, len]);
    } else if (len <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode;
      header[1] = 127;
      header.writeBigUInt64BE(BigBigInt(len), 2);
    }
    this.socket.write(Buffer.concat([header, payload]));
  }

  send(text) {
    if (this.socket.destroyed) return;
    this._frame(0x1, Buffer.from(text, 'utf8'));
  }
}

function BigBigInt(n) { return BigInt(n); }

/* ── session: one shell, shared by every browser tab ────────────── */

let shellProc = null;
const subscribers = new Set();

function broadcast(obj) {
  const text = JSON.stringify(obj);
  for (const ws of subscribers) ws.send(text);
}

function startShell() {
  const shell = process.env.SIM_SHELL || '/bin/zsh';
  shellProc = spawn(shell, ['-i'], {
    cwd: SANDBOX,
    env: Object.assign({}, process.env, {
      TERM: 'xterm-256color',
      // The IME writes UTF-8 down this pipe; without a UTF-8 locale the shell
      // hands the bytes to ls/cat as-is and mojibake follows.
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      OMABERRY_SIM: '1'
    }),
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const relay = (stream, chunk) => {
    broadcast({ type: 'pty:data', data: chunk.toString('utf8') });
    // Echo to the host terminal too, so running the sim is not silent.
    stream.write(chunk);
  };
  shellProc.stdout.on('data', (c) => relay(process.stdout, c));
  shellProc.stderr.on('data', (c) => relay(process.stderr, c));
  shellProc.on('exit', (code) => {
    broadcast({ type: 'pty:data', data: `\r\n[shell exited: ${code}]\r\n` });
    shellProc = null;
  });
}

/* ── fs api ─────────────────────────────────────────────────────── */

function fsList(ws, reqPath) {
  const dir = resolveDevicePath(reqPath);
  const reply = (payload) => ws.send(JSON.stringify(payload));
  if (!dir) return reply({ type: 'fs:list:res', path: reqPath, error: 'Path escapes the sandbox' });
  try {
    const names = fs.readdirSync(dir);
    const entries = names.map((name) => {
      let isDir = false;
      let size = 0;
      try {
        const st = fs.statSync(path.join(dir, name));
        isDir = st.isDirectory();
        size = st.size;
      } catch (e) { /* dangling symlink and friends */ }
      return { name, isDir, size };
    });
    reply({ type: 'fs:list:res', path: reqPath, entries });
  } catch (e) {
    reply({ type: 'fs:list:res', path: reqPath, error: e.message });
  }
}

function fsRead(ws, reqPath) {
  const file = resolveDevicePath(reqPath);
  const reply = (payload) => ws.send(JSON.stringify(payload));
  if (!file) return reply({ type: 'fs:read:res', path: reqPath, error: 'Invalid path' });
  try {
    const buf = fs.readFileSync(file);
    const truncated = buf.length > 64 * 1024;
    reply({
      type: 'fs:read:res',
      path: reqPath,
      content: buf.slice(0, 64 * 1024).toString('utf8'),
      truncated
    });
  } catch (e) {
    reply({ type: 'fs:read:res', path: reqPath, error: e.message });
  }
}

function fsWrite(ws, reqPath, content) {
  const file = resolveDevicePath(reqPath);
  const reply = (payload) => ws.send(JSON.stringify(payload));
  if (!file) return reply({ type: 'fs:write:res', error: 'Invalid path' });
  try {
    fs.writeFileSync(file, String(content == null ? '' : content), 'utf8');
    reply({ type: 'fs:write:res', path: reqPath, success: true });
  } catch (e) {
    reply({ type: 'fs:write:res', path: reqPath, success: false, error: e.message });
  }
}

/* ── http ───────────────────────────────────────────────────────── */

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/' || url === '') url = '/frame.html';

  // /raw drops the device bezel and serves the shell directly, which is what
  // you want when driving it from Safari's Responsive Design Mode instead.
  if (url === '/raw' || url === '/raw/') url = '/index.html';

  const rel = path.normalize(url).replace(/^(\.\.[/\\])+/, '');
  const file = rel.startsWith('/sim/') || rel === '/frame.html'
    ? path.join(__dirname, rel.replace(/^\//, ''))
    : path.join(WEB_DIR, rel);

  if (!file.startsWith(WEB_DIR) && !file.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
});

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const ws = new Ws(socket);
  subscribers.add(ws);

  ws.onmessage = (text) => {
    let msg;
    try { msg = JSON.parse(text); } catch (e) { return; }
    switch (msg.type) {
      case 'pty:write':
        if (shellProc) shellProc.stdin.write(msg.data);
        break;
      case 'fs:list': fsList(ws, msg.path); break;
      case 'fs:read': fsRead(ws, msg.path); break;
      case 'fs:write': fsWrite(ws, msg.path, msg.content); break;
      case 'ping': ws.send(JSON.stringify({ type: 'pong' })); break;
    }
  };

  ws.onclose = () => subscribers.delete(ws);
});

/* ── go ─────────────────────────────────────────────────────────── */

ensureSandbox();
startShell();

const sysTimer = setInterval(() => broadcast(metrics()), 4000);
sysTimer.unref();

server.listen(PORT, '127.0.0.1', () => {
  const line = '='.repeat(52);
  console.log(line);
  console.log(' OmaBerry desktop simulator (macOS)');
  console.log(line);
  console.log(` open      http://127.0.0.1:${PORT}        (device bezel)`);
  console.log(`           http://127.0.0.1:${PORT}/raw    (shell only)`);
  console.log(` panel     720 x 720`);
  console.log(` shell     ${process.env.SIM_SHELL || '/bin/zsh'}`);
  console.log(` sandbox   ${SANDBOX}`);
  console.log(line);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (shellProc) shellProc.kill();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 300).unref();
  });
}