import test from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../games/stick-and-swing/src/input.js';
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
  const elements = new Map(['joystick', 'stick-thumb', 'touch-attack', 'touch-guard', 'touch-dash'].map(id => [id, new Element()]));
  globalThis.window = new Element();
  globalThis.document = { getElementById: id => elements.get(id), querySelectorAll: () => [] };
  return elements;
}
test('touch cancellation releases held attacks, guard, and movement', () => {
  const el = platform(), input = new Input(new Element(), () => true, () => {}, () => {});
  el.get('joystick').fire('pointerdown', { pointerId: 1, clientX: 94, clientY: 58 });
  el.get('touch-attack').fire('pointerdown', { pointerId: 2 });
  el.get('touch-guard').fire('pointerdown', { pointerId: 3 });
  assert.equal(input.sample().moveX, 1); assert.equal(input.sample().attackHeld, true); assert.equal(input.sample().guardHeld, true);
  el.get('touch-attack').fire('pointercancel', { pointerId: 2 }); assert.equal(input.sample().attackHeld, false);
  input.clear(); assert.equal(input.sample().moveX, 0); assert.equal(input.sample().guardHeld, false);
  el.get('joystick').fire('pointerdown', { pointerId: 4, clientX: 22, clientY: 58 }); assert.equal(input.sample().moveX, -1);
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
