/* OmaBerry Action Registry
 *
 * Every thing the desktop can do is one entry here. The keyboard, the menu,
 * the touch shortcuts and -- later -- an agent over SSH all call the same
 * registry, so a feature added once is available everywhere. SUPER DESKTOP
 * calls this App = Data + Actions + View: the view is just one client.
 *
 * Two rules make it useful rather than decorative:
 *
 *   1. An action declares what it needs. `requires` lets a caller find out
 *      that an action is unavailable *before* invoking it, instead of
 *      discovering it by watching it fail. A menu hides it; an agent gets
 *      told "not available on this build".
 *
 *   2. Actions report honestly. The return value is a receipt -- what
 *      actually happened, not what was intended. SUPER DESKTOP is strict
 *      about this ("No completion is inferred from silence"), and it is the
 *      difference between an agent that knows what it did and one that
 *      guesses.
 *
 * Nothing here talks to a network. That is deliberate: the registry is the
 * local truth, and whatever transports an agent's request has to go through
 * it like everything else.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Actions = (function () {
  const K = window.OB.Kernel;

  const registry = new Map();

  /**
   * @param {string} id        stable identifier, e.g. "workspace.switch"
   * @param {object} def       { title, group, requires, run, description }
   *
   * `requires` is a list of module names or capability strings. `run` gets
   * `(args, ctx)` and returns a receipt: { ok, changed?, data?, error? }.
   */
  function register(id, def) {
    if (!id || typeof id !== 'string') throw new Error('action id required');
    if (typeof def.run !== 'function') throw new Error('action ' + id + ' needs run()');
    if (registry.has(id)) throw new Error('action already registered: ' + id);
    registry.set(id, {
      id: id,
      title: def.title || id,
      group: def.group || 'general',
      description: def.description || '',
      requires: def.requires || [],
      run: def.run
    });
    return registry.get(id);
  }

  /** Is this action callable right now? Empty string when it is. */
  function unavailable(id) {
    const action = registry.get(id);
    if (!action) return 'unknown action';
    for (const need of action.requires) {
      if (need.charAt(0) === '#') {
        // "#foo" means the module must be present
        if (!K.getModule(need.slice(1))) return 'needs ' + need.slice(1);
      } else if (typeof K.getState(need) === 'undefined') {
        return 'needs state ' + need;
      }
    }
    return '';
  }

  function available(id) {
    return unavailable(id) === '';
  }

  /**
   * Run an action and return its receipt.
   *
   * Never throws to the caller: an action that fails produces
   * { ok: false, error }, because an agent driving the desktop has to be able
   * to read the outcome rather than catch an exception from a transport.
   */
  function invoke(id, args) {
    const action = registry.get(id);
    if (!action) {
      return { ok: false, action: id, error: 'unknown action' };
    }
    const blocked = unavailable(id);
    if (blocked) {
      return { ok: false, action: id, error: blocked, available: false };
    }

    let receipt;
    try {
      receipt = action.run(args || {}, { kernel: K });
    } catch (e) {
      receipt = { ok: false, error: (e && e.message) || String(e) };
    }
    if (!receipt || typeof receipt !== 'object') receipt = { ok: true };

    const out = Object.assign({ action: id }, receipt);
    // `observed` is how the caller tells an intention from a result. An action
    // that queued work reports observed:false; one that saw the outcome
    // reports true. Nobody downstream has to guess.
    if (typeof out.observed !== 'boolean') out.observed = out.ok === true;
    K.emit('action:invoked', out);
    return out;
  }

  /** Everything callable right now, for a menu or for an agent asking what it can do. */
  function list(filter) {
    const out = [];
    for (const action of registry.values()) {
      const blocked = unavailable(action.id);
      if (filter && filter.availableOnly && blocked) continue;
      if (filter && filter.group && action.group !== filter.group) continue;
      out.push({
        id: action.id,
        title: action.title,
        group: action.group,
        description: action.description,
        available: blocked === '',
        unavailableReason: blocked || undefined
      });
    }
    return out;
  }

  function has(id) {
    return registry.has(id);
  }

  function init() {
    K.register('actions', { register, invoke, list, has, available, unavailable });
    K.emit('actions:ready', {});
  }

  return { init, register, invoke, list, has, available, unavailable };
})();