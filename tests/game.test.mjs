import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, idleInput } from '../games/stick-and-swing/src/engine.js';
import { SaveStore, validateCheckpoint } from '../games/stick-and-swing/src/storage.js';
import { createPlayer, playerStats, ROOMS } from '../games/stick-and-swing/src/config.js';
const memory = () => { const map = new Map(); return { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v), removeItem: k => map.delete(k) }; };
function fresh(seed = 123) { const store = new SaveStore(memory()), game = new Game(store); game.startNew(false, seed); game.drainEvents(); return { game, store }; }
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
  assert.equal(recovered.chooseUpgrade(options[0]), true); assert.equal(recovered.room, 1); assert.equal(recovered.player.hp, 84);
  assert.equal(recovered.chooseUpgrade(options[0]), false); assert.equal(store.loadRun().phase, 'combat');
});

test('retry restores the room entrance, enemies, and build without retaining later damage', () => {
  const { game, store } = fresh(); game.upgrades = ['reach']; game.player.hp = 70; game.enterRoom(1, 70);
  const spawn = game.enemies.map(e => [e.type, e.x, e.y]);
  game.player.hp = 0; game.stats.damageTaken = 100; game.enemies = []; game.mode = 'death';
  assert.equal(game.retryRoom(), true); assert.equal(game.player.hp, 70); assert.equal(game.stats.damageTaken, 0);
  assert.deepEqual(game.enemies.map(e => [e.type, e.x, e.y]), spawn); assert.deepEqual(game.upgrades, ['reach']);
  const resumed = new Game(store); resumed.restore(); assert.deepEqual(resumed.enemies.map(e => [e.type, e.x, e.y]), spawn);
});

test('all upgrade choices have real effects and recomputation starts clean', () => {
  assert.equal(playerStats(['reach']).reach, 1.22); assert.equal(playerStats(['edge']).damage, 1.25);
  assert.equal(playerStats(['dash']).dashCooldown, .77); assert.equal(playerStats(['heart']).maxHp, 125);
  assert.equal(playerStats(['parry']).healParry, 6); assert.equal(playerStats(['echo']).echo, true);
  assert.deepEqual(playerStats([]), { maxHp: 100, damage: 1, reach: 1, dashCooldown: 1.1, echo: false, healParry: 0 });
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

test('the five practical lessons advance, cannot hurt the player, and can be skipped', () => {
  const store = new SaveStore(memory()), game = new Game(store); game.startNew(true);
  assert.equal(game.mode, 'tutorial'); assert.equal(game.lesson, 0);
  game.player.x = game.target.x; game.player.y = game.target.y; steps(game, 80); assert.equal(game.lesson, 1);
  const dummy = game.enemies[0]; for (let i = 0; i < 3; i++) game.hurtEnemy(dummy, 18, 0, 'sword'); steps(game, 85); assert.equal(game.lesson, 2);
  game.player.x = game.target.x - 40; game.player.y = game.target.y; game.step(1 / 60, { ...idleInput(), moveX: 1, dashPressed: true }); steps(game, 80); assert.equal(game.lesson, 3);
  game.player.guarding = true; game.player.guardAge = 1; game.player.facing = -Math.PI / 2; game.hurtPlayer(12, game.enemies[0]); steps(game, 80); assert.equal(game.lesson, 4);
  game.player.guarding = true; game.player.guardAge = .1; game.player.facing = -Math.PI / 2; game.hurtPlayer(12, game.enemies[0]); steps(game, 80); assert.equal(game.mode, 'combat'); assert.equal(game.room, 0); assert.equal(game.player.hp, 100);
  assert.equal(store.profile().tutorialDone, true); assert.equal(game.stats.parries, 0);
  game.startNew(true); game.finishTutorial(); assert.equal(game.mode, 'combat');
});

test('boss uses all three telegraphed attacks, enters phase two, and can be defeated', () => {
  const { game, store } = fresh(); game.enterRoom(3);
  const boss = game.enemies[0]; boss.spawn = 0; const attacks = new Set();
  for (let i = 0; i < 1800; i++) {
    game.player.invulnerable = 10; game.step(1 / 60);
    if (boss.state === 'windup') attacks.add(boss.attack);
  }
  assert.deepEqual([...attacks].sort(), ['charge', 'fan', 'slam']);
  boss.hp = 200; boss.state = 'approach'; boss.cooldown = 0; game.step(1 / 60); assert.equal(boss.phase, 2);
  game.hurtEnemy(boss, 1000, 0, 'sword'); steps(game, 90); assert.equal(game.mode, 'victory'); assert.equal(store.loadRun(), null); assert.equal(store.profile().wins, 1);
  steps(game, 120); assert.equal(store.profile().wins, 1);
});

test('a full four-room run transitions through three choices and ends once', () => {
  const { game, store } = fresh();
  for (let room = 0; room < ROOMS.length; room++) {
    assert.equal(game.room, room);
    for (const e of game.enemies) game.hurtEnemy(e, 1000, 0, 'sword');
    steps(game, 90);
    if (room < 3) { assert.equal(game.mode, 'reward'); assert.equal(new Set(game.choices).size, 3); assert.equal(game.chooseUpgrade(game.choices[0]), true); }
  }
  assert.equal(game.mode, 'victory'); assert.equal(game.upgrades.length, 3); assert.equal(store.profile().wins, 1);
});
