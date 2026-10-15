/* OmaBerry Trackpad Engine
 *
 * Modelled on Term49CX's handleTrackpadEvent() (QiQiFang/Term49CX, src/main.c),
 * which turns the Q20 optical trackpad into discrete terminal events. The
 * design is worth copying — the accumulator with a threshold, the reset on
 * direction change, and the per-event rate limit are what make it feel right,
 * and they are not optional polish.
 *
 * The difference that matters: Term49CX is a native QNX app and gets the raw
 * BPS SCREEN_EVENT_JOYSTICK displacement. A page inside content_shell never
 * sees that event, so the only continuous signal available here is the
 * WheelEvent delta that Chromium synthesises from a two-finger/trackpad
 * scroll. Everything below is therefore built on that delta rather than on
 * invented raw coordinates:
 *
 *   - a delta is an analogue quantity  -> accumulate, threshold, emit steps
 *   - reversing direction             -> drop the residue, or the first flick
 *                                         back has to finish the old travel
 *   - one OS event can carry a long    -> clamp to MAX_STEPS_PER_EVENT so a
 *     fling cannot inject 40 arrows      a fast swipe cannot flood the PTY
 *   - sub-step remainder               -> keep it (acc %= step) so slow
 *                                         movement still accumulates
 *
 * Wheel deltas are in CSS pixels and vary by device, so the threshold is
 * normalised through DELTA_SCALE rather than hard-coded in pixels.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Trackpad = (function () {
  const K = window.OB.Kernel;

  const CONFIG = {
    // Chromium reports trackpad scrolls as small fractional deltas on most
    // platforms and as 100-per-notch on some. 120 is one wheel "line".
    step: 120,
    // Direction reversal drops the accumulator.
    resetOnReverse: true,
    // Term49CX uses TRACKPAD_MAX_STEPS_PER_EVENT = 5 for the same reason.
    maxStepsPerEvent: 5,
    // Ignore the vertical component when the flick is clearly horizontal,
    // otherwise a diagonal flick fires both actions.
    dominantAxisRatio: 1.6
  };

  const acc = { x: 0, y: 0 };
  const lastDir = { x: 0, y: 0 };
  let enabled = true;

  function reset() {
    acc.x = 0;
    acc.y = 0;
    lastDir.x = 0;
    lastDir.y = 0;
  }

  function sign(v) { return v > 0 ? 1 : (v < 0 ? -1 : 0); }

  /* Consume accumulated delta on one axis and return whole steps.
   The sub-step remainder is put back, so slow movement still adds up. */
function drain(axis) {
    const total = acc[axis];
    if (total === 0) return 0;

    const dir = sign(total);
    if (CONFIG.resetOnReverse && lastDir[axis] !== 0 && dir !== lastDir[axis]) {
      // Reversing mid-accumulation: the leftover travel from the old
      // direction is stale. Term49CX drops it so the flick back is instant --
      // but the new direction has to be adopted here, otherwise the *next*
      // event is treated as another reversal and also gets dropped, and the
      // user has to flick twice to get anywhere.
      acc[axis] = 0;
      lastDir[axis] = dir;
      return 0;
    }
    lastDir[axis] = dir;

    let steps = Math.floor(Math.abs(total) / CONFIG.step);
    acc[axis] = total - dir * steps * CONFIG.step;

    if (steps > CONFIG.maxStepsPerEvent) {
      steps = CONFIG.maxStepsPerEvent;
      acc[axis] = 0;   // a fling beyond the cap is dropped, not banked
    }
    return dir * steps;
  }

  function onWheel(e) {
    if (!enabled) return;

    const dx = e.deltaX || 0;
    const dy = e.deltaY || 0;

    // Chromium may report a trackpad flick as a decaying tail of tiny deltas.
    // Ignore noise, but keep sub-step remainder so a genuinely slow drag
    // still adds up instead of being rounded away.
    if (Math.abs(dx) > 0 && Math.abs(dy) > 0 &&
        Math.max(Math.abs(dx), Math.abs(dy)) /
        Math.min(Math.abs(dx), Math.abs(dy)) < CONFIG.dominantAxisRatio) {
      // Too diagonal to trust — let the page scroll, do not switch workspaces.
      return;
    }

    acc.x += dx;
    acc.y += dy;

    const hSteps = drain('x');
    if (hSteps !== 0) {
      for (let i = 0; i < Math.abs(hSteps); i++) {
        K.emit(hSteps > 0 ? 'trackpad:workspace-next' : 'trackpad:workspace-prev',
               { source: 'trackpad' });
      }
    }

    const vSteps = drain('y');
    if (vSteps !== 0) {
      K.emit('trackpad:scroll', {
        delta: vSteps,
        source: 'trackpad'
      });
    }
  }

  function init() {
    window.addEventListener('wheel', onWheel, { passive: true });

    // The Q20 trackpad click arrives as a mouse click. Term49CX maps it to a
    // configurable key string (default `kent`, i.e. terminfo Enter); here it
    // activates whatever the shell has focused, which is the same intent for
    // a UI shell rather than a terminal emulator.
    window.addEventListener('click', function (e) {
      if (!enabled) return;
      const t = e.target;
      // Clicks that a control already handled should not also "enter".
      if (t && t.closest && t.closest('button, a, input, .desktop-card, .dock-item, .launcher-item, .shade-card, .ws-pill')) return;
      K.emit('trackpad:activate', { source: 'trackpad-click' });
    }, true);

    K.register('trackpad', { state: acc, reset, CONFIG });
    K.emit('trackpad:ready', {});
  }

  return { init, reset, state: acc, CONFIG };
})();