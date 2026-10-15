/* OmaBerry Terminal Renderer
 * WebSocket PTY bridge, ANSI color parser, command history, and input handler
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

    // Standard ANSI color codes
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
    if (!cmd && cmd !== '') return;
    history.push(cmd);
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length;

    // Send through WebSocket to Node server
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

  function clear() {
    if (outputEl) outputEl.innerHTML = '';
  }

  function focus() {
    if (inputEl) inputEl.focus();
    K.setFocus('terminal');
  }

  function init() {
    outputEl = document.getElementById('term-output');
    inputEl = document.getElementById('term-input');
    statusTagEl = document.getElementById('term-status-tag');

    // Welcome banner
    appendOutput(
      '\x1b[34m┌──────────────────────────────────────────────┐\x1b[0m\n' +
      '\x1b[34m│\x1b[0m  \x1b[1;37mOmaBerry Shell\x1b[0m — Q20 × QNX × BerryCore     \x1b[34m│\x1b[0m\n' +
      '\x1b[34m│\x1b[0m  Type \x1b[32mhelp\x1b[0m or press \x1b[33mAlt+L\x1b[0m for launcher       \x1b[34m│\x1b[0m\n' +
      '\x1b[34m└──────────────────────────────────────────────┘\x1b[0m\n\n'
    );

    if (inputEl) {
      inputEl.addEventListener('keydown', (e) => {
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

    // Output area click focuses input
    if (outputEl) {
      outputEl.addEventListener('click', () => {
        focus();
      });
    }

    // WebSocket events
    K.on('ws:open', () => {
      if (statusTagEl) {
        statusTagEl.textContent = 'CONNECTED';
        statusTagEl.className = 'term-tag connected';
      }
      appendOutput('\x1b[32m[Connected to OmaBerry PTY Bridge]\x1b[0m\n');
    });

    K.on('ws:close', () => {
      if (statusTagEl) {
        statusTagEl.textContent = 'DISCONNECTED';
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
      if (K.getState('focus') === 'terminal') {
        K.setFocus('desktop');
        if (inputEl) inputEl.blur();
      } else {
        K.emit('action:switch-workspace', { index: 0 });
        focus();
      }
    });

    K.on('terminal:run', (data) => {
      if (data && data.cmd) {
        sendCommand(data.cmd.trim());
      }
    });

    K.register('terminal', {
      append: appendOutput,
      send: sendCommand,
      clear,
      focus
    });
  }

  return { init, append: appendOutput, send: sendCommand, clear, focus };
})();
