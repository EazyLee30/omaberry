/* OmaBerry agent API — the LLM side of an agent card.
 *
 * A card in the desktop is a conversation with a model. This is what actually
 * talks to it: one OpenAI-compatible chat completion call, with the key read
 * from a git-ignored local file so it never reaches source control or the
 * browser.
 *
 * The honesty rules from web/js/agents.js apply here too. The three things a
 * caller wants to tell apart:
 *
 *   delivered   the request reached this process
 *   accepted    the provider answered with a completion
 *   completed   the model finished a turn (not the same as "the task is done")
 *
 * A timeout, a refusal or a transport error is reported as exactly that. The
 * reply is never dressed up as a successful turn.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_PATHS = [
  path.join(process.cwd(), 'omaberry.local.json'),
  path.join(os.homedir(), '.config', 'omaberry', 'omaberry.local.json')
];

let cached = null;

function loadConfig() {
  if (cached) return cached;
  for (const p of CONFIG_PATHS) {
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (raw && raw.agent) {
        cached = Object.assign({
          apiKey: '',
          baseUrl: '',
          model: 'mimo-v2.6-pro-ultraspeed',
          path: '/v1/chat/completions',
          timeoutMs: 60000
        }, raw.agent);
        cached._source = p;
        return cached;
      }
    } catch (e) { /* try the next path */ }
  }
  cached = { apiKey: '', baseUrl: '', model: '', _source: null };
  return cached;
}

/** What a caller may safely learn. The key is never included. */
function describe() {
  const c = loadConfig();
  return {
    configured: !!(c.apiKey && c.baseUrl),
    baseUrl: c.baseUrl || null,
    model: c.model || null,
    source: c._source,
    keyPresent: !!c.apiKey,
    // Say plainly what is missing instead of failing later in a confusing way.
    missing: [
      !c.apiKey ? 'apiKey' : null,
      !c.baseUrl ? 'baseUrl' : null
    ].filter(Boolean)
  };
}

/**
 * One chat turn. `messages` is [{role, content}].
 *
 * Resolves to a receipt. Rejects nothing: an agent driving the desktop reads
 * the outcome, it does not catch exceptions across a transport.
 */
async function chat(messages, opts) {
  const c = loadConfig();
  const o = opts || {};

  if (!c.apiKey || !c.baseUrl) {
    return {
      ok: false,
      delivered: false,
      accepted: false,
      error: 'agent API not configured',
      missing: describe().missing
    };
  }

  // Join without doubling the version prefix: callers may write either
  // https://host or https://host/v1, and both must reach /v1/chat/completions.
  const base = c.baseUrl.replace(/\/+$/, '');
  let route = c.path || '/chat/completions';
  if (!route.startsWith('/')) route = '/' + route;
  const baseHasV1 = /\/v\d+$/.test(base);
  const routeHasV1 = route.startsWith('/v');
  if (baseHasV1 && routeHasV1) route = route.replace(/^\/v\d+/, '');
  if (!baseHasV1 && !routeHasV1) route = '/v1' + route;
  const url = base + route;
  const body = {
    model: o.model || c.model,
    messages: messages,
    stream: false
  };
  if (typeof o.maxTokens === 'number') body.max_tokens = o.maxTokens;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), o.timeoutMs || c.timeoutMs || 60000);

  let started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + c.apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await res.text();
    clearTimeout(timeout);

    if (!res.ok) {
      // The provider refused. Report the status and whatever it said, which
      // is diagnostic, without pretending anything was accepted.
      return {
        ok: false,
        delivered: true,
        accepted: false,
        httpStatus: res.status,
        error: 'provider refused: ' + res.status,
        detail: text.slice(0, 500),
        elapsedMs: Date.now() - started
      };
    }

    let data;
    try { data = JSON.parse(text); } catch (e) {
      return {
        ok: false,
        delivered: true,
        accepted: false,
        error: 'provider returned non-JSON',
        detail: text.slice(0, 500)
      };
    }

    const choice = data && data.choices && data.choices[0];
    const content = choice && choice.message && choice.message.content;

    return {
      ok: true,
      delivered: true,
      accepted: true,
      // A finished turn is not proof the task finished. It is proof the model
      // produced a turn.
      completed: true,
      observed: true,
      content: content == null ? '' : String(content),
      finishReason: choice ? choice.finish_reason : null,
      usage: data.usage || null,
      model: data.model || (o.model || c.model),
      elapsedMs: Date.now() - started
    };
  } catch (e) {
    clearTimeout(timeout);
    const aborted = e && (e.name === 'AbortError' || e.code === 'ABORT_ERR');
    return {
      ok: false,
      delivered: true,
      accepted: false,
      completed: false,
      error: aborted ? 'timed out' : String((e && e.message) || e),
      elapsedMs: Date.now() - started
    };
  }
}

/**
 * Append a turn to a session's history and ask the model.
 * History is kept in memory per session id; it is not persisted, because a
 * transcript is not something to write to disk without being asked.
 */
const histories = new Map();

function turn(sessionId, userText, systemPrompt) {
  const history = histories.get(sessionId) || [];
  if (systemPrompt && history.length === 0) {
    history.push({ role: 'system', content: systemPrompt });
  }
  history.push({ role: 'user', content: userText });

  return chat(history).then((receipt) => {
    if (receipt.ok && receipt.accepted) {
      history.push({ role: 'assistant', content: receipt.content });
      histories.set(sessionId, history);
    }
    receipt.sessionId = sessionId;
    return receipt;
  });
}

function reset(sessionId) {
  histories.delete(sessionId);
  return { ok: true, observed: true };
}

module.exports = { describe, chat, turn, reset, loadConfig };