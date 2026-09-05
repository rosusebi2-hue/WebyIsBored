import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
const root = fileURLToPath(new URL('../', import.meta.url));
const pages = ['index.html', 'news/index.html', 'coming-soon/index.html', 'games/stick-and-swing/index.html'];
const read = path => readFileSync(resolve(root, path), 'utf8');
const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);

test('all four routes and their local assets, navigation, and anchors exist', () => {
  for (const page of pages) {
    const html = read(page), values = ids(html);
    assert.equal(new Set(values).size, values.length, `Duplicate ID in ${page}`);
    assert.match(html, /<title>[^<]+<\/title>/); assert.match(html, /<html lang="en">/);
    for (const [, ref] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (/^(https?:|data:|mailto:)/.test(ref)) continue;
      const [path, fragment] = ref.split('#');
      let local = path ? resolve(dirname(resolve(root, page)), path.split('?')[0]) : resolve(root, page);
      assert.ok(!relative(root, local).startsWith('..'), `Asset escaped project: ${ref}`);
      assert.ok(existsSync(local), `${page} -> missing ${ref}`);
      if (statSync(local).isDirectory()) local = resolve(local, 'index.html');
      assert.ok(existsSync(local), `${page} -> directory without index: ${ref}`);
      if (fragment && local.endsWith('.html')) assert.ok(ids(readFileSync(local, 'utf8')).includes(fragment), `${page} -> missing #${fragment}`);
    }
  }
});

test('navigation uses separate News and Coming Soon routes on every hub page', () => {
  for (const page of pages.slice(0, 3)) {
    const nav = read(page).match(/<nav[\s\S]*?<\/nav>/)[0];
    assert.match(nav, /href="(?:\.\.\/)?news\/"/); assert.match(nav, /href="(?:\.\.\/)?coming-soon\/"/);
    assert.equal((nav.match(/aria-current="page"/g) || []).length, 1);
    assert.doesNotMatch(nav, /href="#coming-soon"/);
  }
  assert.doesNotMatch(read('index.html'), /<section class="upcoming-section"/);
});

test('the playable catalog points at the replacement and placeholders have no fake games', () => {
  const context = { window: {} }; vm.runInNewContext(read('assets/hub/games.js'), context);
  const games = context.window.WEBY_GAMES;
  assert.equal(games.filter(g => g.status === 'playable').length, 1);
  assert.equal(games.filter(g => g.status === 'coming-soon').length, 3);
  assert.equal(new Set(games.map(g => g.id)).size, games.length);
  for (const g of games) {
    if (g.status === 'playable') assert.ok(existsSync(resolve(root, g.href, 'index.html')));
    else assert.equal(g.href, undefined);
  }
  for (const obsolete of ['js/game.js', 'css/style.css', 'stick-and-swing-cinematic-story', 'assets/hub/game-nav.css']) assert.equal(existsSync(resolve(root, obsolete)), false, `Obsolete ${obsolete} still exists`);
});

test('news is readable without scripts and matches its editable source', () => {
  const posts = JSON.parse(read('assets/hub/news.json')), page = read('news/index.html');
  assert.equal((page.match(/<article /g) || []).length, posts.length);
  assert.equal(new Set(posts.map(p => p.id)).size, posts.length);
  assert.equal(posts[0].version, '2.0');
  for (const post of posts) { assert.ok(page.includes(`id="${post.id}"`)); assert.ok(page.includes(post.title)); }
  const before = page;
  execFileSync(process.execPath, ['scripts/build-news.mjs'], { cwd: root });
  assert.equal(read('news/index.html'), before, 'Regenerate the news page before committing.');
});

test('game modules compile, imports resolve, and all app element references exist', () => {
  const src = resolve(root, 'games/stick-and-swing/src'), gameIds = new Set(ids(read('games/stick-and-swing/index.html')));
  for (const name of readdirSync(src).filter(n => n.endsWith('.js'))) {
    const file = resolve(src, name), source = readFileSync(file, 'utf8');
    execFileSync(process.execPath, ['--check', file]);
    for (const [, path] of source.matchAll(/from ['"](\.[^'"]+)['"]/g)) assert.ok(existsSync(resolve(src, path)));
    for (const [, id] of source.matchAll(/(?:\$|getElementById)\(['"]([^'"]+)['"]\)/g)) assert.ok(gameIds.has(id), `${name}: missing element #${id}`);
  }
  execFileSync(process.execPath, ['--check', resolve(root, 'assets/hub/hub.js')]);
});
