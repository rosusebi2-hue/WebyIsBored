import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, idleInput } from '../games/stick-and-swing/src/engine.js';
import { SaveStore, normalizeProfile, validateCheckpoint } from '../games/stick-and-swing/src/storage.js';
import { ROUTE, EVENTS, WEAPONS, createPlayer, playerStats, unlocked } from '../games/stick-and-swing/src/config.js';
import { buildReport } from '../games/stick-and-swing/src/report.js';
function setup(weapon = 'scrapsteel', mode = 'adventure') {
  const data = new Map(), storage = { getItem: k => data.get(k), setItem: (k, v) => data.set(k, v) }, store = new SaveStore(storage), g = new Game(store);
  g.startNew(false, 721, weapon, mode); g.chooseRoute(g.routeOptions()[0]); if (g.mode === 'story') g.beginEncounter();
  return { g, store, data, storage };
}
function enemy(g, type, x = 540, y = 350) { g.enemies = []; g.player.x = 480; g.player.y = 350; g.player.facing = 0; const e = g.spawn(type, x, y, 0); e.state = 'recover'; e.stateTime = 30; return e; }
function event(g, id) { g.eventId = id; g.changeMode('event'); g.save(); }
function clear(g) { for (const e of g.enemies) { e.spawn = 0; g.hurtEnemy(e, 10000, 0, 'test'); } g.roomCleared(); }

test('2.1 checkpoints migrate and clearing the new save cannot resurrect the old run', () => {
  const { store, storage, data } = setup(), old = { ...store.loadRun(), version: 3 };
  data.clear(); data.set('weby.stickSwing.run.v3', JSON.stringify(old)); data.set('weby.stickSwing.profile.v2', JSON.stringify({ tutorialDone: true, adventureWins: 4, adventureBest: 320 }));
  const migrated = new SaveStore(storage); assert.equal(migrated.loadRun().version, 4); assert.equal(migrated.loadRun().node, 'first'); assert.equal(migrated.profile().adventureWins, 4);
  const restored = new Game(migrated); assert.equal(restored.restore(), true); assert.equal(restored.mode, 'combat'); assert.equal(restored.route.length, 12);
  migrated.clearRun(); assert.equal(new SaveStore(storage).loadRun(), null); assert.equal(migrated.profile().bookWins, 0);
});

test('mastery unlocks are saved atomically with room rewards and locked loadouts are rejected', () => {
  const { g, store, storage } = setup(); const e = enemy(g, 'scrapper'); g.hurtEnemy(e, 100, 0, 'sword');
  assert.equal(store.profile().mastery.scrapsteel.kills, 0); g.roomCleared();
  assert.equal(new SaveStore(storage).profile().mastery.scrapsteel.kills, 1); assert.ok(store.profile().discovered.includes('scrapper'));
  const again = new Game(new SaveStore(storage)); again.restore(); again.chooseUpgrade(again.choices[0]); assert.equal(store.profile().mastery.scrapsteel.kills, 1);
  let profile = normalizeProfile({ loadouts: { scrapsteel: { ability: 'alternate' } } }); assert.equal(profile.loadouts.scrapsteel.ability, 'standard');
  profile.mastery.scrapsteel.parries = 12; profile.loadouts.scrapsteel.ability = 'alternate'; store.saveProfile(profile);
  assert.equal(unlocked(store.profile(), 'scrapsteel', 'ability'), true); g.startNew(false, 8); assert.equal(g.forms.ability, 'alternate');
});

test('Practice preserves an adventure and excludes rewards, mastery and records', () => {
  const { g, store } = setup(), checkpoint = store.loadRun(), profile = store.profile();
  g.startPractice({ enemy: 'knight', weapon: 'pagebreaker', phase: 2, invincible: true, ranges: true });
  assert.equal(g.enemies[0].phase, 2); assert.equal(g.enemies[0].hp, 1078); g.hurtPlayer(9999, { x: 0, y: 0 }, 'Practice', null, false); assert.equal(g.player.hp, 100);
  clear(g); assert.equal(g.mode, 'practiceResult'); assert.deepEqual(store.loadRun(), checkpoint); assert.deepEqual(store.profile(), profile); assert.deepEqual(store.history(), []);
  g.title(); assert.equal(g.restore(), true); assert.equal(g.runMode, 'adventure'); assert.equal(g.node, checkpoint.node);
});

test('all six story events enforce explicit costs and cannot be collected twice after reload', () => {
  for (const story of EVENTS.filter(e => e.id !== 'duel')) for (const choice of story.choices) {
    const { g, store } = setup(); g.ink = 50; g.player.hp = 60; event(g, story.id); const copy = new Game(store); copy.restore();
    assert.equal(copy.mode, 'event'); assert.equal(copy.chooseEvent(choice.id), true); assert.equal(copy.ink, 50 + (choice.ink || 0));
    assert.equal(copy.player.hp, Math.min(100, 60 + (choice.heal || 0) - (choice.hurt || 0))); assert.equal(copy.chooseEvent(choice.id), false);
    const reload = new Game(store); reload.restore(); assert.ok(reload.eventsSeen.includes(story.id)); assert.equal(reload.chooseEvent(choice.id), false);
    if (choice.rescue) assert.ok(store.profile().rescued.includes(story.id));
  }
  const { g } = setup(); g.ink = 0; event(g, 'rescue'); assert.equal(g.chooseEvent('help'), false);
  g.player.hp = 20; g.eventId = 'bargain'; assert.equal(g.chooseEvent('accept'), false);
});

test('the hidden duel checkpoints its unique seal and returns to the same main route', () => {
  const { g, store } = setup(); event(g, 'duel'); const path = [...g.path]; assert.equal(g.chooseEvent('fight'), true);
  assert.equal(g.currentNode.waves[0][0], 'palimpsest'); assert.equal(store.loadRun().encounter, 'secret');
  clear(g); assert.deepEqual(g.choices, ['seal']); assert.ok(validateCheckpoint(store.loadRun()));
  const reloaded = new Game(store); reloaded.restore(); assert.equal(reloaded.chooseUpgrade('seal'), true); assert.equal(reloaded.player.maxHp, 115); assert.equal(reloaded.encounter, 'main'); assert.deepEqual(reloaded.path, path); assert.equal(reloaded.room, 0);
});

test('Boss Rush prepares the player, heals between bosses and records each weapon separately', () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const { g, store } = setup(weapon, 'rush'); assert.equal(g.route.length, 3); assert.deepEqual(g.upgrades, ['edge', 'heart', 'dash']);
    for (const boss of ['brute', 'queen', 'knight']) {
      assert.equal(g.node, boss); g.player.hp = 20; g.stats.time += 12; clear(g);
      if (boss !== 'knight') { g.chooseUpgrade(g.choices[0]); assert.equal(g.player.hp, 125); g.chooseRoute(g.routeOptions()[0]); g.beginEncounter(); }
    }
    assert.equal(g.mode, 'victory'); assert.equal(store.profile().rushBest[weapon], 36); assert.equal(store.profile().bookWins, 0); assert.equal(store.loadRun(), null); assert.equal(store.history().length, 1);
    g.finishAttempt(true); assert.equal(store.history().length, 1);
  }
});

test('active abilities do damage, respect cooldown and count only eligible mastery', () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const { g } = setup(weapon), e = enemy(g, 'warder'); e.state = 'approach'; e.facing = Math.PI;
    assert.equal(g.useAbility(), true); assert.equal(g.useAbility(), false);
    if (weapon === 'scrapsteel') g.updatePlayer(.016, idleInput());
    if (weapon === 'emberbrand') for (let i = 0; i < 20; i++) g.updateProjectiles(1 / 60);
    assert.ok(e.hp < e.maxHp); assert.ok(g.pendingMastery.abilityHits > 0); assert.ok(g.player.abilityCd > 0);
    if (weapon === 'pagebreaker') assert.equal(e.hp, 45);
    if (weapon === 'emberbrand') assert.ok(e.burn > 0);
  }
});

test('alternate abilities and finishers produce distinct combat actions', () => {
  for (const weapon of Object.keys(WEAPONS)) {
    const { g } = setup(weapon); g.forms.ability = 'alternate'; g.forms.finisher = 'alternate'; enemy(g, 'scrapper');
    if (weapon === 'scrapsteel') g.projectiles = [{ x: 520, y: 350, vx: -220, vy: 0, radius: 7, life: 1, friendly: false }];
    g.useAbility();
    assert.equal(g.projectiles.length, weapon === 'scrapsteel' ? 1 : weapon === 'pagebreaker' ? 3 : 8);
    assert.ok(g.projectiles.every(q => q.friendly));
    if (weapon === 'scrapsteel') assert.ok(g.player.counter > 0);
    g.player.combo = 2; g.swing(); assert.equal(g.player.attack.alternate, true);
    assert.equal(g.player.attack.range, weapon === 'scrapsteel' ? 155 : weapon === 'pagebreaker' ? 112 : 120);
  }
});

test('new gifts affect guard, ability recovery, counters, defence and burn trails', () => {
  assert.equal(playerStats(['reservoir']).maxGuard, 125); assert.equal(playerStats(['focus', 'seal']).abilityCooldown, 7 * .75 * .85);
  assert.equal(playerStats(['keen']).counterTime, 4); assert.equal(playerStats(['secondWind']).healKill, 3);
  const { g } = setup('pagebreaker'); enemy(g, 'brute', 550); g.player = createPlayer(['aftershock', 'stonewall'], 60, 'pagebreaker'); g.player.x = 480; g.player.y = 350; g.player.guard = 20;
  g.useAbility(); assert.equal(g.player.guard, 45); assert.equal(g.player.fortify, 1.5); assert.equal(g.bursts.length, 1);
  g.updateHazards(.4); assert.equal(g.bursts.length, 0); assert.equal(g.enemies[0].hp, 1050 - 60 - 24);
  g.hurtPlayer(20, { x: 0, y: 0 }, 'test', null, false); assert.equal(g.player.hp, 46);
  g.player = createPlayer(['cinderstep'], undefined, 'emberbrand'); g.updatePlayer(.016, { ...idleInput(), dashPressed: true }); assert.ok(g.hazards.some(h => h.friendly));
});

test('breakable cover stops shots and barrels telegraph before damaging both sides', () => {
  const { g } = setup(), e = enemy(g, 'brute', 530, 350); g.props = [{ id: 'crate', type: 'cover', x: 510, y: 350, radius: 20, hp: 50, maxHp: 50 }];
  g.projectiles = [{ x: 495, y: 350, vx: 100, vy: 0, radius: 7, damage: 20, life: 1, friendly: true }]; g.updateProjectiles(.016); assert.equal(g.props[0].hp, 30); assert.equal(e.hp, 1050);
  g.props = [{ id: 'barrel', type: 'barrel', x: 510, y: 350, radius: 20, hp: 20, maxHp: 20 }]; g.hurtProp(g.props[0], 30); g.updateHazards(.3); assert.equal(g.player.hp, 100); assert.equal(e.hp, 1050);
  g.updateHazards(.4); g.updateHazards(.016); assert.equal(g.player.hp, 85); assert.equal(e.hp, 990); assert.equal(g.props[0].hp, 0);
});

test('new enemies have double attacks, locked sniper aim, shield links and bounded summons', () => {
  const { g } = setup(), duelist = enemy(g, 'duelist', 590); g.beginWindup(duelist, 'doubleSlash', .9, Math.PI); g.releaseAttack(duelist); assert.equal(duelist.attack, 'thrust'); assert.equal(duelist.state, 'windup');
  const sniper = enemy(g, 'sniper', 600); g.beginWindup(sniper, 'snipe', 1.5, Math.PI); g.player.y = 500; g.releaseAttack(sniper); assert.ok(Math.abs(g.projectiles.at(-1).vx + 500) < .0001); assert.ok(Math.abs(g.projectiles.at(-1).vy) < .0001);
  const warder = enemy(g, 'warder'), weaver = g.spawn('weaver', 590, 350, 0); g.hurtEnemy(warder, 40, 0, 'test'); assert.equal(warder.hp, 83); g.hurtEnemy(weaver, 1000, 0, 'test'); g.hurtEnemy(warder, 40, 0, 'test'); assert.equal(warder.hp, 43);
  const summoner = enemy(g, 'summoner'); summoner.state = 'approach'; summoner.cooldown = 0; g.updateEnemy(summoner, .016); assert.equal(summoner.attack, 'summon'); g.releaseAttack(summoner);
  summoner.state = 'approach'; summoner.cooldown = 0; g.updateEnemy(summoner, .016); g.releaseAttack(summoner); assert.equal(summoner.summons, 2);
  summoner.state = 'approach'; summoner.cooldown = 0; g.updateEnemy(summoner, .016); assert.equal(summoner.attack, 'shot'); assert.equal(g.enemies.length, 3);
});

test('defeats keep the entrance, preserve earned mastery once, and generate useful reports', () => {
  const { g, store } = setup(); const entrance = store.loadRun(); const e = enemy(g, 'scrapper'); g.hurtEnemy(e, 100, 0, 'sword'); g.hurtPlayer(1000, { x: 0, y: 0 }, 'A test hit', null, false);
  assert.equal(g.mode, 'death'); assert.equal(store.history().length, 1); assert.equal(store.profile().mastery.scrapsteel.kills, 1); assert.deepEqual(store.loadRun(), entrance);
  g.finishAttempt(false); assert.equal(store.profile().mastery.scrapsteel.kills, 1); assert.equal(g.retryRoom(), true); assert.equal(g.stats.retries, 1);
  const report = JSON.parse(buildReport(g, store.settings(), ['example error'])); assert.equal(report.version, '2.3.0'); assert.equal(report.seed, 721); assert.equal(report.weapon, 'scrapsteel'); assert.deepEqual(report.route, ['first']); assert.deepEqual(report.errors, ['example error']);
});
