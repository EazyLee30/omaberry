/* OmaBerry Status Bar
 * Clock, battery, CPU/Memory telemetry, workspace indicator
 */

'use strict';

window.OB = window.OB || {};

window.OB.StatusBar = (function () {
  const K = window.OB.Kernel;

  let elTime = null;
  let elDate = null;
  let elBattery = null;
  let elWifi = null;
  let elWsPills = [];
  let elShade = null;

  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (elTime) elTime.textContent = `${hours}:${minutes}`;

    const month = now.getMonth() + 1;
    const date = now.getDate();
    if (elDate) elDate.textContent = `${month}/${date}`;
  }

  function initBattery() {
    if (navigator.getBattery) {
      navigator.getBattery().then(function (battery) {
        function updateBat() {
          const level = Math.round(battery.level * 100);
          const charging = battery.charging ? '⚡' : '';
          if (elBattery) {
            elBattery.textContent = `${charging}${level}%`;
          }
        }
        updateBat();
        battery.addEventListener('levelchange', updateBat);
        battery.addEventListener('chargingchange', updateBat);
      }).catch(function () {});
    } else {
      if (elBattery) elBattery.textContent = '100%';
    }
  }

  function updateWorkspace(index) {
    elWsPills.forEach((pill, idx) => {
      if (idx === index) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function toggleShade() {
    if (!elShade) elShade = document.getElementById('quick-shade');
    if (elShade) {
      elShade.classList.toggle('open');
      const isOpen = elShade.classList.contains('open');
      K.setFocus(isOpen ? 'shade' : 'desktop');
    }
  }

  function closeShade() {
    if (!elShade) elShade = document.getElementById('quick-shade');
    if (elShade && elShade.classList.contains('open')) {
      elShade.classList.remove('open');
      K.setFocus('desktop');
    }
  }

  function init() {
    elTime = document.getElementById('status-time');
    elDate = document.getElementById('status-date');
    elBattery = document.getElementById('status-battery');
    elWifi = document.getElementById('status-wifi');
    elShade = document.getElementById('quick-shade');

    const pills = document.querySelectorAll('.ws-pill');
    elWsPills = Array.from(pills);
    elWsPills.forEach((pill, idx) => {
      pill.addEventListener('click', () => {
        K.emit('action:switch-workspace', { index: idx });
      });
    });

    updateClock();
    setInterval(updateClock, 1000);
    initBattery();

    // Listen to kernel state events
    K.on('state:workspace', (data) => {
      updateWorkspace(data.value);
    });

    // Listen to touch bezel action
    K.on('action:toggle-shade', () => {
      toggleShade();
    });

    K.on('action:back', () => {
      if (elShade && elShade.classList.contains('open')) {
        closeShade();
      }
    });

    // Sysinfo telemetry via WebSocket
    K.on('ws:sysinfo', (data) => {
      if (data && data.cpu && elWifi) {
        elWifi.title = `Load: ${data.cpu}% | Free RAM: ${data.memFreeMb}MB`;
      }
    });

    K.register('statusbar', {
      toggleShade,
      closeShade
    });
  }

  return { init, toggleShade, closeShade };
})();
