import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../games/stick-and-swing/src/input.js';
import { DEFAULT_BINDINGS } from '../games/stick-and-swing/src/config.js';
class Element {
  constructor() { this.handlers = {}; this.style = {}; this.captures = new Set(); this.classList = { add() {}, remove() {} }; }
  addEventListener(type, fn) { (this.handlers[type] ||= []).push(fn); }
  fire(type, props = {}) { const event = { preventDefault() {}, target: { tagName: 'CANVAS' }, pointerType: 'touch', ...props }; for (const fn of this.handlers[type] || []) fn(event); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 116, height: 116 }; }
  setPointerCapture(id) { this.captures.add(id); }
  hasPointerCapture(id) { return this.captures.has(id); }
  releasePointerCapture(id) { this.captures.delete(id); this.fire('lostpointercapture', { pointerId: id }); }
  focus() {}
}
function platform() {
  const elements = new Map(['joystick', 'stick-thumb', 'touch-attack', 'touch-guard', 'touch-dash', 'touch-ability'].map(id => [id, new Element()]));
  globalThis.window = new Element();
  globalThis.document = { getElementById: id => elements.get(id), querySelectorAll: () => [] };
  return elements;
}
test('touch cancellation releases held attacks, guard, and movement', () => {
  const el = platform(), input = new Input(new Element(), () => true, () => {}, () => {});
  el.get('joystick').fire('pointerdown', { pointerId: 1, clientX: 94, clientY: 51 });
  el.get('touch-attack').fire('pointerdown', { pointerId: 2 });
  el.get('touch-guard').fire('pointerdown', { pointerId: 3 });
  assert.equal(input.sample().moveX, 1); assert.equal(input.sample().attackHeld, true); assert.equal(input.sample().guardHeld, true);
  el.get('touch-attack').fire('pointercancel', { pointerId: 2 }); assert.equal(input.sample().attackHeld, false);
  input.clear(); assert.equal(input.sample().moveX, 0); assert.equal(input.sample().guardHeld, false);
  el.get('joystick').fire('pointerdown', { pointerId: 4, clientX: 22, clientY: 51 }); assert.equal(input.sample().moveX, -1);
});

test('remapped abilities keep buffered edges and arrows assigned to actions no longer move', () => {
  platform(); const settings = { bindings: { ...DEFAULT_BINDINGS, ability: 'KeyE', guard: 'ArrowDown' } }, input = new Input(new Element(), () => true, () => {}, () => {}, settings);
  window.fire('keydown', { code: 'KeyQ', repeat: false }); assert.equal(input.sample().abilityPressed, false);
  window.fire('keydown', { code: 'KeyE', repeat: false }); assert.equal(input.sample(true, false).abilityPressed, true); assert.equal(input.sample().abilityPressed, true); assert.equal(input.sample().abilityPressed, false);
  window.fire('keydown', { code: 'ArrowDown', repeat: false }); assert.equal(input.sample().guardHeld, true); assert.equal(input.sample().moveY, 0);
});

test('scaled touch controls use their visible center and Ability is a single press', () => {
  const el = platform(), stick = el.get('joystick'); stick.getBoundingClientRect = () => ({ left: 0, top: 0, width: 122.4, height: 139.2 });
  const input = new Input(new Element(), () => true, () => {}, () => {});
  stick.fire('pointerdown', { pointerId: 8, clientX: 104.4, clientY: 61.2 }); assert.ok(Math.abs(input.sample().moveX - 1) < .00001); assert.ok(Math.abs(input.sample().moveY) < .00001);
  el.get('touch-ability').fire('pointerdown', { pointerId: 9 }); assert.equal(input.sample().abilityPressed, true); assert.equal(input.sample().abilityPressed, false);
  input.clear(); assert.equal(input.sample().moveX, 0);
});

test('standard controllers supply movement, aiming, attack edges and pause on disconnect', () => {
  platform(); let paused = 0, pad = { connected: true, mapping: 'standard', axes: [.7, 0, 0, -1], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [null, pad] } });
  const input = new Input(new Element(), () => true, () => paused++, () => {}); pad.buttons[3].pressed = true; pad.buttons[2].pressed = true;
  input.pollGamepad(); let sample = input.sample(true, true, { x: 200, y: 250 }); assert.equal(sample.moveX, .7); assert.equal(sample.aimX, 200); assert.equal(sample.aimY, 150); assert.equal(sample.abilityPressed, true); assert.equal(sample.attackPressed, true);
  input.pollGamepad(); assert.equal(input.sample().abilityPressed, false); assert.equal(input.sample().attackHeld, true);
  pad = null; input.pollGamepad(); assert.equal(paused, 1); assert.equal(input.sample().attackHeld, false); assert.equal(input.sample().moveX, 0);
});
test('keyboard edges are buffered across hit-stop and Space enables aim assist', () => {
  platform(); const canvas = new Element(), input = new Input(canvas, () => true, () => {}, () => {});
  canvas.fire('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 40 }); assert.equal(input.sample().autoAim, false);
  window.fire('keydown', { code: 'Space', repeat: false });
  assert.equal(input.sample(true, false).attackPressed, true); assert.equal(input.sample(true, false).attackPressed, true);
  assert.equal(input.sample().attackPressed, true); assert.equal(input.sample().attackPressed, false); assert.equal(input.sample().autoAim, true);
  window.fire('keyup', { code: 'Space' }); assert.equal(input.sample().attackHeld, false);
  window.fire('keydown', { code: 'ShiftLeft', repeat: false }); assert.equal(input.sample().dashPressed, true); assert.equal(input.sample().dashPressed, false);
});
test('gameplay shortcuts do not steal keyboard activation from page buttons', () => {
  platform(); const input = new Input(new Element(), () => true, () => {}, () => {});
  window.fire('keydown', { code: 'Space', repeat: false, target: { tagName: 'BUTTON' } });
  assert.equal(input.sample().attackPressed, false); assert.equal(input.sample().attackHeld, false);
});

test('a stationary mouse click aims at its actual position and cancellation releases it', () => {
  platform(); const canvas = new Element(), input = new Input(canvas, () => true, () => {}, () => {});
  canvas.fire('pointerdown', { pointerType: 'mouse', button: 0, clientX: 58, clientY: 58 });
  assert.equal(input.sample().aimX, 480); assert.equal(input.sample().aimY, 300);
  assert.equal(input.sample().attackHeld, true); window.fire('pointercancel', { pointerType: 'mouse' }); assert.equal(input.sample().attackHeld, false);
});
