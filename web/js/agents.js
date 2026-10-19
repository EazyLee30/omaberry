/* OmaBerry Agent cards
 *
 * A card is one remote coding agent session -- Codex, OpenCode, Claude Code --
 * running on a Mac or another machine, with the Q20 as the terminal in front
 * of it. That is the product SUPER DESKTOP built and the thing a physical
 * keyboard device is unusually good at: type on the phone, it runs on the PC.
 *
 * The hard part is not the UI, it is being honest about state. SUPER DESKTOP
 * is blunt about this: "No completion is inferred from silence or screen
 * text." So a card's status comes only from observed evidence:
 *
 *   connected    a bridge answered, and said the session exists
 *   working      the bridge reported activity since the last observation
 *   finished     the bridge reported a completion event -- not a quiet screen
 *   disconnected no answer, or the bridge said the session is gone
 *
 * `unknown` is a real state and is preferred over guessing. A card that has
 * never heard from its bridge says so rather than showing "finished".
 */

'use strict';

window.OB = window.OB || {};

window.OB.Agents = (function () {
  const K = window.OB.Kernel;

  /* Where a bridge would live. Nothing is contacted unless one is there;
   * an absent bridge is reported, never simulated. */
  const BRIDGE_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') +
    location.host + '/agents';

  const STATUS = {
    UNKNOWN: 'unknown',
    CONNECTED: 'connected',
    WORKING: 'working',
    FINISHED: 'finished',
    DISCONNECTED: 'disconnected'
  };

  /** One card. Everything except `id` and `name` starts unknown on purpose. */
  function newSession(id, name) {
    return {
      id: id,
      name: name,
      harness: null,          // codex / opencode / claude / shell
      cwd: null,
      status: STATUS.UNKNOWN,
      // What we actually observed, and when. Kept so the UI can say
      // "last seen 2m ago" instead of implying liveness.
      observedAt: 0,
      lastLines: [],
      // Completion evidence is a bridge event id, not an inference.
      completionId: null,
      completionObserved: false
    };
  }

  const sessions = new Map();
  let bridgeState = 'absent';   // absent | connecting | open | closed
  let socket = null;

  /* ── honest status derivation ──────────────────────────────────── */

  function applyReport(session, report) {
    // Only fields the bridge actually sent are updated. Anything missing
    // stays as it was -- never defaulted to a friendlier value.
    if (typeof report.cwd === 'string') session.cwd = report.cwd;
    if (typeof report.harness === 'string') session.harness = report.harness;
    if (Array.isArray(report.lines)) {
      session.lastLines = report.lines.slice(-6);
    }
    if (report.completionId !== undefined && report.completionId !== null) {
      session.completionId = report.completionId;
      session.completionObserved = true;
      session.status = STATUS.FINISHED;
    } else if (report.active === true) {
      session.status = STATUS.WORKING;
      session.completionObserved = false;
    } else if (report.exists === true) {
      session.status = STATUS.CONNECTED;
    } else if (report.exists === false) {
      session.status = STATUS.DISCONNECTED;
    }
    session.observedAt = Date.now();
  }

  /**
   * What the card may claim to know.
   *
   * A session that has not been observed recently is not "working" -- it is
   * unknown, and saying otherwise is exactly the failure mode this design is
   * trying to avoid.
   */
  function effectiveStatus(session) {
    if (bridgeState !== 'open') return STATUS.UNKNOWN;
    const age = Date.now() - session.observedAt;
    if (session.observedAt === 0) return STATUS.UNKNOWN;
    if (age > 30000) return STATUS.UNKNOWN;   // stale observation
    return session.status;
  }

  /* ── bridge ────────────────────────────────────────────────────── */

  function connect() {
    if (typeof WebSocket === 'undefined') {
      bridgeState = 'absent';
      K.emit('agents:bridge', { state: 'absent', reason: 'no WebSocket in this host' });
      return;
    }
    try {
      socket = new WebSocket(BRIDGE_URL);
    } catch (e) {
      bridgeState = 'absent';
      K.emit('agents:bridge', { state: 'absent', reason: String(e && e.message) });
      return;
    }

    bridgeState = 'connecting';
    socket.onopen = function () {
      bridgeState = 'open';
      K.emit('agents:bridge', { state: 'open' });
    };
    socket.onerror = function () {
      bridgeState = 'absent';
      K.emit('agents:bridge', { state: 'absent', reason: 'bridge refused the connection' });
    };
    socket.onclose = function () {
      bridgeState = 'closed';
      for (const s of sessions.values()) s.status = STATUS.UNKNOWN;
      K.emit('agents:bridge', { state: 'closed' });
    };
    socket.onmessage = function (ev) {
      let msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg && msg.type === 'agent:report' && msg.id) {
        const session = sessions.get(msg.id) || newSession(msg.id, msg.name || msg.id);
        sessions.set(session.id, session);
        applyReport(session, msg);
        K.emit('agents:updated', { id: session.id });
      }
    };
  }

  /* ── commands ──────────────────────────────────────────────────── */

  function add(id, name) {
    const session = newSession(id, name || id);
    sessions.set(id, session);
    K.emit('agents:updated', { id: id });
    return session;
  }

  function list() {
    return Array.from(sessions.values()).map(function (s) {
      return Object.assign({}, s, { effectiveStatus: effectiveStatus(s) });
    });
  }

  /**
   * Send text to a session. Reports delivery, not acceptance.
   *
   * "Delivered" and "the agent accepted this prompt" are different facts, and
   * pretending otherwise is how an agent client ends up believing a task ran
   * when it did not.
   */
  function send(id, text) {
    const session = sessions.get(id);
    if (!session) return { ok: false, error: 'no such session', observed: false };
    if (bridgeState !== 'open') {
      return { ok: false, error: 'no agent bridge', observed: false };
    }

    const requestId = 'req-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
    const pending = new Promise((resolve) => {
      const onReply = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        if (msg && msg.type === 'agent:chat:res' && msg.id === requestId) {
          socket.removeEventListener('message', onReply);
          resolve(msg.receipt);
        }
      };
      socket.addEventListener('message', onReply);
    });

    try {
      socket.send(JSON.stringify({
        type: 'agent:chat',
        id: requestId,
        sessionId: id,
        text: text
      }));
    } catch (e) {
      return Promise.resolve({ ok: false, delivered: false, error: String(e && e.message) });
    }

    // Delivered to the bridge here. What the model actually did is in the
    // receipt this promise resolves to -- see agent-api.js.
    return pending.then((receipt) => {
      if (receipt && receipt.accepted) {
        session.status = STATUS.FINISHED;
        session.completionObserved = true;
        if (typeof receipt.content === 'string') {
          session.lastLines = receipt.content.split('\n').slice(-6);
        }
        session.observedAt = Date.now();
        K.emit('agents:updated', { id: id });
      }
      return receipt;
    });
  }

  function bridge() {
    return { state: bridgeState, url: BRIDGE_URL };
  }

  function init() {
    K.register('agents', { add, list, send, bridge, STATUS });
    K.on('action:agent-send', function (d) {
      const receipt = send(d.id, d.text);
      K.emit('agents:receipt', receipt);
      return receipt;
    });
    connect();
    K.emit('agents:ready', {});
  }

  return { init, add, list, send, bridge, effectiveStatus, STATUS };
})();