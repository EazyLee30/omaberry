/* OmaBerry PTY / Shell Bridge
 * Spawns native QNX / BerryCore shell and bridges I/O to WebSocket
 */

'use strict';

const { spawn } = require('child_process');
const fs = require('fs');

class PtyBridge {
  constructor(ws) {
    this.ws = ws;
    this.shellProcess = null;
    this.initShell();
  }

  getAvailableShell() {
    // Priority order of shells on BlackBerry 10 / BerryCore
    const candidates = [
      '/accounts/1000/shared/misc/berrycore/bin/zsh',
      '/accounts/1000/shared/misc/berrycore/bin/bash',
      '/bin/ksh',
      '/bin/sh'
    ];

    for (const shellPath of candidates) {
      try {
        if (fs.existsSync(shellPath)) {
          return shellPath;
        }
      } catch (e) {}
    }
    return '/bin/sh';
  }

  initShell() {
    const shell = this.getAvailableShell();
    const env = Object.assign({}, process.env, {
      TERM: 'xterm-256color',
      HOME: process.env.HOME || '/accounts/1000/shared',
      PATH: process.env.PATH || '/accounts/1000/shared/misc/berrycore/bin:/bin:/usr/bin:/usr/sbin',
      BERRYCORE_QUIET: '1',
      // The IME in web/js/meta.js writes composed Chinese as UTF-8 down this
      // PTY. Without a UTF-8 locale the shell treats the bytes as binary and
      // tools like ls or cat mangle them back to mojibake.
      LANG: process.env.LANG || 'en_US.UTF-8',
      LC_ALL: process.env.LC_ALL || 'en_US.UTF-8'
    });

    try {
      this.shellProcess = spawn(shell, ['-i'], {
        env,
        cwd: env.HOME,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.shellProcess.stdout.on('data', (chunk) => {
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({
            type: 'pty:data',
            data: chunk.toString('utf8')
          }));
        }
      });

      this.shellProcess.stderr.on('data', (chunk) => {
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({
            type: 'pty:data',
            data: chunk.toString('utf8')
          }));
        }
      });

      this.shellProcess.on('close', (code) => {
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({
            type: 'pty:data',
            data: `\r\n[Shell exited with code ${code}]\r\n`
          }));
        }
      });

      this.shellProcess.on('error', (err) => {
        if (this.ws && this.ws.readyState === 1) {
          this.ws.send(JSON.stringify({
            type: 'pty:data',
            data: `\r\n[Shell process error: ${err.message}]\r\n`
          }));
        }
      });
    } catch (err) {
      console.error('[PtyBridge] Spawn failed:', err);
    }
  }

  write(data) {
    if (this.shellProcess && this.shellProcess.stdin && !this.shellProcess.stdin.destroyed) {
      try {
        this.shellProcess.stdin.write(data);
      } catch (e) {
        console.error('[PtyBridge] Write failed:', e);
      }
    }
  }

  destroy() {
    if (this.shellProcess) {
      try {
        this.shellProcess.kill('SIGTERM');
      } catch (e) {}
      this.shellProcess = null;
    }
  }
}

module.exports = PtyBridge;
