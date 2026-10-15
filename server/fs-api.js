/* OmaBerry File System API
 * Sandboxed file operations for Q20 / QNX filesystem
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MAX_READ_BYTES = 64 * 1024; // 64 KB safety limit for device memory

function isSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false;
  const normalized = path.normalize(targetPath);
  // Prevent sensitive root system modification if needed, but allow browsing /accounts, /var, /tmp
  return !normalized.includes('\0');
}

function handleList(ws, reqPath) {
  const dirPath = isSafePath(reqPath) ? reqPath : '/accounts/1000/shared';

  fs.readdir(dirPath, { withFileTypes: true }, (err, files) => {
    if (err) {
      ws.send(JSON.stringify({
        type: 'fs:list:res',
        path: dirPath,
        error: err.message,
        entries: []
      }));
      return;
    }

    const entries = [];
    for (const file of files) {
      try {
        const fullPath = path.join(dirPath, file.name);
        const stat = fs.statSync(fullPath);
        entries.push({
          name: file.name,
          isDir: file.isDirectory(),
          size: stat.size,
          mtime: stat.mtimeMs
        });
      } catch (e) {
        entries.push({
          name: file.name,
          isDir: file.isDirectory ? file.isDirectory() : false,
          size: 0
        });
      }
    }

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    ws.send(JSON.stringify({
      type: 'fs:list:res',
      path: dirPath,
      entries
    }));
  });
}

function handleRead(ws, reqPath) {
  if (!isSafePath(reqPath)) {
    ws.send(JSON.stringify({ type: 'fs:read:res', error: 'Invalid path' }));
    return;
  }

  fs.readFile(reqPath, 'utf8', (err, data) => {
    if (err) {
      ws.send(JSON.stringify({
        type: 'fs:read:res',
        path: reqPath,
        error: err.message
      }));
      return;
    }

    const truncated = data.length > MAX_READ_BYTES ? data.slice(0, MAX_READ_BYTES) + '\n... [Truncated]' : data;
    ws.send(JSON.stringify({
      type: 'fs:read:res',
      path: reqPath,
      content: truncated
    }));
  });
}

function handleWrite(ws, reqPath, content) {
  if (!isSafePath(reqPath)) {
    ws.send(JSON.stringify({ type: 'fs:write:res', error: 'Invalid path' }));
    return;
  }

  fs.writeFile(reqPath, content, 'utf8', (err) => {
    ws.send(JSON.stringify({
      type: 'fs:write:res',
      path: reqPath,
      success: !err,
      error: err ? err.message : null
    }));
  });
}

module.exports = {
  handleList,
  handleRead,
  handleWrite
};
