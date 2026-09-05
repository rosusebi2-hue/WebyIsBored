import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, idleInput } from '../games/stick-and-swing/src/engine.js';
import { SaveStore, validateCheckpoint } from '../games/stick-and-swing/src/storage.js';
import { createPlayer, playerStats, ROUTE, NODES, WEAPONS, UPGRADES, EVENTS } from '../games/stick-and-swing/src/config.js';
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; };
function fresh(seed = 123) { const store = new SaveStore(memory()), game = new Game(store); game.startNew(false, seed); game.chooseRoute('first'); game.beginEncounter(); game.drainEvents(); return { game, store }; }
function steps(game, count, input = {}) { for (let i = 0; i < count; i++) game.step(1 / 60, { ...idleInput(), ...input }); }
function target(game, type = 'scrapper', x = 535, y = 330) {
  game.enemies = []; const e = game.spawn(type, x, y, 0); e.state = 'recover'; e.stateTime = 100; return e;
}

test('holding attack produces a real 1-2-3 combo with one hit per swing', () => {
  const { game } = fresh(); game.player.x = 480; game.player.y = 330;
  const e = target(game); e.hp = 200; e.maxHp = 200;
  const combos = [], hits = [];
  for (let i = 0; i < 100 && hits.length < 3; i++) {
    game.step(1 / 60, { ...idleInput(), attackHeld: true, aimX: 700, aimY: 330 });
    for (const event of game.drainEvents()) { if (event.type === 'swing') combos.push(event.combo); if (event.type === 'hit') hits.push(event.damage); }
  }
  assert.deepEqual(combos, [1, 2, 3]); assert.deepEqual(hits, [18, 18, 30]); assert.equal(e.hp, 134);
});

test('sword attacks respect facing and range', () => {
  const { game } = fresh(); game.player.x = 480; game.player.y = 330;
  const behind = target(game, 'scrapper', 430, 330), far = game.spawn('scrapper', 760, 330, 0); far.state = 'recover'; far.stateTime = 100;
  steps(game, 20, { attackPressed: true, aimX: 800, aimY: 330 });
  assert.equal(behind.hp, behind.maxHp); assert.equal(far.hp, far.maxHp);
});

test('ordinary blocks consume projectiles once and guard only protects the front', () => {
  const { game } = fresh(); game.enemies = [];
  const p = game.player; p.guarding = true; p.guardAge = 1; p.facing = 0;
  game.projectiles = [{ x: p.x + 10, y: p.y, vx: -220, vy: 0, radius: 7, damage: 12, life: 2, friendly: false }];
  game.updateProjectiles(1 / 60);
  assert.equal(game.projectiles.length, 0); assert.equal(p.guard, 76); assert.equal(p.hp, 100);
  p.invulnerable = 0;
  assert.equal(game.hurtPlayer(12, { x: p.x - 100, y: p.y }), 'hit'); assert.equal(p.hp, 88);
});

test('perfect blocks reflect projectiles and consume the counter bonus on the next swing', () => {
  const { game } = fresh(); const p = game.player;
  const owner = target(game, 'spitter', p.x + 120, p.y);
  p.guarding = true; p.guardAge = .05; p.facing = 0;
  game.projectiles = [{ x: p.x + 10, y: p.y, vx: -220, vy: 0, radius: 7, damage: 12, life: 2, friendly: false, ownerId: owner.id }];
  game.updateProjectiles(1 / 60);
  assert.equal(game.projectiles[0].friendly, true); assert.ok(game.projectiles[0].vx > 0); assert.equal(game.stats.parries, 1); assert.equal(p.hp, 100);
  p.guarding = false; game.swing(); assert.equal(p.attack.damage, 18 * 1.65); assert.equal(p.counter, 0);
  for (let i = 0; i < 30; i++) game.updateProjectiles(1 / 60);
  assert.ok(owner.hp < owner.maxHp);
});

test('dash grants invulnerability, respects cooldown, and stays inside the arena', () => {
  const { game } = fresh(); target(game); const p = game.player;
  game.step(1 / 60, { ...idleInput(), dashPressed: true, moveX: 1 });
  assert.ok(p.dash > 0); assert.equal(game.hurtPlayer(25, { x: p.x - 30, y: p.y }), 'dodged');
  const cooldown = p.dashCd; game.step(1 / 60, { ...idleInput(), dashPressed: true, moveX: 1 }); assert.ok(p.dashCd < cooldown);
  steps(game, 180, { moveX: 1 }); assert.ok(p.x <= 897); assert.equal(p.hp, 100);
});

test('guard breaks, then recovers after being released', () => {
  const { game } = fresh(); game.enemies = []; const p = game.player;
  p.guard = 10; p.guarding = true; p.guardAge = 1; p.facing = 0;
  assert.equal(game.hurtPlayer(15, { x: p.x + 30, y: p.y }), 'blocked');
  assert.equal(p.guard, 0); assert.ok(p.broken > 0); assert.equal(p.guarding, false);
  game.mode = 'tutorial'; game.lesson = 1; game.lessonDone = false; steps(game, 150);
  assert.equal(p.broken, 0); assert.ok(p.guard > 40);
});

test('pausing freezes simulation and clears guarding', () => {
  const { game } = fresh(); game.player.guarding = true; game.pause();
  const before = JSON.stringify({ player: game.player, stats: game.stats, enemies: game.enemies });
  steps(game, 600, { moveX: 1, attackHeld: true });
  assert.equal(JSON.stringify({ player: game.player, stats: game.stats, enemies: game.enemies }), before);
  assert.equal(game.player.guarding, false); game.resume(); assert.equal(game.mode, 'combat');
});

test('reward checkpoints restore the exact unchosen options and prevent duplicate purchases', () => {
  const { game, store } = fresh(); game.player.hp = 62; game.enemies = []; game.roomCleared();
  const options = [...game.choices], recovered = new Game(store);
  assert.equal(recovered.restore(), true); assert.equal(recovered.mode, 'reward'); assert.deepEqual(recovered.choices, options);
  assert.equal(recovered.chooseUpgrade('not-a-gift'), false);
  assert.equal(recovered.chooseUpgrade(options[0]), true); assert.equal(recovered.mode, 'route'); assert.equal(recovered.room, 0); assert.equal(recovered.player.hp, options[0] === 'heart' ? 103 : 78);
  assert.equal(recovered.chooseUpgrade(options[0]), false); assert.equal(store.loadRun().phase, 'route');
});

test('retry restores the room entrance, enemies, and build without retaining later damage', () => {
  const { game, store } = fresh(); game.upgrades = ['reach']; game.player.hp = 70; game.showRoute(); game.chooseRoute('archive');
  const spawn = game.enemies.map(e => [e.type, e.x, e.y]);
  game.player.hp = 0; game.stats.damageTaken = 100; game.enemies = []; game.mode = 'death';
  assert.equal(game.retryRoom(), true); assert.equal(game.player.hp, 70); assert.equal(game.stats.damageTaken, 100); assert.equal(game.stats.retries, 1);
  assert.deepEqual(game.enemies.map(e => [e.type, e.x, e.y]), spawn); assert.deepEqual(game.upgrades, ['reach']);
  const resumed = new Game(store); resumed.restore(); assert.deepEqual(resumed.enemies.map(e => [e.type, e.x, e.y]), spawn);
});

test('all upgrade choices have real effects and recomputation starts clean', () => {
  assert.equal(playerStats(['reach']).reach, 1.22); assert.equal(playerStats(['edge']).damage, 1.25);
  assert.equal(playerStats(['dash']).dashCooldown, .77); assert.equal(playerStats(['heart']).maxHp, 125);
  assert.equal(playerStats(['parry']).healParry, 6); assert.equal(playerStats(['echo']).echo, true);
  assert.equal(playerStats([]).maxHp, 100); assert.equal(playerStats([]).damage, 1); assert.equal(playerStats([]).echo, false); assert.equal(playerStats([]).armor, 1);
  const { game } = fresh(); game.upgrades = ['echo']; game.player = createPlayer(game.upgrades); game.player.x = 480; game.player.y = 330; game.player.combo = 2;
  const e = target(game, 'scrapper', 480, 460); game.swing(); game.player.attack.age = .14; game.resolveSwing(); assert.equal(e.hp, 40);
});

test('invalid saves and disabled storage fail gracefully', () => {
  const { store } = fresh(); const save = store.loadRun();
  assert.ok(validateCheckpoint(save));
  for (const bad of [{ ...save, room: 99 }, { ...save, hp: NaN }, { ...save, upgrades: ['bogus'] }, { ...save, upgrades: ['reach', 'reach'] }, { ...save, phase: 'reward', choices: [] }, { ...save, version: 1 }, { ...save, seed: 0 }]) assert.equal(validateCheckpoint(bad), null);
  const broken = new SaveStore({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => {} });
  assert.equal(broken.loadRun(), null); assert.equal(broken.saveRun(save), false);
  const game = new Game(broken); assert.doesNotThrow(() => game.startNew(false)); assert.ok(game.checkpoint);
});

test('the six practical lessons teach movement, combat, defence and abilities and can be skipped', () => {
  const store = new SaveStore(memory()), game = new Game(store); game.startNew(true);
  assert.equal(game.mode, 'tutorial'); assert.equal(game.lesson, 0);
  game.player.x = game.target.x; game.player.y = game.target.y; steps(game, 80); assert.equal(game.lesson, 1);
  const dummy = game.enemies[0]; for (let i = 0; i < 3; i++) game.hurtEnemy(dummy, 18, 0, 'sword'); steps(game, 85); assert.equal(game.lesson, 2);
  game.player.x = game.target.x - 40; game.player.y = game.target.y; game.step(1 / 60, { ...idleInput(), moveX: 1, dashPressed: true }); steps(game, 80); assert.equal(game.lesson, 3);
  game.player.guarding = true; game.player.guardAge = 1; game.player.facing = -Math.PI / 2; game.hurtPlayer(12, game.enemies[0]); steps(game, 80); assert.equal(game.lesson, 4);
  game.player.guarding = true; game.player.guardAge = .1; game.player.facing = -Math.PI / 2; game.hurtPlayer(12, game.enemies[0]); steps(game, 80); assert.equal(game.lesson, 5);
  assert.equal(game.useAbility(), true); steps(game, 80); assert.equal(game.mode, 'route'); assert.equal(game.room, -1); assert.equal(game.player.hp, 100);
  assert.equal(store.profile().tutorialDone, true); assert.equal(game.stats.parries, 0);
  game.startNew(true); game.finishTutorial(); assert.equal(game.mode, 'route');
});

function jump(game, index, id = ROUTE[index][0]) {
  game.path = ROUTE.slice(0, index).map(options => options[0]); game.room = index - 1; game.node = game.path.at(-1) ?? null;
  game.showRoute(); assert.equal(game.chooseRoute(id), true); if (game.mode === 'story') game.beginEncounter();
}
function clearBattle(game) {
  for (let w = 0; w < 4 && game.mode === 'combat'; w++) {
    for (const e of game.enemies) { e.spawn = 0; game.hurtEnemy(e, 10000, 0, 'test'); }
    game.hazards = []; game.floorPools = []; steps(game, 80);
  }
}

test('both bosses use three distinct patterns, transition phase, and leave recovery openings', () => {
  for (const [index, type, patterns] of [[3, 'brute', ['charge', 'fan', 'slam']], [7, 'queen', ['blots', 'orbit', 'quill']]]) {
    const { game } = fresh(); jump(game, index);
    const boss = game.enemies[0]; boss.spawn = 0; const attacks = new Set();
    for (let i = 0; i < 2400; i++) { game.player.invulnerable = 10; game.step(1 / 60); if (boss.state === 'windup') attacks.add(boss.attack); }
    assert.deepEqual([...attacks].sort(), patterns); assert.equal(boss.type, type);
    boss.hp = boss.maxHp * .4; boss.state = 'approach'; boss.cooldown = 0; game.step(1 / 60);
    assert.equal(boss.phase, 2); assert.equal(boss.state, 'recover');
    clearBattle(game); assert.equal(game.mode, 'reward');
  }
});

test('every branch completes a twelve-stop adventure and victory is awarded only once', () => {
  // All 128 combinations of the seven fork decisions, across all three weapons.
  for (const weapon of Object.keys(WEAPONS)) for (let mask = 0; mask < 128; mask++) {
    const { game, store } = fresh(); game.startNew(false, 100 + mask, weapon); let fork = 0;
    for (let stop = 0; stop < ROUTE.length; stop++) {
      assert.equal(game.mode, 'route'); const options = game.routeOptions(), id = options[options.length > 1 ? (mask >> fork++) & 1 : 0];
      assert.equal(game.chooseRoute(id), true); assert.equal(game.chooseRoute(id), false);
      if (game.mode === 'story') { assert.equal(game.beginEncounter(), true); assert.equal(game.beginEncounter(), false); }
      if (game.mode === 'combat') clearBattle(game);
      if (game.mode === 'reward') { assert.ok(game.choices.length); game.chooseUpgrade(game.choices[0]); }
      else if (game.mode === 'shop') { for (const item of [...game.stock]) game.buyItem(item); game.leaveShop(); }
      else if (game.mode === 'rest') game.takeRest();
      if (game.mode === 'event') { const event = EVENTS.find(e => e.id === game.eventId); game.chooseEvent(event.choices.find(c => !c.secret && !(c.hurt || c.ink < 0)).id); }
      if (stop < 11) assert.ok(validateCheckpoint(store.loadRun()));
    }
    assert.equal(game.mode, 'victory'); assert.equal(game.path.length, 12); assert.equal(game.stats.bosses, 3);
    assert.equal(store.loadRun(), null); assert.equal(store.profile().bookWins, 1);
    game.roomCleared(); steps(game, 120); assert.equal(store.profile().bookWins, 1);
  }
});

test('weapons change reach, timing and damage; gifts are limited to the selected weapon', () => {
  const { game } = fresh(), data = [];
  for (const weapon of Object.keys(WEAPONS)) {
    game.weapon = weapon; game.player = createPlayer([], undefined, weapon); game.swing();
    data.push([game.player.attack.damage, game.player.attack.range, game.player.attackCd]);
    game.roomCleared();
    for (const id of game.choices) { const gift = UPGRADES.find(u => u.id === id); assert.ok(!gift.weapon || gift.weapon === weapon); }
    game.mode = 'combat';
  }
  assert.deepEqual(data, [[18, 87, .32], [26, 106, .54], [13, 78, .24]]);
  assert.equal(playerStats(['riposte']).counterMultiplier, 2.2); assert.equal(playerStats(['flurry']).attackSpeed, .78);
  assert.equal(playerStats(['kindling'], 'emberbrand').burnDuration, 4);
});

test('Warder shields are directional, parries expose them, and the heavy third strike pierces', () => {
  const { game } = fresh(); game.player.x = 480; game.player.y = 330;
  const warder = target(game, 'warder', 545, 330); warder.state = 'approach'; warder.facing = Math.PI;
  game.hurtEnemy(warder, 30, 0, 'sword'); assert.equal(warder.hp, 96);
  game.hurtEnemy(warder, 30, Math.PI, 'sword'); assert.equal(warder.hp, 66);
  game.hurtEnemy(warder, 30, 0, 'heavy'); assert.equal(warder.hp, 36); assert.equal(warder.state, 'recover');
  warder.state = 'windup'; game.player.guarding = true; game.player.guardAge = .1; game.player.facing = 0;
  assert.equal(game.hurtPlayer(18, warder, warder.name, warder), 'parried'); assert.equal(warder.state, 'recover');
});

test('Emberbrand burns over time, refreshes without stacking, and wildfire damages nearby enemies', () => {
  const { game } = fresh(); game.weapon = 'emberbrand'; game.player = createPlayer(['wildfire'], undefined, 'emberbrand');
  game.player.x = 480; game.player.y = 330; const e = target(game); e.hp = 100; e.facing = Math.PI;
  game.player.facing = 0; game.swing(); game.player.attack.age = .08; game.resolveSwing();
  assert.equal(e.hp, 87); assert.equal(e.burn, 2); game.hitStop = 0; game.player.attack = null;
  for (let i = 0; i < 60; i++) game.updateEnemy(e, 1 / 60);
  assert.ok(e.hp <= 83.5 && e.hp >= 80); // Two ticks, with floating-point boundary tolerance.
  const before = e.hp; game.swing(); game.player.attack.age = .08; game.resolveSwing(); assert.equal(e.hp, before - 13); assert.equal(e.burn, 2);
  const neighbor = game.spawn('scrapper', e.x + 60, e.y, 0);
  game.hurtEnemy(e, 1000, 0, 'fire'); assert.equal(neighbor.hp, neighbor.maxHp - 22);
});

test('Pagebreaker fault line and full stop produce a stronger third hit and a shield-piercing projectile', () => {
  const { game } = fresh(); game.weapon = 'pagebreaker'; game.player = createPlayer(['faultline', 'impact'], undefined, 'pagebreaker');
  const p = game.player; p.combo = 2; p.facing = 0; game.enemies = []; game.swing();
  assert.equal(p.attack.damage, 44 * 1.45); p.attack.age = .15; game.resolveSwing();
  assert.equal(game.projectiles.length, 1); assert.equal(game.projectiles[0].damage, 32);
  const e = game.spawn('warder', p.x + 55, p.y, 0); e.facing = Math.PI;
  game.updateProjectiles(.06); assert.equal(e.hp, e.maxHp - 32); assert.equal(game.projectiles.length, 0);
});

test('marked ink locks its target during wind-up, cannot be blocked, and can be dashed through', () => {
  const { game } = fresh(), p = game.player;
  const blotter = target(game, 'blotter'); game.beginWindup(blotter, 'blot', 1.25, 0);
  const mark = { ...blotter.targets[0] }; p.x += 130; game.updateEnemy(blotter, .5); assert.deepEqual(blotter.targets[0], mark);
  game.releaseAttack(blotter); assert.equal(game.hazards.length, 1);
  p.x = mark.x; p.y = mark.y; p.guarding = true; p.guardAge = .1;
  game.updateHazards(1 / 60); assert.equal(p.hp, 86); assert.match(game.lastHit.reason, /cannot be blocked/);
  p.invulnerable = 1; game.updateHazards(1 / 60); assert.equal(p.hp, 86);
  p.invulnerable = 0; game.hazards[0].warning = 1; game.updateHazards(.1); assert.equal(p.hp, 86);
});

test('guard immediately interrupts a held swing and touch aim faces an incoming shot', () => {
  const { game } = fresh(), p = game.player; game.swing(); assert.ok(p.attack);
  game.projectiles = [{ x: p.x + 100, y: p.y, vx: -200, vy: 0, radius: 7, damage: 12, life: 2 }];
  game.updatePlayer(1 / 60, { ...idleInput(), attackHeld: true, guardHeld: true });
  assert.equal(p.attack, null); assert.equal(p.guarding, true); assert.equal(p.facing, 0);
});

test('shop purchases are atomic across reloads, cannot be repeated, and do not overspend', () => {
  const { game, store } = fresh(); game.ink = 120; game.player.hp = 50; jump(game, 2, 'nib');
  const stock = [...game.stock], gift = stock[0], balance = game.ink;
  assert.equal(game.buyItem(gift), true); assert.ok(game.ink < balance);
  const saved = store.loadRun(), restored = new Game(store); assert.equal(restored.restore(), true);
  assert.deepEqual(restored.stock, stock); assert.deepEqual(restored.purchased, [gift]); assert.equal(restored.ink, game.ink);
  assert.equal(restored.buyItem(gift), false); assert.equal(restored.buyItem('unlisted'), false);
  assert.equal(restored.buyItem('mend'), true); const health = restored.player.hp;
  const reloaded = new Game(store); reloaded.restore(); assert.equal(reloaded.player.hp, health); assert.equal(reloaded.buyItem('mend'), false);
  reloaded.ink = 0; assert.equal(reloaded.buyItem(stock[1]), false); assert.equal(reloaded.ink, 0);
  assert.ok(validateCheckpoint(saved)); assert.equal(reloaded.leaveShop(), true); assert.equal(reloaded.leaveShop(), false);
});

test('route, story and recovery saves resume exactly and recovery cannot be collected twice', () => {
  const { game, store } = fresh(); game.startNew(false, 77, 'pagebreaker');
  for (const phase of ['route', 'story']) {
    const restored = new Game(store); assert.equal(restored.restore(), true); assert.equal(restored.mode, phase); assert.equal(restored.weapon, 'pagebreaker');
    if (phase === 'route') game.chooseRoute('first');
  }
  game.player.hp = 30; jump(game, 2, 'shelter'); const reload = new Game(store); reload.restore();
  assert.equal(reload.mode, 'rest'); assert.equal(reload.takeRest(), true); assert.equal(reload.player.hp, 80); assert.equal(reload.takeRest(), false);
  assert.equal(store.loadRun().phase, 'route'); assert.deepEqual(reload.path, ['first', 'archive', 'shelter']);
});

test('checkpoint validation rejects broken paths, foreign weapon gifts and malformed transactions', () => {
  const { game, store } = fresh(); const combat = store.loadRun();
  for (const bad of [{ ...combat, weapon: 'unknown' }, { ...combat, path: ['queen'] }, { ...combat, ink: -1 }, { ...combat, upgrades: ['kindling'] }, { ...combat, stats: { ...combat.stats, retries: Infinity } }]) assert.equal(validateCheckpoint(bad), null);
  jump(game, 2, 'nib'); const shop = store.loadRun();
  for (const bad of [{ ...shop, purchased: ['mend', 'mend'] }, { ...shop, stock: ['mend', 'wildfire'] }, { ...shop, purchased: [shop.stock[0]] }, { ...shop, stock: [] }]) assert.equal(validateCheckpoint(bad), null);
});

test('retries restore the original seed and money through repeated reloads', () => {
  const { game, store } = fresh(); const spawn = game.enemies.map(e => [e.type, e.x, e.y]), ink = game.ink;
  for (let attempt = 1; attempt <= 3; attempt++) {
    game.addInk(50); game.stats.time += 10; game.stats.damageTaken += 12; game.player.hp = 0; game.mode = 'death';
    assert.equal(game.retryRoom(), true); assert.deepEqual(game.enemies.map(e => [e.type, e.x, e.y]), spawn);
    assert.equal(game.ink, ink); assert.equal(game.stats.retries, attempt); assert.equal(game.stats.time, attempt * 10);
    const reload = new Game(store); reload.restore(); assert.deepEqual(reload.enemies.map(e => [e.type, e.x, e.y]), spawn);
    assert.equal(reload.stats.retries, attempt);
  }
});
