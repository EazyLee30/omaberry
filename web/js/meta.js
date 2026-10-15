/* OmaBerry Meta mode and Chinese input
 *
 * Meta mode follows Term49CX (QiQiFang/Term49CX): hold Space, or double-tap
 * Shift, to arm a layer where a few letters mean control keys instead of
 * themselves. The layer table below is Term49CX's, trimmed to what a desktop
 * shell rather than a terminal emulator can honour.
 *
 *   long-press Space / double-tap Shift   enter the layer
 *   e  t                                   one-shot  Esc, Tab
 *   h j k l                                sticky   cursor keys (vim order)
 *   a                                      toggle   fullscreen
 *   i                                      open the composer
 *   ?                                      show the key hints
 *
 * Why the composer is ours and not the BB10 IME
 * ---------------------------------------------
 * Term49CX opens the system IME with Cascades SystemPrompt + BPS. A page
 * inside content_shell has no equivalent: there is no platform input
 * context, no candidate window, and no way to hand composed text back to a
 * native widget (the same wall berrybrowser-cjk documents). So OmaBerry
 * composes Chinese itself and writes the result as UTF-8 down the PTY, where
 * BerryCore's shell echoes it and the CJK font renders it.
 *
 * The one thing that is genuinely shared with Term49CX: committed text goes
 * through io_write_utf8_string there, and through a UTF-8 PTY write here. If
 * the shell were not in a UTF-8 locale this would arrive as mojibake.
 */

'use strict';

window.OB = window.OB || {};

window.OB.Meta = (function () {
  const K = window.OB.Kernel;

  const state = {
    armed: false,
    // `open` is what says "the composer owns the keyboard". It cannot be
    // derived from `composing`, because composing is empty until the first
    // letter arrives -- gating on that makes the first letter unreachable.
    open: false,
    composing: '',
    candidates: [],
    index: 0,
    spaceDownAt: 0,
    lastShiftTapAt: 0
  };

  const KEYMAP = {
    // one-shot: the layer closes after firing
    e: { label: 'Esc', seq: '\x1b', sticky: false },
    t: { label: 'Tab', seq: '\t', sticky: false },
    // sticky: stay armed, so hjkl can be tapped repeatedly
    h: { label: '←', seq: '\x1b[D', sticky: true },
    j: { label: '↓', seq: '\x1b[B', sticky: true },
    k: { label: '↑', seq: '\x1b[A', sticky: true },
    l: { label: '→', seq: '\x1b[C', sticky: true }
  };

  const LONG_PRESS_MS = 450;
  const DOUBLE_TAP_MS = 450;

  function arm() {
    state.armed = true;
    document.body.classList.add('meta-armed');
    K.emit('meta:armed', {});
    render();
  }

  function disarm() {
    state.armed = false;
    document.body.classList.remove('meta-armed');
    K.emit('meta:disarmed', {});
  }

  function writeToShell(text) {
    const termInput = document.getElementById('term-input');
    if (termInput && document.activeElement === termInput) {
      termInput.value += text;
      termInput.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    // The PTY is the shell's stdin; sendRaw already appends nothing else.
    K.send('pty:write', { data: text });
  }

  function fire(entry) {
    if (!entry) return;
    if (entry.action === 'ime') {
      openComposer();
    } else if (entry.action === 'fullscreen') {
      K.emit('action:toggle-fullscreen', { source: 'meta' });
    } else {
      writeToShell(entry.seq);
    }
    if (!entry.sticky) disarm();
  }

  /* ── Composer ─────────────────────────────────────────────────── */

  function lookup(syllable) {
    const table = window.OB_PINYIN || {};
    const chars = table[syllable];
    return chars ? Array.from(chars) : [];
  }

  /* OB_WORDS is "ni hao|zhong guo|..." -- the head of a word-frequency list,
     stored as syllables so the composer never has to re-read characters. */
  let wordMap = null;
  function words() {
    if (wordMap === null) {
      wordMap = new Map();
      for (const entry of (window.OB_WORDS || '').split('|')) {
        if (!entry) continue;
        const eq = entry.indexOf('=');
        if (eq > 0) wordMap.set(entry.slice(0, eq), entry.slice(eq + 1));
      }
    }
    return wordMap;
  }

  /* Longest dictionary word that prefixes buf, as {len, chars}. The characters
     travel with the syllables: given "bei jing" the composer can emit 北京,
     but looking the flat "beijing" up in the syllable table finds nothing. */
  function matchWord(buf) {
    const map = words();
    if (!map.size) return null;

    // The buffer has no spaces in it (the user types "beijing", not "bei jing"),
    // so every way of cutting the prefix into 2 or 3 syllables has to be tried.
    // A two-syllable cut covers the whole prefix on its own; a three-syllable
    // cut needs a third boundary inside it.
    for (let len = buf.length; len >= 2; len--) {
      const pre = buf.slice(0, len);
      for (let a = 1; a < len; a++) {
        const two = pre.slice(0, a) + ' ' + pre.slice(a);
        if (map.has(two)) return { len: len, chars: map.get(two) };
        for (let b = a + 1; b < len; b++) {
          const three = two + ' ' + pre.slice(b);
          if (map.has(three)) return { len: len, chars: map.get(three) };
        }
      }
    }
    return 0;
  }

  /* Every proper prefix of every dictionary word, flattened.
   Without this, "beij" -- not yet a syllable and not yet a word, but the
   start of "beijing" -- gets committed as 北 before the rest of the word is
   typed. A buffer that can still grow into a word must never be committed. */
let prefixSet = null;
function prefixes() {
    if (prefixSet === null) {
      prefixSet = new Set();
      for (const sylls of words().keys()) {
        const flat = sylls.replace(/ /g, '');
        for (let i = 1; i < flat.length; i++) prefixSet.add(flat.slice(0, i));
      }
    }
    return prefixSet;
  }

  /* Length of the longest prefix of buf that is a known single syllable. */
  function longestSyllablePrefix(buf) {
    for (let n = buf.length; n >= 1; n--) {
      if (lookup(buf.slice(0, n)).length) return n;
    }
    return 0;
  }

  function render() {
    const el = document.getElementById('ime-bar');
    if (!el) return;
    if (!state.open) {
      el.classList.remove('open');
      return;
    }
    el.classList.add('open');
    const set = (id, text) => { const n = document.getElementById(id); if (n) n.textContent = text; };
    set('ime-pinyin', state.composing);
    const cur = state.candidates[state.index] || '';
    set('ime-candidate', cur);
    set('ime-candidates', state.candidates.slice(state.index, state.index + 12).join(' '));
    set('ime-count', state.candidates.length ? (state.index + 1) + '/' + state.candidates.length : '0/0');
  }

  /* Greedy longest-match over the syllable table.
   The table is keyed by single syllables, so without a segmenter a word like
   "nihao" never resolves: no character is read "nihao". Walk the buffer,
   commit the longest prefix that does resolve, keep the remainder, repeat.
   That is the whole of segmentation for a table this shape -- no word
   dictionary needed, and "zhongguo" becomes 中 + 国 the same way. */
function update() {
    let buf = state.composing;

    // A dictionary word beats syllable greed, or "shijibeijing" comes out as
    // 是其北经. Try the longest entry first; only fall back when nothing fits.
    let guard = 0;
    while (buf.length && guard++ < 16) {
      // Word first. If the whole buffer is a legal syllable we would stop
      // here and never notice that "bei" + "jing" spells a word, so the
      // dictionary has to be tried before the syllable lookup.
      const hit = matchWord(buf);
      if (hit) {
        writeToShell(hit.chars);
        buf = buf.slice(hit.len);
        continue;
      }

      const whole = lookup(buf);
      if (whole.length) {
        state.composing = buf;
        state.candidates = whole;
        state.index = 0;
        render();
        return;
      }

      const syl = longestSyllablePrefix(buf);
      if (syl > 0 && !prefixes().has(buf)) {
        writeToShell(lookup(buf.slice(0, syl))[0]);
        buf = buf.slice(syl);
        continue;
      }

      // Nothing resolves yet -- keep it visible so the user can see it.
      state.composing = buf;
      state.candidates = [];
      state.index = 0;
      render();
      return;
    }
    state.composing = '';
    state.candidates = [];
    state.index = 0;
    render();
  }

  function openComposer() {
    state.open = true;
    state.composing = '';
    state.candidates = [];
    state.index = 0;
    render();
    K.emit('ime:open', {});
  }

  function closeComposer() {
    state.open = false;
    state.composing = '';
    state.candidates = [];
    state.index = 0;
    render();
  }

  function commit() {
    const pick = state.candidates[state.index];
    if (!pick) { closeComposer(); return false; }
    writeToShell(pick);
    closeComposer();
    return true;
  }

  /* Commit one syllable and keep the composer open for the next word. */
function commitKeepOpen() {
    const pick = state.candidates[state.index];
    if (!pick) return false;
    writeToShell(pick);
    state.composing = '';
    state.candidates = [];
    state.index = 0;
    render();
    return true;
  }

  function cycle(delta) {
    if (!state.open || !state.candidates.length) return;
    state.index = (state.index + delta + state.candidates.length) % state.candidates.length;
    render();
  }

  function onComposerKey(e) {
    if (!state.open) return false;
    const k = e.key;
    if (k === 'Backspace') {
      state.composing = state.composing.slice(0, -1);
      if (!state.composing) { state.candidates = []; state.index = 0; }
      else update();
      render();
      return true;
    }
    if (k === 'Escape') { closeComposer(); return true; }
    if (k === 'Enter') { commit(); return true; }
    if (k === 'ArrowRight') { cycle(1); return true; }
    if (k === 'ArrowLeft') { cycle(-1); return true; }
    // Space commits the current syllable and keeps composing. On a phone
    // keyboard that is the interaction people already have in their fingers,
    // and it sidesteps the case where several syllables can spell different
    // words ("woshi" / "wo shi").
    if (k === ' ') { commitKeepOpen(); return true; }
    if (/^[a-z]$/.test(k)) { state.composing += k; update(); return true; }
    return false;
  }

  /* ── Key routing ──────────────────────────────────────────────── */

  function onKeyDown(e) {
    const now = Date.now();

    // Long-press Space arms the layer. The keydown itself is swallowed so a
    // stray space never lands in the shell, and the repeat that arrives while
    // the key is held does not re-arm or re-emit.
    if (e.key === ' ' && !e.repeat) {
      state.spaceDownAt = now;
      e.preventDefault();
      return true;
    }
    if (e.key === ' ' && e.repeat) {
      if (!state.armed && now - state.spaceDownAt >= LONG_PRESS_MS) arm();
      e.preventDefault();
      return true;
    }
    if (e.key === ' ' && !e.repeat && state.armed) { disarm(); return true; }

    if (e.key === 'Shift' && !state.armed) {
      if (now - state.lastShiftTapAt < DOUBLE_TAP_MS) arm();
      state.lastShiftTapAt = now;
      return false;
    }

    if (!state.armed) return onComposerKey(e);

    // Inside the layer every letter is a command.
    if (/^[a-z?]$/.test(e.key.toLowerCase())) {
      e.preventDefault();
      e.stopPropagation();
      const ch = e.key.toLowerCase();
      if (ch === 'i') fire({ action: 'ime' });
      else if (ch === 'a') fire({ action: 'fullscreen' });
      else if (ch === '?') { K.emit('meta:hints', {}); }
      else fire(KEYMAP[ch]);
      return true;
    }

    if (e.key === 'Escape') { e.preventDefault(); disarm(); return true; }
    return true;
  }

  function onKeyUp(e) {
    if (e.key !== ' ') return;
    // Short tap: let the space through as a space.
    if (!state.armed && Date.now() - state.spaceDownAt < LONG_PRESS_MS) {
      writeToShell(' ');
    }
  }

  function init() {
    // Capture phase, so the layer wins over the normal shortcut table.
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);

    // Trackpad: horizontal movement cycles candidates while composing.
    K.on('trackpad:workspace-next', function () { cycle(1); });
    K.on('trackpad:workspace-prev', function () { cycle(-1); });

    K.register('meta', { state, KEYMAP, arm, disarm, commit, cycle });
    K.emit('meta:ready', {});
  }

  return { init, state, arm, disarm, openComposer, commit, cycle, fire };
})();