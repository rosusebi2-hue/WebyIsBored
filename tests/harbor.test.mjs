import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, idleInput } from '../games/stick-and-swing/src/engine.js';
import { SaveStore, validateCheckpoint } from '../games/stick-and-swing/src/storage.js';
import { HARBOR_ROUTE, WEAPONS, createPlayer } from '../games/stick-and-swing/src/config.js';

function setup(weapon = 'scrapsteel') {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  const store = new SaveStore(storage), g = new Game(store); g.startNew(false, 824, weapon, 'chapter2');
  return { g, store, storage };
}
function steps(g, n = 85, input = idleInput()) { for (let i = 0; i < n; i++) g.step(1 / 60, input); }
function jump(g, stop, ferry = 'help', water = 'drain', id = HARBOR_ROUTE[stop][0]) {
  g.path = HARBOR_ROUTE.slice(0, stop).map(o => o[0]); g.room = stop - 1; g.node = g.path.at(-1) ?? null;
  g.decisions = { ...(stop > 2 ? { ferry } : {}), ...(stop > 4 ? { water } : {}) };
  g.showRoute(); g.chooseRoute(id); if (g.mode === 'story') g.beginEncounter();
}
function clear(g) {
  for (const o of g.props) if (o.type === 'anchor') g.hurtProp(o, 1000);
  for (const e of g.enemies) { e.spawn = 0; g.hurtEnemy(e, 10000, 0, 'test'); }
  for (const f of g.fragments) { g.player.x = f.x; g.player.y = f.y; g.updateObjectives(); }
  steps(g);
  if (g.exitReady) { Object.assign(g.player, g.currentNode.exit || { x: 480, y: 95 }); steps(g, 2); }
}
test('all 16 harbor journeys finish with each weapon and persist the correct memories', () => {
  for (const weapon of Object.keys(WEAPONS)) for (let mask = 0; mask < 16; mask++) {
    const { g, store, storage } = setup(weapon); let fork = 2;
    for (let guard = 0; g.mode !== 'victory' && guard < 100; guard++) {
      assert.ok(validateCheckpoint(store.loadRun()), `${g.node}:${g.mode}`);
      if (g.mode === 'route') { const o = g.routeOptions(); g.chooseRoute(o[o.length === 2 ? mask >> fork++ & 1 : 0]); }
      else if (g.mode === 'story') g.beginEncounter();
      else if (g.mode === 'choice') g.chooseDecision(g.currentNode.decision === 'ferry' ? mask & 1 ? 'supplies' : 'help' : mask & 2 ? 'tower' : 'drain');
      else if (g.mode === 'combat') clear(g);
      else if (g.mode === 'reward') g.chooseUpgrade(g.choices[0]);
      else if (g.mode === 'rest') g.takeRest();
      else if (g.mode === 'shop') g.leaveShop();
      else assert.fail(g.mode);
    }
    assert.equal(g.mode, 'victory', `${weapon}:${mask}`); assert.equal(g.path.length, 10);
    const restored = new SaveStore(storage), p = restored.profile();
    assert.equal(p.harborWins, 1); assert.equal(p.chapterWins, 0); assert.equal(p.bookWins, 0);
    assert.equal(p.memories.includes('ferry'), !(mask & 1)); assert.ok(p.memories.includes('beacon')); assert.ok(p.memories.includes('harbor'));
    assert.equal(restored.loadRun(), null); assert.equal(restored.history()[0].mode, 'chapter2');
    g.roomCleared(); assert.equal(store.profile().harborWins, 1);
  }
});
test('decisions save atomically, restore before or after selection, and cannot grant duplicate ink', () => {
  const { g, store, storage } = setup(); jump(g, 2); const before = store.loadRun();
  assert.equal(before.phase, 'choice'); assert.deepEqual(before.decisions, {});
  assert.equal(g.chooseDecision('unknown'), false); assert.equal(g.chooseDecision('supplies'), true);
  assert.equal(g.ink, 55); assert.equal(g.chooseDecision('supplies'), false);
  const reloaded = new Game(new SaveStore(storage)); assert.equal(reloaded.restore(), true);
  assert.deepEqual(reloaded.decisions, { ferry: 'supplies' }); assert.equal(reloaded.ink, 55);
  assert.equal(reloaded.chooseDecision('supplies'), false);
  assert.equal(validateCheckpoint({ ...store.loadRun(), decisions: {} }), null);
  assert.equal(validateCheckpoint({ ...before, decisions: { water: 'tower' } }), null);
  assert.equal(validateCheckpoint({ ...before, decisions: { ferry: 'help' } }), null);
  assert.equal(validateCheckpoint({ ...before, decisions: ['help'] }), null);
  const reopened = new Game(new SaveStore(storage)); assert.equal(reopened.restore(before), true); assert.equal(reopened.chooseDecision('help'), true);
  assert.ok(new SaveStore(storage).profile().memories.includes('ferry'));
});
test('ferry choices change healing and ambushes; the sluice changes pools and anchors through retries', () => {
  for (const ferry of ['help', 'supplies']) for (const water of ['drain', 'tower']) {
    const { g, storage } = setup(); jump(g, 7, ferry, water);
    assert.equal(g.currentNode.waves.flat().length, ferry === 'help' ? 5 : 7);
    assert.equal(!!g.lantern, ferry === 'help'); assert.equal(g.floorPools.length, water === 'drain' ? 0 : 2);
    const checkpoint = g.checkpoint; g.player.hp = 40;
    if (g.lantern) {
      Object.assign(g.player, { x: g.lantern.x, y: g.lantern.y }); g.updateObjectives(); assert.equal(g.player.hp, 65);
      g.updateObjectives(); assert.equal(g.player.hp, 65);
    }
    g.mode = 'death'; assert.equal(g.retryRoom(), true); assert.deepEqual(g.decisions, { ferry, water });
    assert.equal(g.player.hp, checkpoint.hp);
    const reloaded = new Game(new SaveStore(storage)); reloaded.restore(); assert.deepEqual(reloaded.decisions, g.decisions);
    jump(g, 9, ferry, water); assert.equal(g.props.filter(p => p.hp > 0).length, water === 'drain' ? 2 : 1);
  }
});
test('walkways require a dash in either direction, and short crossings return safely', () => {
  for (const stop of [1, 6]) for (const weapon of Object.keys(WEAPONS)) {
    const { g } = setup(weapon); jump(g, stop);
    for (const gap of g.gaps) for (const direction of [1, -1]) {
      const p = g.player, start = direction > 0 ? gap.x - p.radius - 3 : gap.x + gap.width + p.radius + 3;
      Object.assign(p, { x: start, y: 310, vx: 0, vy: 0, dash: 0, dashCd: 0 }); g.lastSafe = { x: start, y: 310 };
      const hp = p.hp, move = { ...idleInput(), moveX: direction };
      steps(g, 40, move); assert.ok(Math.abs(p.x - start) < 5, 'Walking cannot cross');
      g.step(1 / 60, { ...move, dashPressed: true }); steps(g, 15, move);
      assert.ok(direction > 0 ? p.x > gap.x + gap.width + p.radius : p.x < gap.x - p.radius, `Dash crosses ${weapon} ${direction}`);
      assert.equal(p.hp, hp);
      Object.assign(p, { x: start, y: 310, dash: 0, dashCd: 0, vx: 0, vy: 0 }); g.lastSafe = { x: start, y: 310 };
      g.step(1 / 60, { ...move, dashPressed: true }); p.dash = .001; steps(g, 3);
      assert.ok(direction > 0 ? p.x < gap.x : p.x > gap.x + gap.width); assert.equal(p.hp, hp);
    }
  }
});
test('exploration needs both lenses and a reached exit, and partial progress resets on reload', () => {
  const { g, store } = setup(); jump(g, 6); steps(g); assert.equal(g.exitReady, false);
  Object.assign(g.player, g.fragments[0]); g.updateObjectives(); assert.equal(g.fragments[0].collected, true);
  g.restore(store.loadRun()); assert.equal(g.fragments[0].collected, false);
  for (const f of g.fragments) { g.player.x = f.x; g.player.y = f.y; g.updateObjectives(); }
  steps(g); assert.equal(g.exitReady, true); assert.equal(g.mode, 'combat');
  Object.assign(g.player, g.currentNode.exit); steps(g, 2); assert.equal(g.mode, 'reward'); assert.ok(store.profile().memories.includes('beacon'));
});
test('Menders heal visible allies, can be interrupted, and cannot heal through solid cover', () => {
  const { g } = setup(); jump(g, 0); g.enemies = []; g.obstacles = []; g.props = [];
  const m = g.spawn('mender', 300, 300, 0), ally = g.spawn('scrapper', 440, 300, 0); ally.hp = 20;
  m.cooldown = 0; g.updateEnemy(m, .01); assert.equal(m.attack, 'mend'); g.releaseAttack(m); assert.equal(ally.hp, 44);
  m.state = 'approach'; m.cooldown = 0; g.updateEnemy(m, .01); g.hurtEnemy(m, 1, 0, 'light');
  assert.equal(m.state, 'recover'); assert.equal(m.mendTarget, null); g.releaseAttack(m); assert.equal(ally.hp, 44);
  m.mendTarget = ally.id; m.attack = 'mend'; g.obstacles = [{ x: 370, y: 300, radius: 25 }]; g.releaseAttack(m); assert.equal(ally.hp, 44);
  m.state = 'approach'; m.cooldown = 0; m.x = 150; ally.x = 700; g.obstacles = [];
  g.updateEnemy(m, .1); assert.ok(m.x > 150, 'A distant Mender approaches a wounded ally instead of repeatedly shooting');
});
test('Leech tethers drain health and guard, and break by range, cover or a hit', () => {
  for (const counter of ['range', 'cover', 'hit']) {
    const { g } = setup(); jump(g, 3); g.enemies = []; g.props = []; g.obstacles = [];
    Object.assign(g.player, { x: 480, y: 300, invulnerable: 0 }); const e = g.spawn('leech', 300, 300, 0);
    e.cooldown = 0; g.updateEnemy(e, .01); assert.equal(e.attack, 'tether'); assert.equal(e.state, 'windup');
    g.releaseAttack(e); const hp = g.player.hp, guard = g.player.guard; g.updateEnemy(e, .41);
    assert.equal(g.player.hp, hp - 5); assert.equal(g.player.guard, guard - 8);
    if (counter === 'range') g.player.x = 700;
    else if (counter === 'cover') g.obstacles = [{ x: 390, y: 300, radius: 25 }];
    else g.hurtEnemy(e, 1, 0, 'light');
    g.updateEnemy(e, .01); assert.equal(e.tether, null);
  }
  const { g } = setup(); g.startPractice({ enemy: 'leech', invincible: true }); const e = g.enemies[0];
  Object.assign(e, { x: g.player.x - 100, y: g.player.y, spawn: 0, attack: 'tether' }); g.releaseAttack(e);
  const hp = g.player.hp, guard = g.player.guard; g.updateEnemy(e, .41); assert.equal(g.player.hp, hp); assert.equal(g.player.guard, guard);
});
test('anchors protect the Tidekeeper and touch aim prioritizes nearby anchors', () => {
  const { g } = setup(); jump(g, 9); const boss = g.enemies[0]; boss.spawn = 0;
  const hp = boss.hp; g.hurtEnemy(boss, 100, 0, 'test'); assert.equal(hp - boss.hp, 40);
  const anchor = g.props[0]; Object.assign(g.player, { x: anchor.x - 70, y: anchor.y }); g.updatePlayer(1 / 60, idleInput()); assert.equal(g.player.facing, 0);
  for (const o of g.props) g.hurtProp(o, 1000);
  const unprotected = boss.hp; g.hurtEnemy(boss, 100, 0, 'test'); assert.equal(unprotected - boss.hp, 100);
  boss.hp = 800; boss.state = 'approach'; g.updateEnemy(boss, .01); assert.equal(boss.phase, 2); assert.equal(g.banner.title, 'The tide answers');
  g.player.y = 300; g.beginWindup(boss, 'tide', 1.2, 0); g.player.y = 500;
  assert.ok(boss.targets.every(t => t.y === 300)); g.releaseAttack(boss); assert.equal(g.hazards.length, 8); assert.equal(boss.state, 'recover');
  for (let i = 0; i < 4; i++) { boss.attack = 'callMender'; g.releaseAttack(boss); }
  assert.equal(g.enemies.filter(e => e.type === 'mender').length, 2);
});
test('harbor keepsakes work across chapters and preserve their effects after gifts and restore', () => {
  const { g, store } = setup(); store.saveProfile({ ...store.profile(), memories: ['beacon', 'harbor'], keepsake: 'compass' });
  for (const mode of ['chapter', 'chapter2']) {
    g.startNew(false, 82, 'scrapsteel', mode);
    assert.equal(g.player.abilityCooldown, createPlayer(g.upgrades).abilityCooldown * .8);
    g.restore(); assert.equal(g.player.abilityCooldown, createPlayer(g.upgrades).abilityCooldown * .8);
    g.applyUpgrade('dash'); assert.equal(g.player.abilityCooldown, createPlayer(g.upgrades).abilityCooldown * .8);
  }
  store.saveProfile({ ...store.profile(), keepsake: 'lantern' }); g.startNew(false, 82, 'scrapsteel', 'chapter2'); jump(g, 0);
  g.player.hp = 40; for (const e of g.enemies) { e.spawn = 0; g.hurtEnemy(e, 1000, 0, 'test'); }
  assert.equal(g.player.hp, 48); g.wave++; g.spawnWave(); const e = g.enemies.at(-1); e.spawn = 0; g.hurtEnemy(e, 1000, 0, 'test'); assert.equal(g.player.hp, 56);
  g.startPractice(); assert.equal(g.keepsake, null); assert.equal(g.player.abilityCooldown, createPlayer().abilityCooldown);
});
test('2.3 checkpoints without decisions remain playable and Chapter II training keeps its starting build', () => {
  const { g, store } = setup(); g.startNew(false, 82, 'scrapsteel', 'chapter'); const old = store.loadRun(); delete old.decisions;
  assert.ok(validateCheckpoint(old)); assert.equal(g.restore(old), true); assert.deepEqual(g.decisions, {});
  g.startNew(true, 82, 'scrapsteel', 'chapter2'); g.finishTutorial(); assert.deepEqual(g.upgrades, ['edge', 'heart']);
  assert.equal(g.player.maxHp, createPlayer(['edge', 'heart']).maxHp); assert.equal(g.player.hp, g.player.maxHp);
});
