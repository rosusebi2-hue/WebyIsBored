import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../games/stick-and-swing/src/engine.js?v=2.1.0';

// Test the actual menu/controller integration with minimal platform doubles.
// This does not launch a browser or verify layout, pointer targeting, or pixels.
test('the UI completes weapon selection, pause/settings/build, rewards, shopping, recovery and victory', async () => {
  const values = new Map([['weby.stickSwing.profile.v2', JSON.stringify({ tutorialDone: true })]]);
  const callbacks = [];
  const context = new Proxy({}, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop() {} });
    return (...args) => { assert.ok(args.every(x => typeof x !== 'number' || Number.isFinite(x)), `Non-finite Canvas argument: ${String(key)}`); };
  } });
  class Element {
    constructor(tagName = 'div') {
      this.tagName = tagName.toUpperCase(); this.children = []; this.events = {}; this.className = ''; this.hidden = false; this.disabled = false;
      this.style = { setProperty() {} }; this.dataset = {}; this.attributes = {}; this.captures = new Set();
      this.classList = { add: x => this.setClass(x, true), remove: x => this.setClass(x, false), toggle: (x, on) => this.setClass(x, on) };
    }
    setClass(x, on) { const c = new Set(this.className.split(' ')); on ? c.add(x) : c.delete(x); this.className = [...c].join(' '); }
    set textContent(value) { this.ownText = String(value); this.children = []; }
    get textContent() { return (this.ownText || '') + this.children.map(c => c.textContent).join(' '); }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.ownText = ''; this.children = [...children]; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    fire(type, props = {}) { if (type === 'click' && this.disabled) return; for (const fn of this.events[type] || []) fn({ target: this, preventDefault() {}, ...props }); }
    setAttribute(key, value) { this.attributes[key] = value; }
    removeAttribute(key) { delete this.attributes[key]; }
    all() { return this.children.flatMap(c => [c, ...c.all()]); }
    querySelector() { return this.all().find(e => ['BUTTON', 'A', 'INPUT'].includes(e.tagName) && !e.disabled); }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, width: 960, height: 600 }; }
    getContext() { return context; }
    setPointerCapture(id) { this.captures.add(id); }
    hasPointerCapture(id) { return this.captures.has(id); }
    releasePointerCapture(id) { this.captures.delete(id); }
    get isConnected() { return true; }
  }
  const html = readFileSync(new URL('../games/stick-and-swing/index.html', import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"/g)].map(m => [m[2], new Element(m[1])]));
  elements.get('room-progress').children = Array.from({ length: 8 }, () => new Element('li'));
  globalThis.window = new Element(); window.localStorage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; window.devicePixelRatio = 1;
  globalThis.document = new Element(); document.body = new Element('body'); document.activeElement = document.body; document.hidden = false;
  document.createElement = tag => new Element(tag); document.getElementById = id => elements.get(id); document.querySelectorAll = () => [];
  globalThis.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.requestAnimationFrame = fn => callbacks.push(fn);
  let game;
  const start = Game.prototype.startNew;
  Game.prototype.startNew = function (...args) { game = this; return start.apply(this, args); };
  try {
    await import('../games/stick-and-swing/src/app.js?v=2.1.0');
    const dialog = elements.get('game-dialog'), inner = elements.get('dialog-inner');
    const click = label => { const b = inner.all().find(e => e.tagName === 'BUTTON' && !e.disabled && e.textContent.includes(label)); assert.ok(b, `No usable button: ${label} in ${dialog.dataset.view}`); b.fire('click'); };
    let now = performance.now();
    function frames(n = 1) { for (let i = 0; i < n; i++) { now += 1000 / 60; const batch = callbacks.splice(0); batch.forEach(fn => fn(now)); } }
    assert.equal(dialog.dataset.view, 'title'); assert.equal(document.body.children.length, 0, 'Startup fallback was shown');
    click('Choose your weapon'); assert.equal(dialog.dataset.view, 'weapons'); click('Pagebreaker');
    assert.equal(dialog.dataset.view, 'route'); assert.equal(game.weapon, 'pagebreaker');
    click('The first line'); assert.equal(dialog.dataset.view, 'story'); click('Continue'); frames(); assert.equal(game.mode, 'combat'); assert.equal(dialog.open, false);
    elements.get('pause-button').fire('click'); assert.equal(dialog.dataset.view, 'paused');
    click('Settings & controls'); assert.equal(dialog.dataset.view, 'settings'); click('Back');
    click('Your build'); assert.equal(dialog.dataset.view, 'build'); click('Back'); click('Back to the fight'); frames();
    assert.equal(game.mode, 'combat'); window.fire('blur'); assert.equal(game.mode, 'paused'); click('Back to the fight');
    let bought = false, rested = false;
    for (let guard = 0; game.mode !== 'victory' && guard < 50; guard++) {
      if (game.mode === 'combat') {
        for (const e of game.enemies) { e.spawn = 0; game.hurtEnemy(e, 10000, 0, 'test'); }
        frames(84);
      } else if (game.mode === 'reward') {
        const card = inner.all().find(e => e.tagName === 'BUTTON' && e.className === 'upgrade-card'); assert.ok(card); card.fire('click'); frames();
      } else if (game.mode === 'route') {
        const options = game.routeOptions();
        const id = options.includes('last-rest') ? 'last-rest' : options[0];
        const cards = inner.all().filter(e => e.tagName === 'BUTTON' && e.className.includes('route-card'));
        cards[options.indexOf(id)].fire('click'); frames();
      } else if (game.mode === 'story') { click('Continue'); frames(); }
      else if (game.mode === 'shop') {
        const card = inner.all().find(e => e.tagName === 'BUTTON' && e.className.includes('shop-card') && !e.disabled);
        if (card) { card.fire('click'); bought = true; assert.equal(JSON.parse(values.get('weby.stickSwing.run.v3')).phase, 'shop'); }
        click('Continue the adventure'); frames();
      } else if (game.mode === 'rest') { click('Rest & continue'); rested = true; frames(); }
      else assert.fail(`Unexpected mode ${game.mode}`);
    }
    assert.equal(game.mode, 'victory'); assert.equal(dialog.dataset.view, 'victory'); assert.ok(bought && rested);
    assert.equal(values.has('weby.stickSwing.run.v3'), false); assert.equal(JSON.parse(values.get('weby.stickSwing.profile.v2')).adventureWins, 1);
    click('Draw another adventure'); assert.equal(dialog.dataset.view, 'weapons');
  } finally { Game.prototype.startNew = start; }
});
