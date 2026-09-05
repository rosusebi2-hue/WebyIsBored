import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as config from '../games/stick-and-swing/src/config.js';
const read = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
// Small platform doubles exercise localization logic without launching a browser.
class Element {
  constructor(tag = 'div') { this.nodeType = 1; this.tagName = tag.toUpperCase(); this.childNodes = []; this.attrs = {}; this.dataset = {}; this.handlers = {}; }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.childNodes.push(node); } }
  get firstChild() { return this.childNodes[0]; }
  get textContent() { return this.childNodes.map(n => n.nodeValue ?? n.textContent).join(''); }
  set textContent(value) { this.childNodes = [{ nodeType: 3, nodeValue: String(value), parentElement: this }]; }
  getAttribute(key) { return this.attrs[key] ?? null; }
  setAttribute(key, value) { this.attrs[key] = value; }
  matches() { return ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'KBD'].includes(this.tagName) || this.dataset.noI18n !== undefined; }
  closest() { return this.matches() ? this : this.parentElement?.closest(); }
  addEventListener(name, fn) { this.handlers[name] = fn; }
}
function platform({ language, saved, blocked = false } = {}) {
  const data = new Map(saved ? [['weby.language', saved]] : []), root = new Element('html'), notifications = [];
  const document = { readyState: 'loading', baseURI: 'https://webyisbored.com/news/', documentElement: root, addEventListener() {}, createElement: tag => new Element(tag), querySelectorAll: () => [] };
  const context = { URL, Intl, document, location: { href: `https://webyisbored.com/news/${language ? `?lang=${language}` : ''}`, origin: 'https://webyisbored.com' }, localStorage: { getItem(k) { if (blocked) throw Error('denied'); return data.get(k); }, setItem(k, v) { if (blocked) throw Error('denied'); data.set(k, v); } }, history: { replaceState(_a, _b, url) { context.location.href = String(url); } }, window: { dispatchEvent: e => notifications.push(e.detail.locale) }, CustomEvent: class { constructor(name, options) { this.type = name; this.detail = options.detail; } } };
  vm.createContext(context); vm.runInContext(read('assets/i18n/catalog.js'), context); vm.runInContext(read('assets/i18n/i18n.js'), context);
  return { api: context.WebyI18n, rows: context.WEBY_TRANSLATIONS, root, data, context, notifications };
}
test('six complete language columns preserve parameters and contain no duplicate source keys', () => {
  const { rows, api } = platform(), keys = new Set(); assert.deepEqual(Object.keys(api.languages), ['en', 'de', 'fr', 'es', 'ro', 'ru']);
  for (const row of rows) {
    assert.equal(row.length, 6); assert.equal(keys.has(row[0]), false, row[0]); keys.add(row[0]);
    const placeholders = row[0].match(/\{\w+\}/g)?.sort() || [];
    for (const value of row) { assert.ok(value.trim()); assert.deepEqual(value.match(/\{\w+\}/g)?.sort() || [], placeholders, row[0]); }
  }
});
test('English is the default; saved choices and language links persist even when storage is unavailable', () => {
  assert.equal(platform().api.locale, 'en'); assert.equal(platform({ saved: 'ru' }).api.locale, 'ru');
  assert.equal(platform({ saved: 'fr', language: 'de' }).api.locale, 'de'); assert.equal(platform({ language: 'invalid', saved: 'es' }).api.locale, 'es');
  const { api, context, data, root, notifications } = platform(); assert.equal(api.setLanguage('ro'), true); assert.equal(data.get('weby.language'), 'ro'); assert.equal(root.lang, 'ro'); assert.match(context.location.href, /lang=ro/); assert.deepEqual(notifications, ['ro']);
  assert.equal(api.setLanguage('xx'), false); assert.equal(api.locale, 'ro'); api.setLanguage('en'); assert.doesNotMatch(context.location.href, /lang=/);
  const denied = platform({ language: 'de', blocked: true }); assert.equal(denied.api.locale, 'de'); assert.doesNotThrow(() => denied.api.setLanguage('ru'));
  const link = new Element('a'); link.setAttribute('href', '../coming-soon/#future'); denied.root.append(link); denied.api.translateDOM(); assert.equal(link.getAttribute('href'), '/coming-soon/?lang=ru#future');
});
test('dynamic combat labels translate numbers, names and compound rewards', () => {
  const { api } = platform({ language: 'de' });
  assert.equal(api.t('STOP 9 / 12'), 'STATION 9 / 12'); assert.equal(api.t('Wave 2 / 3'), 'WELLE 2 / 3');
  assert.equal(api.t('1 wave · 50 ink · a gift + 16 health'), '1 Welle · 50 Tinte · eine Gabe + 16 Leben');
  assert.equal(api.t('Continue · The final margin'), 'Fortsetzen · Der letzte Rand');
  assert.equal(api.t('Reward: {0}', { 0: api.t('Master’s scarf') }), 'Belohnung: Meisterschal');
  api.setLanguage('en'); assert.equal(api.t('An unfinished world.\nA story of your own.'), 'An unfinished world.\nA story of your own.');
});
test('static and dynamic text, accessible labels, dates and links can switch back and forth', () => {
  const { api, root } = platform(), heading = new Element('h2'), link = new Element('a'), date = new Element('time'), code = new Element('pre');
  heading.textContent = ' News '; link.textContent = 'Coming soon'; link.setAttribute('href', '../coming-soon/'); link.setAttribute('aria-label', 'Main navigation'); date.dateTime = '2026-09-05'; date.textContent = '5 September 2026'; code.textContent = 'News'; root.append(heading, link, date, code);
  api.setLanguage('de'); assert.equal(heading.textContent, ' Neuigkeiten '); assert.equal(link.getAttribute('aria-label'), 'Hauptnavigation'); assert.equal(link.getAttribute('href'), '/coming-soon/?lang=de'); assert.equal(code.textContent, 'News');
  api.setText(heading, 'Your build'); assert.equal(heading.textContent, 'Dein Build'); api.setLanguage('fr'); assert.equal(heading.textContent, 'Ta configuration'); assert.equal(link.textContent, 'Bientôt'); assert.match(date.textContent, /septembre/);
  api.setLanguage('en'); assert.equal(heading.textContent, 'Your build'); assert.equal(link.textContent, 'Coming soon'); assert.equal(link.getAttribute('aria-label'), 'Main navigation'); assert.equal(link.getAttribute('href'), '/coming-soon/');
});
test('every game description, story, gift, mastery task, event and journal entry is in the shared catalog', () => {
  const { rows } = platform(), keys = new Set(rows.map(row => row[0].replace(/\s+/g, ' ').trim().toLowerCase()));
  const fields = new Set(['name', 'tag', 'description', 'detail', 'title', 'text', 'note', 'speaker', 'outro', 'label', 'alternate', 'alternateDescription']);
  const check = value => assert.ok(keys.has(value.toLowerCase()) || ['scrapsteel', 'pagebreaker', 'emberbrand'].includes(value.toLowerCase()), `Untranslated: ${value}`);
  function walk(value) { for (const [key, child] of Object.entries(value || {})) { if (fields.has(key) && typeof child === 'string') check(child); else if (child && typeof child === 'object') walk(child); } }
  for (const name of ['WEAPONS', 'ENEMIES', 'NODES', 'LAYOUTS', 'UPGRADES', 'SHOP_HEAL', 'LESSONS', 'ABILITIES', 'FINISHERS', 'MASTERIES', 'SYNERGIES', 'EVENTS']) walk(config[name]);
  for (const entry of Object.values(config.JOURNAL)) check(entry);
});
test('all current and archived news is translated, with separate website and game announcements', () => {
  const { rows } = platform(), keys = new Set(rows.map(row => row[0])), posts = JSON.parse(read('assets/hub/news.json'));
  for (const post of posts) for (const value of [post.type, post.title, post.summary, post.linkLabel, ...post.sections.flatMap(s => [s.title, s.paragraph, ...(s.items || [])])].filter(Boolean)) assert.ok(keys.has(value), `Untranslated news: ${value}`);
  assert.equal(posts.find(p => p.id === 'website-languages').game, 'WebyIsBored'); assert.equal(posts.find(p => p.id === 'stick-and-swing-2-2').version, '2.2');
  for (const path of ['index.html', 'news/index.html', 'coming-soon/index.html', 'games/stick-and-swing/index.html']) {
    const html = read(path); assert.match(html, /data-language-slot/); assert.match(html, /i18n\/catalog\.js\?v=1\.1\.0/); assert.ok(html.indexOf('i18n/catalog.js') < html.indexOf('i18n/i18n.js'));
  }
});
