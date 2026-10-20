import { Transpiler } from 'bun';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const source = readFileSync(fileURLToPath(new URL('../native/src/typed-text.ts', import.meta.url)), 'utf8')
  .replace(/^import .*;\n/gm, '').replace('export function', 'function');
const js = new Transpiler({ loader: 'ts' }).transformSync(source);
const callbacks: Array<() => void> = [];
let queue: string[] = [];
const reports: unknown[] = [];
const createTypedText = vm.runInNewContext(js + '\ncreateTypedText;', {
  createSignal: (value: string) => [() => value, (next: string) => { value = next; }],
  textConsume: () => { const chunk = queue; queue = []; return chunk; },
  onFrame: (callback: () => void) => callbacks.push(callback),
  reportAppAction: (...args: unknown[]) => reports.push(args),
});
const field = createTypedText(8);
field.start(); field.start();
assert.equal(callbacks.length, 1, 'mount registers one frame callback and returns');
queue = ['a', ' ', 'b']; assert.equal(field.typed(), ''); callbacks[0]();
assert.equal(field.typed(), 'a b');
queue = ['\b']; callbacks[0](); assert.equal(field.typed(), 'a ');
queue = ['😀', '\b']; callbacks[0](); assert.equal(field.typed(), 'a ');
queue = ['中', '\n', '文']; callbacks[0](); assert.equal(field.typed(), 'a 中 文');
queue = ['123456😀x']; callbacks[0]();
assert.equal(field.typed(), '23456😀x');
assert.equal(field.typed().charCodeAt(0) >= 0xDC00 && field.typed().charCodeAt(0) <= 0xDFFF, false);
assert.equal(reports.length, 5);
console.log('✓ Native guest: mount returns, frame input, spaces, Unicode backspace, bounded buffer');

// Exercise the real wrapper between the C frame entry and the guest latch.
const devtools = readFileSync(fileURLToPath(new URL('../.cache/pocketjs/framework/src/devtools.ts', import.meta.url)), 'utf8');
const start = devtools.indexOf('export function wrapFrameHandler(');
const end = devtools.indexOf('\n// tape\n', start);
const wrapperSource = devtools.slice(start, end).replace('export function', 'function');
const state = { hostCalls: 0, frame: 0, transport: null, replayMasks: null, paused: false };
const wrap = vm.runInNewContext(new Transpiler({ loader: 'ts' }).transformSync(wrapperSource) + '\nwrapFrameHandler;', {
  state, ANALOG_CENTER: 32896, EMPTY_AXIS_DELTAS: [], __takeAxisDeltas: (value: unknown) => value,
  __takeMotionState: (value: unknown) => value, recordMask() {},
});
let seen: unknown[] = [];
const wrapped = wrap((...args: unknown[]) => { seen = args; });
wrapped(0, undefined, undefined, undefined, undefined, undefined, undefined, undefined, ['a', ' ', '\b']);
assert.deepEqual(seen[8], ['a', ' ', '\b'], 'devtools must forward argument 9');
console.log('✓ Native frame wrapper forwards the ninth text argument');

Object.assign(state, { replayMasks: [0], replayAt: 0 });
wrapped(0, undefined, undefined, undefined, undefined, undefined, undefined, undefined, ['live']);
assert.equal(seen[8], undefined, 'live text must not leak into an existing input replay');
console.log('✓ Native replay suppresses unrecorded live keyboard text');

let editing = false;
const notes = createTypedText(160, () => editing, false);
notes.start();
queue = ['ignored']; callbacks[1](); assert.equal(notes.typed(), '');
editing = true; queue = ['a', ' ', 'b', '\b']; callbacks[1](); assert.equal(notes.typed(), 'a ');
queue = ['\n']; callbacks[1](); assert.equal(notes.typed(), 'a ', 'Enter navigates without inserting text');
notes.clear(); assert.equal(notes.typed(), '');
console.log('✓ Native notes: page-gated input, space/backspace, Enter navigation, Clear');
