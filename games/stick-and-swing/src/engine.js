import { WORLD, TAU, ENEMIES, ROOMS, LESSONS, UPGRADES, OBSTACLES, createPlayer, playerStats, clamp, distance, angleDelta } from './config.js';

export const idleInput = () => ({ moveX: 0, moveY: 0, attackHeld: false, attackPressed: false, guardHeld: false, dashPressed: false, aimX: null, aimY: null, autoAim: true });
const point = (x, y) => ({ x, y });
export class Game {
  constructor(store) {
    this.store = store;
    this.events = [];
    this.mode = 'title';
    this.room = 0;
    this.upgrades = [];
    this.player = createPlayer();
    this.enemies = [];
    this.projectiles = [];
    this.rings = [];
    this.obstacles = [];
    this.seed = 1;
    this.nextId = 1;
    this.clock = 0;
    this.hitStop = 0;
    this.stats = { time: 0, kills: 0, parries: 0, damageTaken: 0 };
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
  startNew(tutorial = false, seed = Date.now() >>> 0) {
    this.seed = seed || 1;
    this.upgrades = [];
    this.stats = { time: 0, kills: 0, parries: 0, damageTaken: 0 };
    this.room = 0;
    this.player = createPlayer();
    this.store.clearRun();
    this.checkpoint = null;
    if (tutorial) { this.lesson = 0; this.lessonHits = 0; this.changeMode('tutorial'); this.setupLesson(); }
    else this.enterRoom(0, 100);
  }
  setupLesson() {
    this.enemies = []; this.projectiles = []; this.rings = []; this.obstacles = [];
    this.player = createPlayer(); this.lessonDone = false; this.lessonDelay = 0;
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
    this.stats = { time: 0, kills: 0, parries: 0, damageTaken: 0 };
    this.store.saveProfile({ ...this.store.profile(), tutorialDone: true });
    this.emit('note', { text: 'You have the basics. Make this page yours.' });
    this.enterRoom(0, 100);
  }
  snapshot(phase = 'combat') {
    return { version: 2, phase, room: this.room, upgrades: [...this.upgrades], hp: Math.max(1, this.player.hp),
      seed: this.seed || 1, stats: { ...this.stats }, ...(phase === 'reward' ? { choices: [...this.choices] } : {}) };
  }
  save(phase = 'combat') {
    const value = this.snapshot(phase);
    this.checkpoint = structuredClone(value);
    if (!this.store.saveRun(value)) this.emit('storageWarning');
  }
  restore(value = this.store.loadRun()) {
    if (!value) return false;
    this.seed = value.seed; this.upgrades = [...value.upgrades]; this.stats = { ...value.stats };
    this.player = createPlayer(this.upgrades, value.hp); this.room = value.room;
    if (value.phase === 'reward') {
      this.enemies = []; this.projectiles = []; this.rings = []; this.obstacles = [];
      this.choices = [...value.choices]; this.checkpoint = structuredClone(value); this.changeMode('reward');
    } else this.enterRoom(value.room, value.hp);
    return true;
  }
  retryRoom() { return this.restore(this.checkpoint || this.store.loadRun()); }
  enterRoom(index, hp = this.player.hp) {
    this.room = index; this.player = createPlayer(this.upgrades, hp);
    this.enemies = []; this.projectiles = []; this.rings = [];
    this.obstacles = index === 1 || index === 2 ? OBSTACLES.map(x => ({ ...x })) : [];
    this.hitStop = 0; this.attackBuffer = 0; this.clearTimer = 0; this.roomClock = 0;
    this.changeMode('combat');
    this.save();
    const positions = [[245, 160], [710, 180], [480, 115], [175, 365], [785, 385]];
    ROOMS[index].enemies.forEach((type, i) => {
      const [x, y] = type === 'brute' ? [480, 165] : positions[i];
      this.spawn(type, x + (type === 'brute' ? 0 : this.random() * 24 - 12), y, .9 + i * .65);
    });
    this.banner = { title: ROOMS[index].title, text: ROOMS[index].note, time: 4.5 };
    this.emit('room', { room: index });
  }
  spawn(type, x, y, delay = .5) {
    const def = ENEMIES[type];
    if (!def) throw new Error(`Unknown enemy: ${type}`);
    const e = { id: this.nextId++, type, ...def, maxHp: def.hp, x, y, facing: 0,
      state: 'approach', stateTime: 0, windup: 0, cooldown: .65, spawn: delay,
      vx: 0, vy: 0, flash: 0, stun: 0, walk: 0, pattern: 0, phase: 1, hit: false };
    this.enemies.push(e); return e;
  }
  pause() {
    if (!['combat', 'tutorial'].includes(this.mode)) return;
    this.pausedFrom = this.mode; this.player.guarding = false; this.changeMode('paused');
  }
  resume() { if (this.mode === 'paused') this.changeMode(this.pausedFrom === 'tutorial' ? 'tutorial' : 'combat'); }
  title() { this.changeMode('title'); this.enemies = []; this.projectiles = []; this.rings = []; this.player = createPlayer(); }
  chooseUpgrade(id) {
    if (this.mode !== 'reward' || !this.choices.includes(id) || this.upgrades.includes(id)) return false;
    this.upgrades.push(id);
    const max = playerStats(this.upgrades).maxHp;
    const healed = Math.min(max, this.player.hp + 22 + (id === 'heart' ? 25 : 0));
    this.emit('upgrade', { id });
    this.enterRoom(this.room + 1, healed);
    return true;
  }
  roomCleared() {
    this.projectiles = []; this.rings = []; this.player.attack = null;
    if (this.room === ROOMS.length - 1) {
      const profile = this.store.profile();
      profile.wins++;
      profile.bestTime = Math.min(profile.bestTime || Infinity, this.stats.time);
      this.store.saveProfile(profile); this.store.clearRun(); this.checkpoint = null;
      this.changeMode('victory'); this.emit('victory'); return;
    }
    const available = UPGRADES.filter(x => !this.upgrades.includes(x.id));
    const ordered = available;
    if (this.room !== 0) for (let i = ordered.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [ordered[i], ordered[j]] = [ordered[j], ordered[i]]; }
    this.choices = ordered.slice(0, 3).map(x => x.id);
    this.save('reward'); this.changeMode('reward'); this.emit('clear');
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
      if (this.clearTimer > 1) this.roomCleared();
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
    else if (input.autoAim && this.enemies.length) {
      const target = this.enemies.filter(e => e.spawn <= 0 && e.hp > 0).sort((a, b) => distance(a, p) - distance(b, p))[0];
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
    const p = this.player;
    p.combo = p.combo % 3 + 1;
    const third = p.combo === 3;
    p.attack = { age: 0, duration: third ? .32 : .23, angle: p.facing, combo: p.combo,
      range: (third ? 106 : 87) * p.reach, arc: third ? 2.5 : 2.15,
      damage: (third ? 30 : 18) * p.damage * (p.counter > 0 ? 1.65 : 1), hit: new Set(), echo: false };
    p.counter = 0; p.attackCd = third ? .48 : .32; p.comboWindow = 1.05; this.attackBuffer = 0;
    this.emit('swing', { combo: p.combo, x: p.x, y: p.y, angle: p.facing });
  }
  resolveSwing() {
    const p = this.player, a = p.attack;
    if (!a || a.age < .055 || a.age > a.duration * .88) return;
    for (const e of this.enemies) {
      if (e.hp <= 0 || e.spawn > 0 || e.trainer || a.hit.has(e.id)) continue;
      const direction = Math.atan2(e.y - p.y, e.x - p.x);
      if (distance(p, e) <= a.range + e.radius && Math.abs(angleDelta(direction, a.angle)) <= a.arc / 2) {
        a.hit.add(e.id); this.hurtEnemy(e, a.damage, direction, 'sword');
      }
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
      e.flash = .16; this.lessonHits++;
      if (this.lessonHits >= 3) this.completeLesson();
    } else {
      e.hp -= damage;
      e.flash = .15;
      if (e.type !== 'brute' && e.state !== 'charge') {
        this.moveBody(e, Math.cos(angle) * 15, Math.sin(angle) * 15); e.stun = Math.max(e.stun, .13);
      }
      if (e.hp <= 0) { this.stats.kills++; this.emit('kill', { x: e.x, y: e.y, color: e.color, boss: e.type === 'brute' }); }
    }
    this.hitStop = Math.max(this.hitStop, source === 'sword' ? .035 : .015);
    this.emit('hit', { x: e.x, y: e.y, color: e.color, damage: Math.round(damage) });
  }
  hurtPlayer(damage, from, source = 'Ink', attacker = null) {
    const p = this.player;
    if (p.invulnerable > 0 || this.mode === 'death') return 'dodged';
    const toward = Math.atan2(from.y - p.y, from.x - p.x);
    if (p.guarding && Math.abs(angleDelta(toward, p.facing)) < 1.42) {
      const perfectWindow = this.mode === 'tutorial' ? .45 : .23;
      if (p.guardAge <= perfectWindow) {
        p.guard = Math.min(100, p.guard + 22); p.counter = 2; p.invulnerable = .16;
        p.hp = Math.min(p.maxHp, p.hp + p.healParry); this.stats.parries++;
        if (attacker && attacker.type !== 'spitter') { attacker.state = 'recover'; attacker.stateTime = 1.4; attacker.stun = 0; }
        this.emit('parry', { x: p.x, y: p.y });
        if (this.mode === 'tutorial' && this.lesson >= 3) this.completeLesson();
        return 'parried';
      }
      p.guard = Math.max(0, p.guard - damage * 2); p.guardDelay = .65; p.invulnerable = .12;
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
    p.hp = Math.max(0, p.hp - damage); p.flash = .25; p.invulnerable = .65; p.combo = 0;
    this.stats.damageTaken += damage;
    this.emit('hurt', { x: p.x, y: p.y, damage, source });
    if (p.hp === 0) { this.deathSource = source; this.changeMode('death'); this.emit('death'); }
    return 'hit';
  }
  beginWindup(e, attack, duration, angle) {
    e.state = 'windup'; e.attack = attack; e.windup = duration; e.stateTime = duration;
    e.facing = angle; e.hit = false;
    this.emit('windup', { boss: e.type === 'brute' });
  }
  updateEnemy(e, dt) {
    if (e.spawn > 0) { e.spawn = Math.max(0, e.spawn - dt); return; }
    e.flash = Math.max(0, e.flash - dt);
    if (e.dummy) return;
    if (e.stun > 0) { e.stun -= dt; return; }
    const p = this.player, d = distance(e, p), angle = Math.atan2(p.y - e.y, p.x - e.x);
    e.cooldown = Math.max(0, e.cooldown - dt);
    if (e.trainer) {
      e.facing = angle;
      if (e.state === 'windup') { e.stateTime -= dt; if (e.stateTime <= 0) { this.shoot(e, angle, 185); e.state = 'approach'; e.cooldown = 1.6; } }
      else if (!e.cooldown) this.beginWindup(e, 'shot', .8, angle);
      return;
    }
    if (e.state === 'recover') { e.stateTime -= dt; if (e.stateTime <= 0) { e.state = 'approach'; e.cooldown = .15; } return; }
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
    if (e.type === 'brute') {
      const phase = e.hp < e.maxHp * .5 ? 2 : 1;
      if (phase > e.phase) {
        e.phase = phase; e.state = 'recover'; e.stateTime = 1.2;
        this.banner = { title: 'A rougher draft', text: 'The Brute is faster. Its recovery is still your opening.', time: 3.5 };
        this.emit('bossPhase'); return;
      }
      if (!e.cooldown) {
        const sequence = ['charge', 'slam', 'fan'];
        const attack = sequence[e.pattern++ % sequence.length];
        this.beginWindup(e, attack, e.phase === 2 ? .85 : 1.1, angle); return;
      }
    } else if (!e.cooldown) {
      if (e.type === 'scrapper' && d < 78) { this.beginWindup(e, 'slash', .68, angle); return; }
      if (e.type === 'skitter' && d < 320) { this.beginWindup(e, 'charge', .78, angle); return; }
      if (e.type === 'spitter' && d < 550) { this.beginWindup(e, 'shot', .9, angle); return; }
    }
    e.facing = angle;
    let speed = e.speed;
    if (e.type === 'spitter') speed = d < 200 ? -e.speed : d > 320 ? e.speed : 0;
    if (e.type === 'brute' && d < 160) speed = 0;
    let vx = Math.cos(angle) * speed, vy = Math.sin(angle) * speed;
    for (const other of this.enemies) {
      if (other === e || other.spawn > 0 || other.hp <= 0) continue;
      const sep = distance(e, other), limit = e.radius + other.radius + 16;
      if (sep < limit && sep > .01) { vx += (e.x - other.x) / sep * 95; vy += (e.y - other.y) / sep * 95; }
    }
    for (const o of this.obstacles) {
      const sep = distance(e, o);
      if (sep < o.radius + e.radius + 50) {
        const ox = e.x - o.x, oy = e.y - o.y;
        vx += ox / Math.max(1, sep) * 110; vy += oy / Math.max(1, sep) * 110;
        vx += -oy / Math.max(1, sep) * 30; vy += ox / Math.max(1, sep) * 30;
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
    e.state = 'recover'; e.stateTime = e.type === 'brute' ? 1.5 : .8;
    if (e.attack === 'slash') {
      this.emit('enemySwing', { x: e.x, y: e.y, angle: e.facing, color: e.color });
      if (distance(e, p) < 87 && Math.abs(angleDelta(Math.atan2(p.y - e.y, p.x - e.x), e.facing)) < 1.2) this.hurtPlayer(e.damage, e, e.name, e);
    }
    if (e.attack === 'shot') this.shoot(e, e.facing, 220);
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
          this.hurtEnemy(e, 36, Math.atan2(q.vy, q.vx), 'reflect'); q.life = 0; break;
        }
      } else if (distance(q, this.player) < this.player.radius + q.radius) {
        const owner = this.enemies.find(e => e.id === q.ownerId);
        const from = { x: this.player.x - q.vx, y: this.player.y - q.vy };
        const result = this.hurtPlayer(q.damage, from, owner?.name || 'An ink shot', owner);
        if (result === 'parried') {
          const a = owner ? Math.atan2(owner.y - q.y, owner.x - q.x) : Math.atan2(-q.vy, -q.vx);
          q.vx = Math.cos(a) * 480; q.vy = Math.sin(a) * 480; q.friendly = true; q.color = '#9aefd9'; q.life = 2;
        } else q.life = 0;
      }
    }
    this.projectiles = this.projectiles.filter(q => q.life > 0 && q.x > 20 && q.y > 20 && q.x < 940 && q.y < 580);
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
