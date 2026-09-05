import { WORLD, TAU, ENEMIES, ROUTE, NODES, LAYOUTS, WEAPONS, LESSONS, UPGRADES, SHOP_HEAL, giftPrice, availableUpgrades, freshStats, createPlayer, playerStats, clamp, distance, angleDelta } from './config.js?v=2.1.0';
import { validateCheckpoint } from './storage.js?v=2.1.0';

export const idleInput = () => ({ moveX: 0, moveY: 0, attackHeld: false, attackPressed: false, guardHeld: false, dashPressed: false, aimX: null, aimY: null, autoAim: true });
const point = (x, y) => ({ x, y });
export class Game {
  constructor(store) {
    this.store = store;
    this.events = [];
    this.mode = 'title';
    this.room = -1; this.node = null; this.path = []; this.weapon = 'scrapsteel'; this.ink = 0;
    this.upgrades = [];
    this.player = createPlayer();
    this.enemies = [];
    this.projectiles = [];
    this.rings = []; this.hazards = []; this.floorPools = [];
    this.obstacles = [];
    this.seed = 1;
    this.nextId = 1;
    this.clock = 0;
    this.hitStop = 0;
    this.stats = freshStats();
    this.banner = { title: 'The First Page', text: 'A drawing worth fighting for.', time: 0 };
    this.checkpoint = null;
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  drainEvents() { return this.events.splice(0); }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  changeMode(mode) { this.mode = mode; this.emit('mode', { mode }); }
  startNew(tutorial = false, seed = Date.now() >>> 0, weapon = 'scrapsteel') {
    if (!Object.hasOwn(WEAPONS, weapon)) return false;
    this.seed = seed || 1; this.weapon = weapon; this.upgrades = []; this.ink = 0;
    this.stats = freshStats(); this.room = -1; this.node = null; this.path = [];
    this.player = createPlayer([], undefined, weapon);
    this.store.clearRun(); this.checkpoint = null; this.resetArena();
    if (tutorial) { this.lesson = 0; this.lessonHits = 0; this.changeMode('tutorial'); this.setupLesson(); }
    else this.showRoute();
    return true;
  }
  resetArena() {
    this.enemies = []; this.projectiles = []; this.rings = []; this.hazards = []; this.floorPools = []; this.obstacles = [];
    this.hitStop = 0; this.attackBuffer = 0; this.clearTimer = 0; this.roomClock = 0;
    this.wave = 0; this.waveDelay = 0; this.banner.time = 0;
    this.player.attack = null; this.player.guarding = false; this.player.dash = 0;
  }
  setupLesson() {
    this.resetArena();
    this.player = createPlayer([], undefined, this.weapon); this.lessonDone = false; this.lessonDelay = 0;
    this.hitStop = 0; this.attackBuffer = 0;
    if (this.lesson === 0) { this.player.x = 290; this.target = point(640, 365); }
    if (this.lesson === 1) {
      this.player.x = 395; this.player.y = 335;
      this.target = null;
      const dummy = this.spawn('scrapper', 555, 300, 0); dummy.dummy = true;
    }
    if (this.lesson === 2) {
      this.player.x = 315; this.player.y = 350; this.player.facing = 0;
      this.target = point(475, 350);
    }
    if (this.lesson >= 3) {
      this.player.x = 480; this.player.y = 420; this.target = null;
      const trainer = this.spawn('spitter', 480, 135, 0); trainer.trainer = true; trainer.cooldown = 1;
    }
    this.banner = { ...LESSONS[this.lesson], time: 0 };
    this.emit('lesson', { lesson: this.lesson });
  }
  completeLesson() {
    if (this.lessonDone) return;
    this.lessonDone = true; this.lessonDelay = 1.1;
    this.emit('lessonComplete'); this.emit('float', { x: this.player.x, y: this.player.y - 55, text: 'Got it!', color: '#9aefd9' });
  }
  finishTutorial() {
    if (this.mode !== 'tutorial') return;
    this.stats = freshStats();
    this.store.saveProfile({ ...this.store.profile(), tutorialDone: true });
    this.emit('note', { text: 'You have the basics. Make this page yours.' });
    this.player = createPlayer([], undefined, this.weapon);
    this.showRoute();
  }
  snapshot(phase = this.mode) {
    return { version: 3, phase, room: this.room, node: this.node, path: [...this.path], weapon: this.weapon,
      ink: this.ink, upgrades: [...this.upgrades], hp: Math.max(1, this.player.hp), seed: this.seed || 1, stats: { ...this.stats },
      ...(phase === 'reward' ? { choices: [...this.choices] } : {}),
      ...(phase === 'shop' ? { stock: [...this.stock], purchased: [...this.purchased] } : {}) };
  }
  save(phase = this.mode) {
    const value = this.snapshot(phase);
    this.checkpoint = structuredClone(value);
    if (!this.store.saveRun(value)) this.emit('storageWarning');
  }
  restore(raw = this.store.loadRun()) {
    const value = validateCheckpoint(raw);
    if (!value) return false;
    this.seed = value.seed; this.weapon = value.weapon; this.upgrades = [...value.upgrades]; this.stats = { ...value.stats };
    this.player = createPlayer(this.upgrades, value.hp, this.weapon); this.room = value.room;
    this.node = value.node; this.path = [...value.path]; this.ink = value.ink; this.resetArena();
    this.checkpoint = structuredClone(value);
    if (value.phase === 'combat') this.enterCombat();
    else {
      if (value.phase === 'reward') this.choices = [...value.choices];
      if (value.phase === 'shop') { this.stock = [...value.stock]; this.purchased = [...value.purchased]; }
      this.changeMode(value.phase);
    }
    return true;
  }
  retryRoom() {
    if (this.mode !== 'death') return false;
    const attemptStats = { retries: this.stats.retries + 1, time: this.stats.time, damageTaken: this.stats.damageTaken, parries: this.stats.parries };
    if (!this.restore(this.checkpoint || this.store.loadRun())) return false;
    Object.assign(this.stats, attemptStats); Object.assign(this.checkpoint.stats, attemptStats);
    if (!this.store.saveRun(this.checkpoint)) this.emit('storageWarning');
    return true;
  }
  routeOptions() { return ROUTE[this.room + 1] || []; }
  showRoute() { this.resetArena(); this.changeMode('route'); this.save(); }
  chooseRoute(id) {
    if (this.mode !== 'route' || !this.routeOptions().includes(id)) return false;
    this.room++; this.node = id; this.path.push(id);
    this.resetArena(); this.player = createPlayer(this.upgrades, this.player.hp, this.weapon);
    if (NODES[id].story) { this.changeMode('story'); this.save(); }
    else this.beginEncounter();
    return true;
  }
  beginEncounter() {
    const node = NODES[this.node];
    if (!node || !['story', 'route'].includes(this.mode)) return false;
    if (node.kind === 'shop') {
      this.stock = this.shuffle(availableUpgrades(this.weapon, this.upgrades)).slice(0, 2).map(u => u.id).concat('mend');
      this.purchased = []; this.changeMode('shop'); this.save();
    } else if (node.kind === 'rest') { this.changeMode('rest'); this.save(); }
    else this.enterCombat();
    return true;
  }
  enterCombat() {
    const node = NODES[this.node];
    this.resetArena(); this.player = createPlayer(this.upgrades, this.player.hp, this.weapon);
    const layout = LAYOUTS[node.layout];
    this.obstacles = layout.obstacles.map(o => ({ ...o })); this.floorPools = layout.pools.map(o => ({ ...o, lastCycle: -1 }));
    this.changeMode('combat'); this.save(); // Save before seeded spawns, so retries reproduce the entrance.
    this.spawnWave();
    this.banner = { title: node.title, text: node.note, time: 4.5 };
    this.emit('room', { room: this.room });
  }
  spawnWave() {
    const node = NODES[this.node], positions = [[190, 155], [770, 155], [480, 120], [175, 395], [785, 395]];
    node.waves[this.wave].forEach((type, i) => {
      const [x, y] = ENEMIES[type].boss ? [480, 165] : positions[i % positions.length];
      this.spawn(type, x + (ENEMIES[type].boss ? 0 : this.random() * 24 - 12), y, 1.1 + i * .35);
    });
    this.clearTimer = 0;
    if (this.wave) this.emit('note', { text: `Wave ${this.wave + 1} / ${node.waves.length}` });
  }
  shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  }
  addInk(amount) { this.ink += amount; this.stats.inkEarned += amount; }
  applyUpgrade(id) {
    this.upgrades.push(id);
    const hp = this.player.hp + (id === 'heart' ? 25 : 0);
    this.player = createPlayer(this.upgrades, hp, this.weapon); this.emit('upgrade', { id });
  }
  buyItem(id) {
    if (this.mode !== 'shop' || !this.stock.includes(id) || this.purchased.includes(id)) return false;
    const price = id === 'mend' ? SHOP_HEAL.price : giftPrice(id);
    if (this.ink < price || id === 'mend' && this.player.hp >= this.player.maxHp) return false;
    if (id !== 'mend' && !availableUpgrades(this.weapon, this.upgrades).some(u => u.id === id)) return false;
    this.ink -= price; this.stats.spent += price; this.purchased.push(id);
    if (id === 'mend') { this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35); this.emit('upgrade', { id }); }
    else this.applyUpgrade(id);
    this.save(); this.emit('shop'); return true;
  }
  leaveShop() { if (this.mode !== 'shop') return false; this.showRoute(); return true; }
  takeRest() {
    if (this.mode !== 'rest') return false;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50); this.showRoute(); return true;
  }
  spawn(type, x, y, delay = .5) {
    const def = ENEMIES[type];
    if (!def) throw new Error(`Unknown enemy: ${type}`);
    const e = { id: this.nextId++, type, ...def, maxHp: def.hp, x, y, facing: 0,
      state: 'approach', stateTime: 0, windup: 0, cooldown: .65, spawn: delay,
      vx: 0, vy: 0, flash: 0, stun: 0, walk: 0, pattern: 0, phase: 1, hit: false, burn: 0, burnTick: .5 };
    this.enemies.push(e); return e;
  }
  pause() {
    if (!['combat', 'tutorial'].includes(this.mode)) return;
    this.pausedFrom = this.mode; this.player.guarding = false; this.changeMode('paused');
  }
  resume() { if (this.mode === 'paused') this.changeMode(this.pausedFrom === 'tutorial' ? 'tutorial' : 'combat'); }
  title() { this.resetArena(); this.player = createPlayer(); this.changeMode('title'); }
  chooseUpgrade(id) {
    if (this.mode !== 'reward' || !this.choices.includes(id) || this.upgrades.includes(id)) return false;
    this.applyUpgrade(id); this.player.hp = Math.min(this.player.maxHp, this.player.hp + 16);
    this.showRoute(); return true;
  }
  skipEmptyReward() { if (this.mode === 'reward' && this.choices.length === 0) { this.player.hp = Math.min(this.player.maxHp, this.player.hp + 16); this.showRoute(); } }
  roomCleared() {
    if (this.mode !== 'combat') return;
    this.projectiles = []; this.rings = []; this.hazards = []; this.player.attack = null;
    this.addInk(NODES[this.node].reward);
    if (this.node === 'queen') {
      const profile = this.store.profile(); profile.adventureWins++;
      profile.adventureBest = Math.min(profile.adventureBest || Infinity, this.stats.time);
      this.store.saveProfile(profile); this.store.clearRun(); this.checkpoint = null;
      this.changeMode('victory'); this.emit('victory'); return;
    }
    const available = availableUpgrades(this.weapon, this.upgrades);
    // Guarantee a weapon-specific option early so players can discover its identity.
    const ordered = this.shuffle(available), signature = ordered.find(u => u.weapon);
    this.choices = ordered.slice(0, 3).map(u => u.id);
    if (signature && !this.choices.includes(signature.id)) this.choices[this.choices.length - 1] = signature.id;
    this.changeMode('reward'); this.save(); this.emit('clear');
  }
  moveBody(body, dx, dy) {
    body.x = clamp(body.x + dx, WORLD.inset + body.radius, WORLD.width - WORLD.inset - body.radius);
    body.y = clamp(body.y + dy, WORLD.inset + body.radius, WORLD.height - WORLD.inset - body.radius);
    for (const o of this.obstacles) {
      let vx = body.x - o.x, vy = body.y - o.y, d = Math.hypot(vx, vy), min = o.radius + body.radius;
      if (d < min) { if (d < .001) { vx = 1; vy = 0; d = 1; } body.x = o.x + vx / d * min; body.y = o.y + vy / d * min; }
    }
  }
  step(dt, input = idleInput()) {
    if (!['combat', 'tutorial'].includes(this.mode) || !Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 1 / 30);
    if (this.hitStop > 0) { this.hitStop = Math.max(0, this.hitStop - dt); return; }
    this.clock += dt; this.roomClock = (this.roomClock || 0) + dt;
    if (this.mode === 'combat') this.stats.time += dt;
    if (this.banner.time > 0) this.banner.time -= dt;
    this.updatePlayer(dt, input);
    for (const e of this.enemies) if (e.hp > 0) this.updateEnemy(e, dt);
    this.resolveSwing();
    this.updateProjectiles(dt);
    this.updateRings(dt);
    if (this.mode === 'combat') this.updateHazards(dt);
    this.enemies = this.enemies.filter(e => e.hp > 0);
    if (this.mode === 'tutorial') {
      if (this.lesson === 0 && distance(this.player, this.target) < 48) this.completeLesson();
      if (this.lesson === 2 && this.player.dash > 0 && distance(this.player, this.target) < 65) this.completeLesson();
      if (this.lessonDone) {
        this.lessonDelay -= dt;
        if (this.lessonDelay <= 0) {
          if (this.lesson === LESSONS.length - 1) this.finishTutorial();
          else { this.lesson++; this.setupLesson(); }
        }
      }
    } else if (this.mode === 'combat' && this.enemies.length === 0) {
      this.clearTimer += dt;
      if (this.clearTimer > 1.2) {
        if (this.wave + 1 < NODES[this.node].waves.length) { this.wave++; this.spawnWave(); }
        else this.roomCleared();
      }
    }
  }
  updatePlayer(dt, input) {
    const p = this.player;
    for (const key of ['dashCd', 'attackCd', 'comboWindow', 'counter', 'invulnerable', 'broken', 'guardDelay', 'flash']) p[key] = Math.max(0, p[key] - dt);
    if (!p.comboWindow && !p.attack) p.combo = 0;
    let mx = Number.isFinite(input.moveX) ? input.moveX : 0, my = Number.isFinite(input.moveY) ? input.moveY : 0;
    const magnitude = Math.hypot(mx, my);
    if (magnitude > 1) { mx /= magnitude; my /= magnitude; }
    if (input.aimX !== null && Number.isFinite(input.aimX) && Number.isFinite(input.aimY)) p.facing = Math.atan2(input.aimY - p.y, input.aimX - p.x);
    else if (input.autoAim && (this.enemies.length || this.projectiles.length)) {
      const incoming = input.guardHeld && this.projectiles.filter(q => !q.friendly && distance(q, p) < 210 && (p.x - q.x) * q.vx + (p.y - q.y) * q.vy > 0).sort((a, b) => distance(a, p) - distance(b, p))[0];
      const target = incoming || this.enemies.filter(e => e.spawn <= 0 && e.hp > 0).sort((a, b) => distance(a, p) - distance(b, p))[0];
      if (target) p.facing = Math.atan2(target.y - p.y, target.x - p.x);
      else if (magnitude > .1) p.facing = Math.atan2(my, mx);
    } else if (magnitude > .1) p.facing = Math.atan2(my, mx);
    if (input.dashPressed && p.dashCd === 0 && !p.broken) {
      const angle = magnitude > .1 ? Math.atan2(my, mx) : p.facing;
      p.dashX = Math.cos(angle); p.dashY = Math.sin(angle); p.dash = .19; p.dashCd = p.dashCooldown;
      p.invulnerable = .23; p.guarding = false; p.attack = null;
      this.emit('dash', { x: p.x, y: p.y, angle });
    }
    const wasGuarding = p.guarding;
    if (input.guardHeld) p.attack = null; // Guard has priority even while Swing is held on touch.
    p.guarding = !!input.guardHeld && p.dash <= 0 && !p.attack && !p.broken;
    if (p.guarding && !wasGuarding) { p.guardAge = 0; this.emit('guard'); }
    if (p.guarding) p.guardAge += dt;
    else { p.guardAge = 9; if (!p.guardDelay && !p.broken) p.guard = Math.min(100, p.guard + dt * 38); }
    if (p.dash > 0) {
      p.dash -= dt; this.moveBody(p, p.dashX * 820 * dt, p.dashY * 820 * dt);
      p.vx = p.dashX * 200; p.vy = p.dashY * 200;
    } else {
      const speed = p.broken ? 80 : p.guarding ? 110 : p.attack ? 166 : 220;
      const ease = 1 - Math.exp(-24 * dt);
      p.vx += (mx * speed - p.vx) * ease; p.vy += (my * speed - p.vy) * ease;
      this.moveBody(p, p.vx * dt, p.vy * dt);
    }
    p.walk += Math.hypot(p.vx, p.vy) * dt / 28;
    if (input.attackPressed) this.attackBuffer = .2;
    else this.attackBuffer = Math.max(0, (this.attackBuffer || 0) - dt);
    if ((input.attackHeld || this.attackBuffer > 0) && !p.guarding && p.dash <= 0 && !p.broken && !p.attackCd) this.swing();
    if (p.attack) {
      p.attack.age += dt;
      if (p.attack.age > p.attack.duration) p.attack = null;
    }
  }
  swing() {
    const p = this.player, w = WEAPONS[p.weapon];
    p.combo = p.combo % 3 + 1;
    const i = p.combo - 1, third = i === 2;
    p.attack = { age: 0, duration: w.duration[i], angle: p.facing, combo: p.combo,
      range: w.range[i] * p.reach, arc: w.arc[i], color: w.color,
      damage: w.damage[i] * p.damage * (p.counter > 0 ? p.counterMultiplier : 1) * (third && p.impact ? 1.45 : 1),
      hit: new Set(), echo: false, wave: false };
    p.counter = 0; p.attackCd = w.cooldown[i] * p.attackSpeed; p.comboWindow = 1.25; this.attackBuffer = 0;
    this.emit('swing', { combo: p.combo, weapon: p.weapon, x: p.x, y: p.y, angle: p.facing });
  }
  resolveSwing() {
    const p = this.player, a = p.attack;
    if (!a || a.age < .055 || a.age > a.duration * .88) return;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.spawn > 0 || e.trainer || a.hit.has(e.id)) continue;
      const direction = Math.atan2(e.y - p.y, e.x - p.x);
      if (distance(p, e) <= a.range + e.radius && Math.abs(angleDelta(direction, a.angle)) <= a.arc / 2) {
        a.hit.add(e.id);
        if (p.weapon === 'emberbrand' && !e.dummy) { e.burn = p.burnDuration; e.burnPower = p.burnDamage; }
        this.hurtEnemy(e, a.damage, direction, p.weapon === 'pagebreaker' && a.combo === 3 ? 'heavy' : 'sword');
      }
    }
    if (p.faultline && a.combo === 3 && !a.wave && a.age > .12) {
      a.wave = true;
      this.projectiles.push({ x: p.x, y: p.y, vx: Math.cos(a.angle) * 520, vy: Math.sin(a.angle) * 520, radius: 13, damage: 32 * p.damage, friendly: true, life: .65, color: '#ffd088' });
    }
    if (p.echo && a.combo === 3 && !a.echo && a.age > .12) {
      a.echo = true;
      this.emit('burst', { x: p.x, y: p.y, radius: 150, color: '#9aefd9' });
      for (const e of this.enemies) if (e.hp > 0 && !e.spawn && !e.trainer && distance(p, e) < 150) this.hurtEnemy(e, 14 * p.damage, Math.atan2(e.y - p.y, e.x - p.x), 'echo');
    }
  }
  hurtEnemy(e, damage, angle, source) {
    if (e.hp <= 0 || e.trainer) return;
    if (e.dummy) {
      if (source !== 'sword' && source !== 'heavy') return;
      e.flash = .16; this.lessonHits++;
      if (this.lessonHits >= 3) this.completeLesson();
    } else {
      const shielded = e.type === 'warder' && ['approach', 'windup'].includes(e.state) && source === 'sword' && Math.abs(angleDelta(angle + Math.PI, e.facing)) < 1.25;
      if (shielded) { damage *= .3; this.emit('float', { x: e.x, y: e.y - 64, text: 'SHIELDED', color: e.color }); }
      e.hp -= damage; e.flash = .15;
      if (!e.boss && e.state !== 'charge' && !shielded && ['sword', 'heavy', 'reflect'].includes(source)) {
        const heavy = this.weapon === 'pagebreaker';
        const knockback = heavy ? source === 'heavy' && this.player.impact ? 52 : 30 : 15;
        this.moveBody(e, Math.cos(angle) * knockback, Math.sin(angle) * knockback);
        e.stun = Math.max(e.stun, heavy ? .22 : .13);
        if (source === 'heavy') { e.state = 'recover'; e.stateTime = .7; }
      }
      if (e.hp <= 0) {
        this.stats.kills++; this.addInk(e.ink); if (e.boss) this.stats.bosses++;
        this.emit('kill', { x: e.x, y: e.y, color: e.color, boss: e.boss });
        if (e.burn > 0 && this.player.wildfire) {
          this.emit('burst', { x: e.x, y: e.y, radius: 105, color: '#ffad78' });
          for (const other of this.enemies) if (other !== e && other.hp > 0 && other.spawn <= 0 && distance(e, other) < 105) this.hurtEnemy(other, 22, Math.atan2(other.y - e.y, other.x - e.x), 'fire');
        }
      }
    }
    if (source === 'sword' || source === 'heavy') this.hitStop = Math.max(this.hitStop, .035);
    this.emit('hit', { x: e.x, y: e.y, color: source === 'fire' ? '#ffad78' : e.color, damage: Math.round(damage) });
  }
  hurtPlayer(damage, from, source = 'Ink', attacker = null, blockable = true) {
    const p = this.player;
    if (p.invulnerable > 0 || !['combat', 'tutorial'].includes(this.mode)) return 'dodged';
    const toward = Math.atan2(from.y - p.y, from.x - p.x);
    if (blockable && p.guarding && Math.abs(angleDelta(toward, p.facing)) < 1.42) {
      const perfectWindow = this.mode === 'tutorial' ? .45 : .23;
      if (p.guardAge <= perfectWindow) {
        p.guard = Math.min(100, p.guard + 22); p.counter = 2; p.invulnerable = .16;
        p.hp = Math.min(p.maxHp, p.hp + p.healParry); this.stats.parries++;
        if (attacker && attacker.type !== 'spitter') { attacker.state = 'recover'; attacker.stateTime = 1.4; attacker.stun = 0; }
        this.emit('parry', { x: p.x, y: p.y });
        if (this.mode === 'tutorial' && this.lesson >= 3) this.completeLesson();
        return 'parried';
      }
      p.guard = Math.max(0, p.guard - damage * 2 * p.guardCost); p.guardDelay = .65; p.invulnerable = .12;
      this.emit('block', { x: p.x, y: p.y });
      if (p.guard <= 0) { p.broken = 1.1; p.guarding = false; this.emit('float', { x: p.x, y: p.y - 48, text: 'Guard broken', color: '#ffd088' }); }
      if (this.mode === 'tutorial' && this.lesson === 3) this.completeLesson();
      return 'blocked';
    }
    if (this.mode === 'tutorial') {
      p.invulnerable = .3;
      this.emit('float', { x: p.x, y: p.y - 50, text: this.lesson === 4 ? 'Tap guard a little later' : 'Face the shot and hold guard', color: '#d7e0ea' });
      return 'practice';
    }
    damage = Math.max(1, Math.round(damage * p.armor));
    const actualDamage = Math.min(p.hp, damage);
    p.hp = Math.max(0, p.hp - damage); p.flash = .25; p.invulnerable = .65; p.combo = 0;
    this.stats.damageTaken += actualDamage;
    this.lastHit = { source, damage, reason: !blockable ? 'Ink on the floor cannot be blocked. Move out of its warning circle or dash through it.' : p.broken > 0 ? 'Your guard was broken. Release it between attacks to recover.' : p.guarding ? 'The hit came around your guard. Face the attacker before blocking.' : 'Step out of the marked attack, dash through it, or face it and block.' };
    this.emit('hurt', { x: p.x, y: p.y, damage, source });
    if (p.hp === 0) { this.deathSource = source; this.changeMode('death'); this.emit('death'); }
    return 'hit';
  }
  beginWindup(e, attack, duration, angle) {
    e.state = 'windup'; e.attack = attack; e.windup = duration; e.stateTime = duration;
    e.facing = angle; e.hit = false;
    if (attack === 'blot' || attack === 'blots') {
      const offsets = attack === 'blot' ? [[0, 0]] : e.phase === 2 ? [[0, 0], [-125, 0], [125, 0], [0, -120], [0, 120]] : [[0, 0], [-125, -60], [125, 60]];
      e.targets = offsets.map(([x, y]) => ({ x: clamp(this.player.x + x, 110, 850), y: clamp(this.player.y + y, 110, 490), radius: attack === 'blot' ? 62 : 56 }));
    }
    this.emit('windup', { boss: e.boss });
  }
  updateEnemy(e, dt) {
    if (e.spawn > 0) { e.spawn = Math.max(0, e.spawn - dt); return; }
    e.flash = Math.max(0, e.flash - dt);
    if (e.dummy) return;
    if (e.burn > 0) {
      e.burnTick -= dt;
      if (e.burnTick <= .000001) { e.burnTick += .5; this.hurtEnemy(e, e.burnPower * .5, 0, 'fire'); if (e.hp <= 0) return; }
      e.burn = Math.max(0, e.burn - dt);
    } else e.burnTick = .5;
    if (e.stun > 0) { e.stun -= dt; return; }
    const p = this.player, d = distance(e, p), angle = Math.atan2(p.y - e.y, p.x - e.x);
    e.cooldown = Math.max(0, e.cooldown - dt);
    if (e.trainer) {
      e.facing = angle;
      if (e.state === 'windup') { e.stateTime -= dt; if (e.stateTime <= 0) { this.shoot(e, angle, 185); e.state = 'approach'; e.cooldown = 1.6; } }
      else if (!e.cooldown) this.beginWindup(e, 'shot', .8, angle);
      return;
    }
    if (e.state === 'recover') {
      e.stateTime -= dt;
      if (e.stateTime <= 0) { e.state = 'approach'; e.cooldown = e.type === 'queen' ? 1.15 : .15; }
      return;
    }
    if (e.state === 'windup') {
      e.stateTime -= dt;
      if (e.stateTime <= 0) this.releaseAttack(e);
      return;
    }
    if (e.state === 'charge') {
      this.moveBody(e, Math.cos(e.facing) * e.chargeSpeed * dt, Math.sin(e.facing) * e.chargeSpeed * dt);
      e.walk += dt * 18; e.stateTime -= dt;
      if (!e.hit && distance(e, p) < e.radius + p.radius + 8) {
        e.hit = true; this.hurtPlayer(e.damage, e, e.name, e);
      }
      if (e.stateTime <= 0) { e.state = 'recover'; e.stateTime = e.type === 'brute' ? 1.45 : 1.1; }
      return;
    }
    if (e.boss) {
      const phase = e.hp < e.maxHp * .5 ? 2 : 1;
      if (phase > e.phase) {
        e.phase = phase; e.state = 'recover'; e.stateTime = 1.5;
        this.banner = e.type === 'queen'
          ? { title: 'No more corrections', text: 'More quills. More ink. Her recovery still leaves an opening.', time: 3 }
          : { title: 'A rougher draft', text: 'The Brute is faster. Its recovery is still your opening.', time: 3 };
        this.emit('bossPhase'); return;
      }
      if (!e.cooldown) {
        const sequence = e.type === 'queen' ? ['quill', 'blots', 'orbit'] : ['charge', 'slam', 'fan'];
        const attack = sequence[e.pattern++ % sequence.length];
        this.beginWindup(e, attack, e.type === 'queen' ? 1.2 : e.phase === 2 ? .85 : 1.1, angle); return;
      }
    } else if (!e.cooldown) {
      if (e.type === 'scrapper' && d < 78) { this.beginWindup(e, 'slash', .68, angle); return; }
      if (e.type === 'warder' && d < 96) { this.beginWindup(e, 'shieldSwing', 1, angle); return; }
      if (e.type === 'skitter' && d < 320) { this.beginWindup(e, 'charge', .78, angle); return; }
      if (e.type === 'spitter' && d < 550) { this.beginWindup(e, 'shot', .9, angle); return; }
      if (e.type === 'blotter' && d < 570) { this.beginWindup(e, 'blot', 1.25, angle); return; }
    }
    e.facing = angle;
    let speed = e.speed;
    if (e.type === 'spitter' || e.type === 'blotter') speed = d < 200 ? -e.speed : d > 320 ? e.speed : 0;
    if (e.type === 'brute' && d < 160) speed = 0;
    let vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    if (e.type === 'queen') {
      const retreat = d < 220 ? -70 : d > 330 ? 50 : 0;
      vx = Math.cos(angle) * retreat + Math.cos(angle + Math.PI / 2) * 95;
      vy = Math.sin(angle) * retreat + Math.sin(angle + Math.PI / 2) * 95;
    }
    for (const other of this.enemies) {
      if (other === e || other.spawn > 0 || other.hp <= 0) continue;
      const sep = distance(e, other), limit = e.radius + other.radius + 16;
      if (sep < limit && sep > .01) { vx += (e.x - other.x) / sep * 95; vy += (e.y - other.y) / sep * 95; }
    }
    for (const o of this.obstacles) {
      const ox = e.x - o.x, oy = e.y - o.y, sep = Math.max(1, distance(e, o)), safe = o.radius + e.radius + 18;
      // Follow a tangent when cover blocks the approach, instead of repelling enemies away forever.
      if (sep < safe + 45 && ox * vx + oy * vy < 0) {
        const tx = -oy / sep, ty = ox / sep, sign = tx * vx + ty * vy >= 0 ? 1 : -1;
        const push = Math.max(0, safe - sep) * 5;
        vx = tx * sign * e.speed + ox / sep * push; vy = ty * sign * e.speed + oy / sep * push;
      }
    }
    this.moveBody(e, vx * dt, vy * dt); e.walk += Math.hypot(vx, vy) * dt / 25;
  }
  releaseAttack(e) {
    const p = this.player;
    if (e.attack === 'charge') {
      e.state = 'charge'; e.stateTime = e.type === 'brute' ? .68 : .38;
      e.chargeSpeed = e.type === 'brute' ? (e.phase === 2 ? 610 : 510) : 540;
      this.emit('charge', { boss: e.type === 'brute' }); return;
    }
    e.state = 'recover'; e.stateTime = e.boss ? 1.65 : e.type === 'warder' ? 1.2 : .9;
    if (e.attack === 'slash' || e.attack === 'shieldSwing') {
      this.emit('enemySwing', { x: e.x, y: e.y, angle: e.facing, color: e.color });
      if (distance(e, p) < (e.attack === 'shieldSwing' ? 112 : 87) && Math.abs(angleDelta(Math.atan2(p.y - e.y, p.x - e.x), e.facing)) < 1.2) this.hurtPlayer(e.damage, e, e.name, e);
    }
    if (e.attack === 'shot') this.shoot(e, e.facing, 220);
    if (e.attack === 'blot' || e.attack === 'blots') {
      for (const t of e.targets) this.hazards.push({ ...t, warning: 0, life: 3, damage: e.damage, source: `${e.name}’s ink pool`, ownerId: e.id });
      e.targets = []; this.emit('inkDrop');
    }
    if (e.attack === 'quill' || e.attack === 'orbit') {
      const radial = e.attack === 'orbit', count = radial ? (e.phase === 2 ? 16 : 12) : (e.phase === 2 ? 11 : 7);
      for (let i = 0; i < count; i++) this.shoot(e, radial ? e.facing + i * TAU / count : e.facing + (i - (count - 1) / 2) * .22, radial ? 195 : 250);
      this.emit('fan');
    }
    if (e.attack === 'slam') {
      this.rings.push({ x: e.x, y: e.y, radius: 22, previous: 0, max: 285, speed: 250, hit: false, owner: e });
      this.emit('slam', { x: e.x, y: e.y });
    }
    if (e.attack === 'fan') {
      const count = e.phase === 2 ? 9 : 7;
      for (let i = 0; i < count; i++) this.shoot(e, e.facing + (i - (count - 1) / 2) * .3, 210);
      this.emit('fan');
    }
  }
  shoot(e, angle, speed) {
    this.projectiles.push({ x: e.x + Math.cos(angle) * (e.radius + 10), y: e.y + Math.sin(angle) * (e.radius + 10),
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 7, damage: e.damage,
      ownerId: e.id, friendly: false, life: 5, color: e.color });
    this.emit('shoot');
  }
  updateProjectiles(dt) {
    for (const q of this.projectiles) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (this.obstacles.some(o => distance(q, o) < o.radius + q.radius)) { q.life = 0; this.emit('spark', { x: q.x, y: q.y, color: '#97a7bb' }); continue; }
      if (q.friendly) {
        for (const e of this.enemies) if (e.hp > 0 && e.spawn <= 0 && !e.trainer && distance(q, e) < e.radius + q.radius) {
          this.hurtEnemy(e, q.damage, Math.atan2(q.vy, q.vx), 'reflect'); q.life = 0; break;
        }
      } else if (distance(q, this.player) < this.player.radius + q.radius) {
        const owner = this.enemies.find(e => e.id === q.ownerId);
        const from = { x: this.player.x - q.vx, y: this.player.y - q.vy };
        const result = this.hurtPlayer(q.damage, from, owner?.name || 'An ink shot', owner);
        if (result === 'parried') {
          const a = owner ? Math.atan2(owner.y - q.y, owner.x - q.x) : Math.atan2(-q.vy, -q.vx);
          q.vx = Math.cos(a) * 480; q.vy = Math.sin(a) * 480; q.friendly = true; q.damage = 36; q.color = '#9aefd9'; q.life = 2;
        } else q.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(q => q.life > 0 && q.x > 20 && q.y > 20 && q.x < 940 && q.y < 580);
  }
  updateHazards(dt) {
    for (const pool of this.floorPools) {
      const phase = (this.roomClock + pool.offset) % 8, cycle = Math.floor((this.roomClock + pool.offset) / 8);
      if (phase >= 1 && pool.lastCycle !== cycle) {
        pool.lastCycle = cycle;
        this.hazards.push({ x: pool.x, y: pool.y, radius: pool.radius, warning: 1.25, life: 2.5, damage: 12, source: 'Spilled floor ink' });
      }
    }
    for (const h of this.hazards) {
      if (h.warning > 0) { h.warning = Math.max(0, h.warning - dt); continue; }
      h.life -= dt;
      if (h.life > 0 && distance(h, this.player) < h.radius + this.player.radius * .5) this.hurtPlayer(h.damage, h, h.source, null, false);
    }
    this.hazards = this.hazards.filter(h => h.life > 0);
  }
  updateRings(dt) {
    for (const r of this.rings) {
      r.previous = r.radius; r.radius += r.speed * dt;
      const d = distance(r, this.player);
      if (!r.hit && d + this.player.radius >= r.previous - 6 && d - this.player.radius <= r.radius + 6) {
        r.hit = true; this.hurtPlayer(18, r, 'The Brute’s ink shockwave', r.owner);
      }
    }
    this.rings = this.rings.filter(r => r.radius < r.max);
  }
}
