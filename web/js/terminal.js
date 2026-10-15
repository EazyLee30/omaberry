/* OmaBerry Terminal Subsystem
 * WebSocket PTY bridge, ANSI color parser, Starship prompt, and persistent Q20 keyboard focus
 */

'use strict';

window.OB = window.OB || {};

window.OB.Terminal = (function () {
  const K = window.OB.Kernel;

  let outputEl = null;
  let inputEl = null;
  let statusTagEl = null;

  const history = [];
  let historyIndex = -1;
  const MAX_HISTORY = 100;
  const MAX_OUTPUT_LINES = 500;

  /* Basic ANSI to HTML parser */
  function ansiToHtml(text) {
    if (!text) return '';
    let out = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Standard ANSI reset
    out = out.replace(/\x1b\[0m/g, '</span>');
    out = out.replace(/\x1b\[1m/g, '<span class="ansi-bold">');
    out = out.replace(/\x1b\[4m/g, '<span class="ansi-underline">');

    // Foreground colors (30-37, 90-97)
    out = out.replace(/\x1b\[30m/g, '<span class="ansi-black">');
    out = out.replace(/\x1b\[31m/g, '<span class="ansi-red">');
    out = out.replace(/\x1b\[32m/g, '<span class="ansi-green">');
    out = out.replace(/\x1b\[33m/g, '<span class="ansi-yellow">');
    out = out.replace(/\x1b\[34m/g, '<span class="ansi-blue">');
    out = out.replace(/\x1b\[35m/g, '<span class="ansi-magenta">');
    out = out.replace(/\x1b\[36m/g, '<span class="ansi-cyan">');
    out = out.replace(/\x1b\[37m/g, '<span class="ansi-white">');

    out = out.replace(/\x1b\[90m/g, '<span class="ansi-bright-black">');
    out = out.replace(/\x1b\[91m/g, '<span class="ansi-bright-red">');
    out = out.replace(/\x1b\[92m/g, '<span class="ansi-bright-green">');
    out = out.replace(/\x1b\[93m/g, '<span class="ansi-bright-yellow">');
    out = out.replace(/\x1b\[94m/g, '<span class="ansi-bright-blue">');
    out = out.replace(/\x1b\[95m/g, '<span class="ansi-bright-magenta">');
    out = out.replace(/\x1b\[96m/g, '<span class="ansi-bright-cyan">');
    out = out.replace(/\x1b\[97m/g, '<span class="ansi-bright-white">');

    // Strip unhandled escape sequences
    out = out.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');

    return out;
  }

  function appendOutput(rawText) {
    if (!outputEl) outputEl = document.getElementById('term-output');
    if (!outputEl) return;

    const html = ansiToHtml(rawText);
    const span = document.createElement('span');
    span.innerHTML = html;
    outputEl.appendChild(span);

    // Limit scrollback buffer
    while (outputEl.childNodes.length > MAX_OUTPUT_LINES) {
      outputEl.removeChild(outputEl.firstChild);
    }

    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function sendCommand(cmd) {
    if (cmd === undefined || cmd === null) return;
    if (cmd !== '') {
      history.push(cmd);
      if (history.length > MAX_HISTORY) history.shift();
      historyIndex = history.length;
    }

    // Send through WebSocket to Node server PTY
    const success = K.send('pty:write', { data: cmd + '\n' });
    if (!success) {
      // Local fallback / offline mode simulation
      appendOutput(`\n\x1b[33m[Offline]\x1b[0m ${cmd}\n`);
      if (cmd === 'clear') {
        clear();
      } else if (cmd === 'help') {
        appendOutput('OmaBerry Terminal Help:\n  Alt+T: Toggle terminal\n  Alt+L: App launcher\n  Alt+1-4: Switch workspaces\n  qpkg: BerryCore package manager\n');
      } else {
        appendOutput(`Server not connected. Reconnecting in background...\n`);
      }
    }
  }

  function sendRaw(str) {
    K.send('pty:write', { data: str });
  }

  function clear() {
    if (!outputEl) outputEl = document.getElementById('term-output');
    if (outputEl) outputEl.innerHTML = '';
  }

  function focus() {
    if (!inputEl) inputEl = document.getElementById('term-input');
    if (inputEl) {
      inputEl.focus();
      // Ensure mobile virtual keyboard or hardware input route is established
      setTimeout(() => {
        try { inputEl.focus(); } catch (e) {}
      }, 50);
    }
    K.setFocus('terminal');
  }

  function initKeybar() {
    const buttons = document.querySelectorAll('.keybar-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const cmd = btn.getAttribute('data-cmd');
        const key = btn.getAttribute('data-key');

        if (cmd === 'ctrl-c') {
          sendRaw('\x03');
          appendOutput('^C\n');
        } else if (cmd === 'clear') {
          clear();
        } else if (cmd) {
          sendCommand(cmd);
        } else if (key === 'Escape') {
          if (inputEl) inputEl.value = '';
          focus();
        } else if (key === 'Tab') {
          sendRaw('\t');
        } else if (key === 'ArrowUp') {
          if (historyIndex > 0) {
            historyIndex--;
            if (inputEl) inputEl.value = history[historyIndex] || '';
          }
        } else if (key === 'ArrowDown') {
          if (historyIndex < history.length - 1) {
            historyIndex++;
            if (inputEl) inputEl.value = history[historyIndex] || '';
          } else {
            historyIndex = history.length;
            if (inputEl) inputEl.value = '';
          }
        }
        focus();
      });
    });
  }

  function init() {
    outputEl = document.getElementById('term-output');
    inputEl = document.getElementById('term-input');
    statusTagEl = document.getElementById('term-status-tag');

    // Welcome banner in authentic Starship & Omarchy branding
    appendOutput(
      '\x1b[34m┌──────────────────────────────────────────────┐\x1b[0m\n' +
      '\x1b[34m│\x1b[0m  \x1b[1;36mOMARCHY BERRY\x1b[0m — Q20 × QNX × BerryCore       \x1b[34m│\x1b[0m\n' +
      '\x1b[34m│\x1b[0m  \x1b[32mOmarchy Quattro\x1b[0m · Catppuccin · Starship     \x1b[34m│\x1b[0m\n' +
      '\x1b[34m│\x1b[0m  Press \x1b[33mAlt+L\x1b[0m or \x1b[33mBB Menu\x1b[0m for Launcher         \x1b[34m│\x1b[0m\n' +
      '\x1b[34m└──────────────────────────────────────────────┘\x1b[0m\n\n'
    );

    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
        // Ctrl+C handling
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          sendRaw('\x03');
          appendOutput('^C\n');
          inputEl.value = '';
          return;
        }

        // Ctrl+L handling
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
          e.preventDefault();
          clear();
          return;
        }

        // Tab key
        if (e.key === 'Tab') {
          e.preventDefault();
          sendRaw(inputEl.value + '\t');
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          const cmd = inputEl.value;
          inputEl.value = '';
          sendCommand(cmd);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (historyIndex > 0) {
            historyIndex--;
            inputEl.value = history[historyIndex] || '';
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (historyIndex < history.length - 1) {
            historyIndex++;
            inputEl.value = history[historyIndex] || '';
          } else {
            historyIndex = history.length;
            inputEl.value = '';
          }
        }
      });

      inputEl.addEventListener('focus', () => {
        K.setFocus('terminal');
      });
    }

    // Output click or container click refocuses input
    const container = document.querySelector('.terminal-container');
    if (container) {
      container.addEventListener('click', () => {
        focus();
      });
    }

    initKeybar();

    // WebSocket events
    K.on('ws:open', () => {
      if (statusTagEl) {
        statusTagEl.textContent = 'ONLINE';
        statusTagEl.className = 'term-tag connected';
      }
      appendOutput('\x1b[32m[Connected to Q20 PTY Bridge]\x1b[0m\n');
    });

    K.on('ws:close', () => {
      if (statusTagEl) {
        statusTagEl.textContent = 'OFFLINE';
        statusTagEl.className = 'term-tag disconnected';
      }
    });

    K.on('ws:pty:data', (msg) => {
      if (msg && msg.data) {
        appendOutput(msg.data);
      }
    });

    // Kernel action events
    K.on('action:open-terminal', () => {
      K.emit('action:switch-workspace', { index: 0 });
      focus();
    });

    K.on('action:toggle-terminal', () => {
      if (K.getState('focus') === 'terminal' && K.getState('workspace') === 0) {
        // keep focus in terminal
      } else {
        K.emit('action:switch-workspace', { index: 0 });
        focus();
      }
    });

    K.on('terminal:focus', () => {
      focus();
    });

    K.on('terminal:run', (data) => {
      if (data && data.cmd) {
        sendCommand(data.cmd.trim());
      }
    });

    K.register('terminal', {
      append: appendOutput,
      send: sendCommand,
      sendRaw,
      clear,
      focus
    });

    // Automatically focus on initialization
    setTimeout(focus, 150);
  }

  return { init, append: appendOutput, send: sendCommand, sendRaw, clear, focus };
})();
