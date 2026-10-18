/* OmaBerry File System API
 * Sandboxed file operations for Q20 / QNX filesystem
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const MAX_READ_BYTES = 64 * 1024; // 64 KB safety limit for device memory

/* Root the API at one directory. Everything the browser can ask for is
 * resolved inside it, symlinks included -- a relative path that climbs out
 * with "..", or a symlink pointing at /etc, lands nowhere.
 *
 * The default is the user's home so the device behaves like before; set
 * OMABERRY_FS_ROOT to narrow it further. */
const FS_ROOT = path.resolve(process.env.OMABERRY_FS_ROOT || os.homedir());

function isSafePath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string') return false;
  if (targetPath.indexOf('\0') !== -1) return false;
  const resolved = safeResolve(targetPath);
  return resolved !== null;
}

/* Map a requested path onto a real path inside FS_ROOT, or null. */
function safeResolve(targetPath) {
  const cleaned = String(targetPath).split('\0')[0];

  // A path that is already inside the root is taken at face value -- on the
  // device the root *is* /accounts/1000/shared and the UI asks for exactly
  // that, so stripping the leading slash would send it to
  // /accounts/1000/shared/accounts/1000/shared.
  const direct = path.resolve(cleaned);
  let joined;
  if (direct === FS_ROOT || direct.startsWith(FS_ROOT + path.sep)) {
    joined = direct;
  } else {
    // Otherwise treat it as relative: "/etc/passwd" becomes "<root>/etc/passwd",
    // which does not exist, instead of reaching the real one.
    joined = path.resolve(FS_ROOT, cleaned.replace(/^[/\\]+/, ''));
  }
  if (joined !== FS_ROOT && !joined.startsWith(FS_ROOT + path.sep)) return null;

  // Follow symlinks for whatever part of the path already exists, so a link
  // inside the root cannot be used as a bridge out of it.
  let probe = joined;
  for (;;) {
    try {
      const real = fs.realpathSync(probe);
      if (real !== FS_ROOT && !real.startsWith(FS_ROOT + path.sep)) return null;
      return real;
    } catch (e) {
      const parent = path.dirname(probe);
      if (parent === probe) return joined;
      probe = parent;
    }
  }
}

function handleList(ws, reqPath) {
  const dirPath = isSafePath(reqPath) ? safeResolve(reqPath) : FS_ROOT;

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
  // Validate and open the *same* path: checking one string and then reading
  // the caller's original leaves the two able to disagree.
  const target = safeResolve(reqPath);
  if (!target) {
    ws.send(JSON.stringify({ type: 'fs:read:res', error: 'Invalid path' }));
    return;
  }

  fs.readFile(target, 'utf8', (err, data) => {
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
  const target = safeResolve(reqPath);
  if (!target) {
    ws.send(JSON.stringify({ type: 'fs:write:res', error: 'Invalid path' }));
    return;
  }

  fs.writeFile(target, content, 'utf8', (err) => {
    ws.send(JSON.stringify({
      type: 'fs:write:res',
      path: reqPath,
      success: !err,
      error: err ? err.message : null
    }));
  });
}

module.exports = {
  FS_ROOT,
  safeResolve,
  handleList,
  handleRead,
  handleWrite
};
