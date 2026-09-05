import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../games/stick-and-swing/src/engine.js?v=2.2.0';

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
    getAttribute(key) { return this.attributes[key] ?? null; }
    get childNodes() { return this.children; }
    matches() { return false; }
    dispatchEvent(event) { this.fire(event.type, event); }
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
  elements.get('room-progress').children = Array.from({ length: 12 }, () => new Element('li'));
  globalThis.window = new Element(); window.localStorage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) }; window.devicePixelRatio = 1;
  globalThis.document = new Element(); document.body = new Element('body'); document.activeElement = document.body; document.hidden = false;
  document.readyState = 'loading'; document.documentElement = new Element('html'); document.documentElement.nodeType = 1;
  globalThis.location = { href: 'https://webyisbored.com/games/stick-and-swing/', origin: 'https://webyisbored.com' }; document.baseURI = location.href;
  globalThis.localStorage = window.localStorage; globalThis.history = { replaceState() {} }; globalThis.CustomEvent = class { constructor(type, props) { this.type = type; Object.assign(this, props); } };
  document.createElement = tag => new Element(tag); document.getElementById = id => elements.get(id); document.querySelectorAll = () => [];
  globalThis.matchMedia = window.matchMedia = () => ({ matches: false, addEventListener() {} });
  globalThis.ResizeObserver = class { observe() {} };
  globalThis.requestAnimationFrame = fn => callbacks.push(fn);
  let game;
  const start = Game.prototype.startNew;
  Game.prototype.startNew = function (...args) { game = this; return start.apply(this, args); };
  try {
    await import('../assets/i18n/catalog.js?integration');
    await import('../assets/i18n/i18n.js?integration');
    await import('../games/stick-and-swing/src/app.js?v=2.2.0');
    const dialog = elements.get('game-dialog'), inner = elements.get('dialog-inner');
    const click = label => { const b = inner.all().find(e => e.tagName === 'BUTTON' && !e.disabled && e.textContent.includes(label)); assert.ok(b, `No usable button: ${label} in ${dialog.dataset.view}`); b.fire('click'); };
    let now = performance.now();
    function frames(n = 1) { for (let i = 0; i < n; i++) { now += 1000 / 60; const batch = callbacks.splice(0); batch.forEach(fn => fn(now)); } }
    assert.equal(dialog.dataset.view, 'title'); assert.equal(document.body.children.length, 0, 'Startup fallback was shown');
    WebyI18n.setLanguage('de'); assert.ok(inner.textContent.includes('Wähle deine Waffe')); WebyI18n.setLanguage('en');
    click('Choose your weapon'); assert.equal(dialog.dataset.view, 'weapons'); click('Pagebreaker');
    assert.equal(dialog.dataset.view, 'route'); assert.equal(game.weapon, 'pagebreaker');
    click('The first line'); assert.equal(dialog.dataset.view, 'story'); click('Continue'); frames(); assert.equal(game.mode, 'combat'); assert.equal(dialog.open, false);
    const pathBeforeLanguage = [...game.path], buildBeforeLanguage = [...game.upgrades];
    WebyI18n.setLanguage('de'); assert.equal(game.mode, 'paused'); assert.deepEqual(game.path, pathBeforeLanguage); assert.deepEqual(game.upgrades, buildBeforeLanguage); assert.ok(inner.textContent.includes('Die Seite kann warten.'));
    WebyI18n.setLanguage('en'); click('Back to the fight');
    elements.get('pause-button').fire('click'); assert.equal(dialog.dataset.view, 'paused');
    click('Settings & controls'); assert.equal(dialog.dataset.view, 'settings'); click('Back');
    click('Your build'); assert.equal(dialog.dataset.view, 'build'); click('Back'); click('Back to the fight'); frames();
    assert.equal(game.mode, 'combat'); window.fire('blur'); assert.equal(game.mode, 'paused'); click('Back to the fight');
    let bought = false, rested = false;
    for (let guard = 0; game.mode !== 'victory' && guard < 90; guard++) {
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
        if (card) { card.fire('click'); bought = true; assert.equal(JSON.parse(values.get('weby.stickSwing.state.v4')).run.phase, 'shop'); }
        click('Continue the adventure'); frames();
      } else if (game.mode === 'rest') { click('Rest & continue'); rested = true; frames(); }
      else if (game.mode === 'event') { const b = inner.all().filter(e => e.tagName === 'BUTTON' && e.className === 'event-choice' && !e.disabled).at(-1); b.fire('click'); frames(); }
      else assert.fail(`Unexpected mode ${game.mode}`);
    }
    assert.equal(game.mode, 'victory'); assert.equal(dialog.dataset.view, 'victory'); assert.ok(bought && rested);
    assert.equal(JSON.parse(values.get('weby.stickSwing.state.v4')).run, null); assert.equal(JSON.parse(values.get('weby.stickSwing.state.v4')).profile.bookWins, 1);
    click('Title screen'); assert.equal(dialog.dataset.view, 'title');
    click('Workshop'); assert.equal(dialog.dataset.view, 'workshop'); assert.ok(inner.textContent.includes('Mastery carries')); click('Back');
    click('Journal'); assert.equal(dialog.dataset.view, 'journal'); assert.ok(inner.textContent.includes('The Margin Knight')); click('Back');
    click('Recent runs'); assert.equal(dialog.dataset.view, 'history'); assert.ok(inner.textContent.includes('Victory')); click('Back');
    click('Practice arena'); assert.equal(dialog.dataset.view, 'practice'); click('Enter practice'); frames(); assert.equal(game.runMode, 'practice');
    for (const e of game.enemies) { e.spawn = 0; game.hurtEnemy(e, 10000, 0, 'test'); } frames(84); assert.equal(dialog.dataset.view, 'practiceResult');
    click('Title screen'); click('Boss Rush'); assert.equal(dialog.dataset.view, 'weapons'); click('Pagebreaker'); assert.equal(game.runMode, 'rush'); assert.equal(game.route.length, 3); assert.equal(dialog.dataset.view, 'route');
  } finally { Game.prototype.startNew = start; }
});
