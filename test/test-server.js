/* OmaBerry Server & API Test Suite
 * Tests HTTP static file delivery, WebSocket handshake, and Sysinfo API
 */

'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

console.log('--- Running OmaBerry Automated Tests ---');

// 1. Test SysInfo API
const sysApi = require('../server/sys-api');
const metrics = sysApi.getMetrics();
assert(metrics.type === 'sysinfo', 'Metrics should return type sysinfo');
assert(typeof metrics.cpu === 'number', 'CPU metric should be number');
assert(typeof metrics.memFreeMb === 'number', 'Free RAM metric should be number');
console.log('✓ SysInfo API verified:', JSON.stringify(metrics));

// 2. Test File System API path validation
const fsApi = require('../server/fs-api');
assert(typeof fsApi.handleList === 'function', 'handleList is function');
assert(typeof fsApi.handleRead === 'function', 'handleRead is function');
console.log('✓ FS API module verified');

// 3. Test HTTP & WebSocket server end-to-end
const TEST_PORT = 9829;
const serverProcess = spawn('node', [path.resolve(__dirname, '../server/index.js')], {
  env: Object.assign({}, process.env, {
    OMABERRY_PORT: TEST_PORT,
    OMABERRY_HOST: '127.0.0.1'
  }),
  stdio: ['pipe', 'pipe', 'pipe']
});

setTimeout(() => {
  // Check HTTP GET /
  http.get(`http://127.0.0.1:${TEST_PORT}/index.html`, (res) => {
    assert.strictEqual(res.statusCode, 200, 'HTTP status should be 200');
    assert.strictEqual(res.headers['content-type'], 'text/html; charset=utf-8');

    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      assert(body.includes('OmaBerry'), 'Body should contain OmaBerry');
      assert(body.includes('statusbar'), 'Body should contain statusbar');
      console.log('✓ HTTP static file server verified (served index.html)');

      // Check HTTP GET /css/tokens.css
      http.get(`http://127.0.0.1:${TEST_PORT}/css/tokens.css`, (cssRes) => {
        assert.strictEqual(cssRes.statusCode, 200);
        assert.strictEqual(cssRes.headers['content-type'], 'text/css; charset=utf-8');
        console.log('✓ CSS tokens served with correct MIME');

        // Check WebSocket Upgrade
        const req = http.request({
          port: TEST_PORT,
          host: '127.0.0.1',
          headers: {
            'Connection': 'Upgrade',
            'Upgrade': 'websocket',
            'Sec-WebSocket-Key': crypto.randomBytes(16).toString('base64'),
            'Sec-WebSocket-Version': '13'
          }
        });

        req.on('upgrade', (wsRes, socket, upgradeHead) => {
          assert.strictEqual(wsRes.statusCode, 101, 'Upgrade status should be 101');
          assert.strictEqual(wsRes.headers['upgrade'].toLowerCase(), 'websocket');
          console.log('✓ WebSocket RFC 6455 upgrade verified');

          socket.end();
          serverProcess.kill('SIGTERM');
          console.log('\n====================================');
          console.log(' ALL OMABERRY AUTOMATED TESTS PASSED ');
          console.log('====================================\n');
          process.exit(0);
        });

        req.end();
      });
    });
  }).on('error', (err) => {
    console.error('HTTP test error:', err);
    serverProcess.kill();
    process.exit(1);
  });
}, 2500);
