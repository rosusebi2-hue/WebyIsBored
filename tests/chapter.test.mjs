import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, idleInput } from '../games/stick-and-swing/src/engine.js';
import { SaveStore, normalizeProfile, validateCheckpoint } from '../games/stick-and-swing/src/storage.js';
import { CHAPTER_ROUTE, WEAPONS, createPlayer } from '../games/stick-and-swing/src/config.js';

function setup(weapon = 'scrapsteel') {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) };
  const store = new SaveStore(storage), g = new Game(store); g.startNew(false, 823, weapon, 'chapter');
  return { g, store, storage, data };
}
function steps(g, count = 85, input = idleInput()) { for (let i = 0; i < count; i++) g.step(1 / 60, input); }
function jump(g, index, id = CHAPTER_ROUTE[index][0]) {
  g.path = CHAPTER_ROUTE.slice(0, index).map(options => options[0]); g.room = index - 1; g.node = g.path.at(-1) ?? null;
  g.showRoute(); g.chooseRoute(id); if (g.mode === 'story') g.beginEncounter();
}
function collect(g) { for (const f of g.fragments) { for (const p of g.props) p.hp = 0; g.player.x = f.x; g.player.y = f.y; g.updateObjectives(); } }
function clear(g) {
  for (const e of g.enemies) { e.spawn = 0; g.hurtEnemy(e, 10000, 0, 'test'); }
  steps(g); if (g.exitReady) { g.player.x = 480; g.player.y = 95; steps(g, 2); }
}
test('all 32 chapter routes complete with each weapon and award persistent memories exactly once', () => {
  for (const weapon of Object.keys(WEAPONS)) for (let mask = 0; mask < 32; mask++) {
    const { g, store, storage } = setup(weapon); let choice = 0;
    for (let guard = 0; g.mode !== 'victory' && guard < 100; guard++) {
      if (g.mode === 'route') { const options = g.routeOptions(); g.chooseRoute(options[options.length === 2 ? (mask >> choice++) & 1 : 0]); }
      else if (g.mode === 'story') g.beginEncounter();
      else if (g.mode === 'combat') { collect(g); clear(g); }
      else if (g.mode === 'reward') { assert.ok(validateCheckpoint(store.loadRun())); g.chooseUpgrade(g.choices[0]); }
      else if (g.mode === 'shop') g.leaveShop();
      else if (g.mode === 'rest') g.takeRest();
      else assert.fail(g.mode);
    }
    assert.equal(g.mode, 'victory', `${weapon}:${mask}`); assert.equal(g.path.length, 10);
    const p = new SaveStore(storage).profile(); assert.equal(p.chapterWins, 1); assert.equal(p.bookWins, 0);
    assert.ok(p.memories.includes('rook')); assert.ok(p.memories.includes('home'));
    assert.equal(p.memories.includes('vault'), g.path.includes('sealed-vault'));
    assert.equal(store.loadRun(), null); assert.equal(store.history()[0].mode, 'chapter');
    g.roomCleared(); assert.equal(store.profile().chapterWins, 1);
  }
});
test('Rook requires three fragments and the clear doorway; retries reset unbanked fragments', () => {
  const { g, store, storage } = setup(); jump(g, 3); const entrance = store.loadRun();
  g.enemies = []; g.wave = 1; steps(g); assert.equal(g.exitReady, false); assert.equal(g.roomCleared(), false);
  g.player.x = g.fragments[0].x; g.player.y = g.fragments[0].y; g.updateObjectives();
  assert.equal(g.fragments.filter(f => f.collected).length, 1); assert.equal(store.profile().memories.length, 0);
  const restored = new Game(new SaveStore(storage)); assert.equal(restored.restore(entrance), true); assert.equal(restored.fragments.filter(f => f.collected).length, 0);
  collect(g); steps(g, 2); assert.equal(g.exitReady, true); assert.equal(g.mode, 'combat');
  g.player.x = 480; g.player.y = 95; steps(g, 2); assert.equal(g.mode, 'reward');
  assert.deepEqual(new SaveStore(storage).profile().memories, ['rook']);
});
test('the vault memory is behind destructible cover and remains optional', () => {
  const { g, store } = setup(); jump(g, 5, 'sealed-vault'); const f = g.fragments[0];
  g.player.x = f.x; g.player.y = f.y; g.updateObjectives(); assert.equal(f.collected, false);
  const cover = g.props.find(p => p.type === 'cover'); g.hurtProp(cover, 100); g.updateObjectives(); assert.equal(f.collected, true);
  g.enemies = []; g.wave = 1; clear(g); assert.ok(store.profile().memories.includes('vault'));
  const other = setup(); jump(other.g, 5, 'sealed-vault'); other.g.enemies = []; other.g.wave = 1; clear(other.g);
  assert.equal(other.g.mode, 'reward'); assert.equal(other.store.profile().memories.includes('vault'), false);
});
test('keepsakes unlock through memories, are fixed in checkpoints, and do not leak into practice', () => {
  assert.equal(normalizeProfile({ keepsake: 'bell' }).keepsake, 'thread');
  const { g, store } = setup(); store.saveProfile({ ...store.profile(), memories: ['rook'], keepsake: 'bell' });
  g.startNew(false, 5, 'scrapsteel', 'chapter'); assert.equal(g.keepsake, 'bell'); const checkpoint = store.loadRun();
  store.saveProfile({ ...store.profile(), keepsake: 'thread' }); g.restore(checkpoint); assert.equal(g.keepsake, 'bell');
  g.startPractice(); assert.equal(g.keepsake, null); assert.equal(store.loadRun().keepsake, 'bell');
  g.startNew(false, 5, 'scrapsteel', 'adventure'); assert.equal(g.keepsake, null);
});
test('thread hits once per dash, bell pulses on a perfect block, and quill fires once per third swing', () => {
  const { g } = setup(); jump(g, 0); g.enemies = []; g.player.x = 400; g.player.y = 300;
  const e = g.spawn('warder', 460, 300, 0); e.state = 'recover'; e.stateTime = 30; const hp = e.hp;
  g.step(1 / 60, { ...idleInput(), moveX: 1, dashPressed: true }); steps(g, 8);
  assert.equal(hp - e.hp, 18);
  g.keepsake = 'bell'; g.player = createPlayer(); e.x = g.player.x + 50; e.y = g.player.y; e.state = 'recover'; const before = e.hp;
  g.player.guarding = true; g.player.facing = 0; g.player.guardAge = .05;
  assert.equal(g.hurtPlayer(10, e), 'parried'); assert.equal(before - e.hp, 24);
  g.keepsake = 'quill'; g.player.guarding = false; g.player.combo = 2; g.player.comboWindow = 1;
  g.player.attackCd = 0; g.player.attack = null; g.swing(); g.player.attack.age = .13;
  g.resolveSwing(); g.resolveSwing(); assert.equal(g.projectiles.filter(q => q.damage === 22).length, 1);
});
test('new gifts change reflection, combos and delayed dash damage', () => {
  const { g } = setup(); jump(g, 0); g.keepsake = null; g.enemies = [];
  g.player = createPlayer(['rebound', 'inkblades', 'afterimage']); g.player.x = 480; g.player.y = 350;
  const e = g.spawn('scrapper', 530, 350, 0); e.state = 'recover'; e.stateTime = 30; e.hp = e.maxHp = 500;
  g.step(1 / 60, { ...idleInput(), moveX: -1, dashPressed: true }); assert.equal(g.bursts.length, 1); const hp = e.hp;
  g.updateHazards(.5); assert.equal(hp - e.hp, 28);
  g.player = createPlayer(['rebound', 'inkblades']); g.player.combo = 2; g.player.comboWindow = 1; g.swing(); g.player.attack.age = .13; g.resolveSwing(); g.resolveSwing();
  assert.equal(g.projectiles.filter(q => q.damage === 18).length, 2);
  g.projectiles = []; g.player.guarding = true; g.player.guardAge = .05; g.player.facing = 0;
  g.projectiles.push({ x: g.player.x + 10, y: g.player.y, vx: -100, vy: 0, radius: 7, damage: 10, life: 2, ownerId: e.id, color: '#fff' });
  g.updateProjectiles(1 / 60); assert.equal(g.projectiles[0].friendly, true); assert.equal(g.projectiles[0].damage, 54); assert.equal(g.projectiles[0].pierce, true);
});
test('the chapter Brute locks an erasure lane and leaves a recovery opening', () => {
  const { g } = setup(); jump(g, 9); const boss = g.enemies[0]; assert.equal(boss.maxHp, 1500); assert.equal(boss.chapterBoss, true);
  boss.spawn = 0; boss.hp = 700; g.updateEnemy(boss, 1 / 60); assert.equal(boss.phase, 2);
  g.player.x = 400; g.beginWindup(boss, 'redact', 1.2, 0); g.player.x = 800;
  assert.ok(boss.targets.every(t => t.x === 400)); g.releaseAttack(boss);
  assert.equal(g.hazards.length, 5); assert.equal(boss.state, 'recover'); assert.equal(boss.stateTime, 2);
  const hp = g.player.hp; g.player.x = 400; g.player.y = 310; g.player.guarding = true; g.player.guardAge = .05;
  g.updateHazards(1 / 60); assert.equal(hp - g.player.hp, 24);
});
