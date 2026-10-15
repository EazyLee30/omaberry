/* OmaBerry System Telemetry API
 * Provides CPU, memory, uptime and OS metrics to the desktop status bar
 */

'use strict';

const os = require('os');

function getMetrics() {
  const totalMem = os.totalmem ? os.totalmem() : 2 * 1024 * 1024 * 1024;
  const freeMem = os.freemem ? os.freemem() : 512 * 1024 * 1024;
  const memUsedMb = Math.round((totalMem - freeMem) / (1024 * 1024));
  const memFreeMb = Math.round(freeMem / (1024 * 1024));
  const memTotalMb = Math.round(totalMem / (1024 * 1024));

  // Q20 is Dual-Core Qualcomm Krait; avoid os.cpus() which triggers QNX libuv _SYSPAGE_ELEMENT_SIZE
  const cpuCount = 2;
  let cpuPercent = 15;
  try {
    const loadAvg = os.loadavg ? os.loadavg() : [0.3, 0.2, 0.1];
    cpuPercent = Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100)) || 15;
  } catch (e) {}

  return {
    type: 'sysinfo',
    cpu: cpuPercent,
    memUsedMb,
    memFreeMb,
    memTotalMb,
    uptimeSec: Math.round(os.uptime ? os.uptime() : process.uptime()),
    platform: process.platform,
    arch: process.arch
  };
}

module.exports = { getMetrics };
