/* OmaBerry Kernel — Event bus, state management, and module registry.
 * All OmaBerry modules communicate through this central bus.
 * Targeting Chromium 120 (Berry Browser). */

'use strict';

window.OB = window.OB || {};

window.OB.Kernel = (function () {

  /* ── Event Bus ─────────────────────────────────────────────────── */

  const _listeners = {};   // { eventName: [{ fn, once }] }
  const _state = {};       // Global reactive state
  const _modules = {};     // Registered modules

  function on(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push({ fn, once: false });
    return function off() {
      const arr = _listeners[event];
      if (!arr) return;
      const idx = arr.findIndex(e => e.fn === fn);
      if (idx !== -1) arr.splice(idx, 1);
    };
  }

  function once(event, fn) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push({ fn, once: true });
  }

  function emit(event, data) {
    const arr = _listeners[event];
    if (!arr) return;
    /* Iterate copy so removals during emit are safe */
    const copy = arr.slice();
    for (let i = 0; i < copy.length; i++) {
      try { copy[i].fn(data); } catch (e) { console.error('[OB]', event, e); }
      if (copy[i].once) {
        const idx = arr.indexOf(copy[i]);
        if (idx !== -1) arr.splice(idx, 1);
      }
    }
  }

  /* ── State ─────────────────────────────────────────────────────── */

  function setState(key, value) {
    const prev = _state[key];
    _state[key] = value;
    if (prev !== value) {
      emit('state:' + key, { key, value, prev });
    }
  }

  function getState(key, fallback) {
    return _state[key] !== undefined ? _state[key] : fallback;
  }

  /* ── Module Registry ───────────────────────────────────────────── */

  function register(name, mod) {
    _modules[name] = mod;
    emit('module:registered', { name, mod });
  }

  function getModule(name) {
    return _modules[name] || null;
  }

  /* ── WebSocket Connection ──────────────────────────────────────── */

  let _ws = null;
  let _wsReady = false;
  let _reconnectTimer = null;
  let _reconnectAttempts = 0;
  const MAX_RECONNECT = 10;
  const RECONNECT_BASE_MS = 1000;

  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = proto + '//' + location.host + '/ws';
    _ws = new WebSocket(url);

    _ws.onopen = function () {
      _wsReady = true;
      _reconnectAttempts = 0;
      setState('ws', 'connected');
      emit('ws:open', {});
    };

    _ws.onmessage = function (ev) {
      try {
        const msg = JSON.parse(ev.data);
        emit('ws:message', msg);
        if (msg.type) emit('ws:' + msg.type, msg);
      } catch (e) {
        console.error('[OB] ws parse error', e);
      }
    };

    _ws.onclose = function () {
      _wsReady = false;
      setState('ws', 'disconnected');
      emit('ws:close', {});
      scheduleReconnect();
    };

    _ws.onerror = function () {
      _wsReady = false;
      setState('ws', 'error');
    };
  }

  function scheduleReconnect() {
    if (_reconnectAttempts >= MAX_RECONNECT) {
      emit('ws:failed', { attempts: _reconnectAttempts });
      return;
    }
    const delay = RECONNECT_BASE_MS * Math.pow(2, Math.min(_reconnectAttempts, 5));
    _reconnectAttempts++;
    clearTimeout(_reconnectTimer);
    _reconnectTimer = setTimeout(connectWS, delay);
  }

  function send(type, payload) {
    if (!_wsReady || !_ws) return false;
    const msg = Object.assign({ type: type }, payload || {});
    _ws.send(JSON.stringify(msg));
    return true;
  }

  /* ── Focus Management ──────────────────────────────────────────── */

  /* Which component currently owns keyboard input.
   * Possible values: 'terminal', 'launcher', 'fileman', 'shade', 'desktop' */
  setState('focus', 'terminal');
  setState('ws', 'disconnected');
  setState('workspace', 0);
  setState('fullscreen', false);

  function setFocus(target) {
    const prev = getState('focus');
    if (prev === target) return;
    setState('focus', target);
    emit('focus:change', { from: prev, to: target });
  }

  /* ── Init ───────────────────────────────────────────────────────── */

  function init() {
    connectWS();
    emit('kernel:ready', {});
  }

  /* ── Public API ─────────────────────────────────────────────────── */

  return {
    on, once, emit,
    setState, getState,
    register, getModule,
    send,
    setFocus,
    init,
    /* expose for debug */
    get ws() { return _ws; },
    get wsReady() { return _wsReady; }
  };

})();
