import { WORLD, TAU, WEAPONS, clamp, distance } from './config.js?v=2.4.0';
const INK = '#dce7eb', MINT = '#9aefd9', GOLD = '#ffd088', RED = '#ff827d';
const t = text => globalThis.WebyI18n?.t(text) || text;
export class Renderer {
  constructor(canvas, game, settings) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('Canvas is unavailable');
    this.game = game; this.settings = settings; this.effects = []; this.shake = 0; this.time = 0;
    this.paper = document.createElement('canvas'); this.paper.width = WORLD.width; this.paper.height = WORLD.height;
    this.drawPaper();
    this.resize = this.resize.bind(this);
    this.observer = new ResizeObserver(this.resize); this.observer.observe(canvas);
    this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(rect.width * ratio)); this.canvas.height = Math.max(1, Math.round(rect.height * ratio));
  }
  drawPaper() {
    const c = this.paper.getContext('2d');
    c.fillStyle = '#111b26'; c.fillRect(0, 0, 960, 600);
    const glow = c.createRadialGradient(480, 280, 50, 480, 300, 560);
    glow.addColorStop(0, '#1b2c38'); glow.addColorStop(1, '#0f1721'); c.fillStyle = glow; c.fillRect(0, 0, 960, 600);
    c.strokeStyle = '#bccfdb0a'; c.lineWidth = 1;
    for (let x = 24; x < 960; x += 24) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 600); c.stroke(); }
    for (let y = 24; y < 600; y += 24) { c.beginPath(); c.moveTo(0, y); c.lineTo(960, y); c.stroke(); }
    c.strokeStyle = '#94b6bf40'; c.lineWidth = 1.5;
    c.strokeRect(45, 45, 870, 510); c.strokeStyle = '#94b6bf18'; c.strokeRect(49, 49, 862, 502);
    c.strokeStyle = '#ff827d28'; c.beginPath(); c.moveTo(92, 45); c.lineTo(92, 555); c.stroke();
    c.font = '11px monospace'; c.fillStyle = '#91a8b050'; c.textAlign = 'left';
    c.fillText(t('FINISH THIS SOMEDAY.'), 64, 31); c.textAlign = 'right'; c.fillText(t('LEAVE ROOM FOR SOMETHING NEW.'), 896, 580);
    for (const [x, y, s] of [[65, 535, 1], [884, 69, 1], [883, 532, -1]]) {
      c.save(); c.translate(x, y); c.rotate(s * .17); c.strokeStyle = '#8b9fa73a';
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 5, 0); c.lineTo(i * 5 - 4, 14); c.stroke(); }
      c.restore();
    }
  }
  event(event) {
    const g = this.game;
    if (['hit', 'kill', 'spark', 'parry', 'block', 'hurt', 'slam', 'burst', 'ability'].includes(event.type)) {
      const color = event.color || (event.type === 'hurt' ? RED : event.type === 'block' ? GOLD : MINT);
      const count = this.settings.reduced ? 3 : event.type === 'kill' ? 20 : event.type === 'parry' ? 20 : 8;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * TAU, speed = 30 + Math.random() * (event.type === 'kill' ? 180 : 110);
        this.effects.push({ kind: 'particle', x: event.x, y: event.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .3 + Math.random() * .25, total: .6, color, size: Math.random() * 3 + 1 });
      }
      if (!this.settings.reduced) this.shake = Math.max(this.shake, event.type === 'hurt' ? 7 : event.type === 'parry' ? 5 : 2);
      if (event.type === 'hit') this.effects.push({ kind: 'text', x: event.x, y: event.y - 44, text: String(event.damage), life: .55, total: .55, color: INK });
      if (event.type === 'hurt') this.effects.push({ kind: 'text', x: event.x, y: event.y - 55, text: `−${event.damage}`, life: .8, total: .8, color: RED });
      if (event.type === 'parry') this.effects.push({ kind: 'text', x: event.x, y: event.y - 55, text: 'PERFECT', life: .85, total: .85, color: MINT });
      if (['parry', 'slam', 'burst'].includes(event.type)) this.effects.push({ kind: 'ring', x: event.x, y: event.y, radius: event.radius || 88, life: .4, total: .4, color });
    }
    if (event.type === 'dash' && !this.settings.reduced) for (let i = 0; i < 5; i++) this.effects.push({ kind: 'ghost', x: event.x + Math.cos(event.angle) * i * 27, y: event.y + Math.sin(event.angle) * i * 27, angle: event.angle, life: .22 + i * .02, total: .36, color: MINT });
    if (event.type === 'enemySwing') this.effects.push({ kind: 'slash', ...event, life: .16, total: .16 });
    if (event.type === 'float') this.effects.push({ kind: 'text', ...event, life: 1.15, total: 1.15 });
    if (event.type === 'room' || event.type === 'lesson') { this.effects = []; this.shake = 0; }
    if (event.type === 'victory') this.effects.push({ kind: 'ring', x: g.player.x, y: g.player.y, radius: 360, life: 1, total: 1, color: MINT });
    if (this.effects.length > 220) this.effects.splice(0, this.effects.length - 220);
  }
  render(dt) {
    this.time += dt;
    const c = this.ctx, g = this.game, p = g.player;
    c.setTransform(this.canvas.width / 960, 0, 0, this.canvas.height / 600, 0, 0);
    c.drawImage(this.paper, 0, 0);
    c.save();
    if (this.shake > .1 && !this.settings.reduced) { c.translate((Math.random() - .5) * this.shake, (Math.random() - .5) * this.shake); this.shake *= Math.exp(-20 * dt); }
    const chapter = g.currentNode?.chapter || 1;
    if (chapter >= 2) { c.fillStyle = g.runMode === 'chapter2' ? '#22798920' : chapter === 3 ? '#c3924020' : '#8e5bad0b'; c.fillRect(50, 50, 860, 500); }
    if (chapter === 3) {
      c.strokeStyle = '#dfbb7860'; c.lineWidth = 1.5;
      for (let y = 65; y < 550; y += 30) { c.beginPath(); c.moveTo(58, y); c.lineTo(80, y + 15); c.moveTo(880, y); c.lineTo(902, y + 15); c.stroke(); }
    }
    for (const h of g.hazards) this.hazard(h);
    for (const b of g.bursts) this.hazard({ ...b, warning: b.delay, friendly: true });
    for (const gap of g.gaps || []) {
      c.fillStyle = '#050c18'; c.fillRect(gap.x, gap.y, gap.width, gap.height);
      c.strokeStyle = this.settings.contrast ? '#fff' : '#6ed9f2'; c.lineWidth = 2; c.setLineDash([5, 8]); c.strokeRect(gap.x, gap.y, gap.width, gap.height); c.setLineDash([]);
      c.font = 'bold 26px system-ui'; c.textAlign = 'center'; c.fillStyle = '#b6eefa'; c.fillText('»', gap.x - 28, gap.crossingY); c.fillText('«', gap.x + gap.width + 28, gap.crossingY);
      c.font = 'bold 13px system-ui'; c.fillText(t('DASH'), gap.x + gap.width / 2, gap.crossingY + 34);
    }
    if (g.lantern && !g.lantern.used) {
      this.target(g.lantern, true); c.fillStyle = MINT; c.font = 'bold 16px system-ui'; c.textAlign = 'center'; c.fillText(t('+25 HEALTH'), g.lantern.x, g.lantern.y - 53);
    }
    if (g.authored && g.mode === 'combat') {
      for (const f of g.fragments) {
        if (f.collected || f.secret && g.props.some(o => o.hp > 0 && distance(o, f) < 40)) continue;
        this.target(f, false); c.fillStyle = INK; c.textAlign = 'center'; c.font = 'bold 13px system-ui';
        c.fillText(t(g.runMode === 'chapter2' ? 'WAYMARK' : f.secret ? 'MEMORY' : 'WING FRAGMENT'), f.x, f.y - 53);
      }
      if (g.exitReady) {
        const exit = g.currentNode.exit || { x: 480, y: 95 };
        c.fillStyle = '#9aefd925'; c.strokeStyle = MINT; c.lineWidth = 3;
        c.fillRect(exit.x - 34, exit.y - 33, 68, 70); c.strokeRect(exit.x - 34, exit.y - 33, 68, 70);
        c.font = 'bold 13px system-ui'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText(t('CONTINUE ↑'), exit.x, exit.y + 59);
      }
    }
    for (const o of g.obstacles) this.obstacle(o);
    for (const o of g.props) if (o.hp > 0) this.prop(o);
    for (const e of g.enemies) if (e.type === 'weaver' && e.hp > 0 && e.spawn <= 0) {
      c.strokeStyle = '#a9c8ff60'; c.lineWidth = 2;
      for (const other of g.enemies) if (other !== e && other.hp > 0 && other.spawn <= 0 && distance(e, other) < 165) { c.beginPath(); c.moveTo(e.x, e.y - 22); c.lineTo(other.x, other.y - 22); c.stroke(); }
    }
    if (g.runMode === 'practice' && g.practiceOptions.ranges) {
      c.strokeStyle = '#9aefd970'; c.setLineDash([3, 6]); c.lineWidth = 1;
      c.beginPath(); c.arc(p.x, p.y, WEAPONS[p.weapon].range[0], 0, TAU); c.stroke();
      for (const e of g.enemies) { c.beginPath(); c.arc(e.x, e.y, e.type === 'sniper' ? 420 : e.boss ? 160 : 100, 0, TAU); c.stroke(); }
      c.setLineDash([]);
    }
    if (g.mode === 'tutorial' && g.target) this.target(g.target, g.lessonDone);
    for (const e of g.enemies) {
      const target = e.mendTarget ? g.enemies.find(a => a.id === e.mendTarget && a.hp > 0) : e.tether || e.state === 'windup' && e.attack === 'tether' ? p : null;
      if (target && e.hp > 0) {
        c.strokeStyle = this.settings.contrast ? '#fff' : e.type === 'mender' ? '#79e5d4' : '#b7a5ff'; c.lineWidth = e.tether ? 4 : 2;
        if (!e.tether) c.setLineDash([6, 5]); c.beginPath(); c.moveTo(e.x, e.y - 15); c.lineTo(target.x, target.y - 15); c.stroke(); c.setLineDash([]);
        c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.fillStyle = c.strokeStyle; c.fillText(t(e.type === 'mender' ? 'HEALING' : 'BREAK THE LINK'), e.x, e.y - 70);
      }
      this.telegraph(e);
    }
    for (const r of g.rings) {
      c.strokeStyle = RED; c.lineWidth = 7; c.beginPath(); c.arc(r.x, r.y, r.radius, 0, TAU); c.stroke();
      c.strokeStyle = '#ff827d35'; c.lineWidth = 22; c.stroke();
    }
    for (const e of [...g.enemies].sort((a, b) => a.y - b.y)) if (e.spawn <= 0) this.enemy(e);
    if (g.mode !== 'title' || !g.enemies.length) this.player(p, g.mode === 'title');
    for (const q of g.projectiles) {
      c.strokeStyle = q.color + '65'; c.lineWidth = 3; c.beginPath(); c.moveTo(q.x - q.vx * .055, q.y - q.vy * .055); c.lineTo(q.x, q.y); c.stroke();
      c.fillStyle = q.color; c.beginPath(); c.arc(q.x, q.y, q.radius, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(q.x - 1, q.y - 1, 2, 0, TAU); c.fill();
      if (!q.friendly && distance(q, p) < 125) { c.strokeStyle = MINT; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, 12, 0, TAU); c.stroke(); }
    }
    const frozen = g.mode === 'paused';
    for (const e of this.effects) {
      if (!frozen) { e.life -= dt; if (e.kind === 'particle') { e.x += e.vx * dt; e.y += e.vy * dt; } }
      if (e.life <= 0) continue;
      c.globalAlpha = clamp(e.life / e.total, 0, 1); c.fillStyle = e.color; c.strokeStyle = e.color;
      if (e.kind === 'particle') { c.fillRect(e.x, e.y, e.size, e.size); }
      if (e.kind === 'text') {
        c.font = `bold ${e.text.length > 5 ? 15 : 18}px system-ui`; c.textAlign = 'center';
        c.fillText(t(e.text), e.x, e.y - (e.total - e.life) * 23);
      }
      if (e.kind === 'ghost') { c.globalAlpha *= .25; this.figure(e.x, e.y, e.color, 1, e.angle, 0, false); }
      if (e.kind === 'ring') { c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y, Math.max(1, e.radius * (1 - e.life / e.total)), 0, TAU); c.stroke(); }
      if (e.kind === 'slash') { c.lineWidth = 7; c.beginPath(); c.arc(e.x, e.y, 65, e.angle - 1.1, e.angle + 1.1); c.stroke(); }
      c.globalAlpha = 1;
    }
    this.effects = this.effects.filter(e => e.life > 0);
    if (g.mode === 'combat' && p.hp < p.maxHp * .3) {
      const vignette = c.createRadialGradient(480, 300, 230, 480, 300, 560);
      vignette.addColorStop(0, '#ff827d00'); vignette.addColorStop(1, '#a8213038'); c.fillStyle = vignette; c.fillRect(0, 0, 960, 600);
    }
    c.restore();
  }
  hazard(h) {
    const c = this.ctx, warning = h.warning > 0;
    if (h.vx && warning) { c.strokeStyle = '#ffd08855'; c.lineWidth = h.radius * 2; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + h.vx * 4.4, h.y); c.stroke(); }
    c.save(); c.fillStyle = warning ? '#ffd08812' : h.friendly ? '#ffad7835' : h.explosive ? '#ff827d65' : '#ca70be50'; c.strokeStyle = warning || h.friendly ? GOLD : '#e7a0da'; c.lineWidth = 2;
    if (this.settings.contrast) { c.strokeStyle = '#fff'; c.lineWidth = 3; }
    c.beginPath(); c.arc(h.x, h.y, h.radius, 0, TAU); c.fill();
    if (warning) c.setLineDash([6, 7]); c.stroke(); c.setLineDash([]);
    c.clip(); c.strokeStyle = warning ? '#ffd08830' : '#edb3df55'; c.lineWidth = 1;
    for (let i = -h.radius * 2; i < h.radius * 2; i += 15) { c.beginPath(); c.moveTo(h.x - h.radius, h.y + i); c.lineTo(h.x + h.radius, h.y + i - h.radius * 2); c.stroke(); }
    c.restore();
    if (this.settings.cues && !h.friendly) { c.fillStyle = '#fff'; c.font = 'bold 20px system-ui'; c.textAlign = 'center'; c.fillText('×', h.x, h.y + 7); }
  }
  target(t, done) {
    const c = this.ctx, pulse = this.settings.reduced ? 0 : Math.sin(this.time * 4) * 3;
    c.fillStyle = done ? '#9aefd933' : '#ffd08812'; c.strokeStyle = done ? MINT : GOLD; c.lineWidth = 2;
    c.beginPath(); c.arc(t.x, t.y, 36 + pulse, 0, TAU); c.fill(); c.stroke();
    c.setLineDash([3, 7]); c.beginPath(); c.arc(t.x, t.y, 46, 0, TAU); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(t.x - 7, t.y); c.lineTo(t.x + 7, t.y); c.moveTo(t.x, t.y - 7); c.lineTo(t.x, t.y + 7); c.stroke();
  }
  obstacle(o) {
    const c = this.ctx;
    c.fillStyle = '#050c1670'; c.beginPath(); c.ellipse(o.x + 6, o.y + 14, o.radius + 6, o.radius * .7, 0, 0, TAU); c.fill();
    c.fillStyle = '#18202d'; c.strokeStyle = '#748591'; c.lineWidth = 1.5;
    c.beginPath();
    for (let i = 0; i <= 8; i++) { const a = i / 8 * TAU, r = o.radius * (i % 2 ? .88 : 1); const x = o.x + Math.cos(a) * r, y = o.y + Math.sin(a) * r; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.fill(); c.stroke(); c.save(); c.clip(); c.strokeStyle = '#74859145';
    for (let i = -40; i < 50; i += 8) { c.beginPath(); c.moveTo(o.x - 40, o.y + i); c.lineTo(o.x + 40, o.y + i - 40); c.stroke(); }
    c.restore();
  }
  prop(o) {
    const c = this.ctx, barrel = o.type === 'barrel';
    c.fillStyle = barrel ? '#45293b' : '#263b40'; c.strokeStyle = barrel ? '#ffad78' : '#a8c4c6'; c.lineWidth = 2;
    if (barrel) { c.beginPath(); c.ellipse(o.x, o.y, o.radius, o.radius * .85, 0, 0, TAU); c.fill(); c.stroke(); }
    else { c.fillRect(o.x - o.radius, o.y - o.radius, o.radius * 2, o.radius * 2); c.strokeRect(o.x - o.radius, o.y - o.radius, o.radius * 2, o.radius * 2); }
    c.beginPath(); c.moveTo(o.x - 10, o.y - 10); c.lineTo(o.x + 10, o.y + 10); c.moveTo(o.x + 10, o.y - 10); c.lineTo(o.x - 10, o.y + 10); c.stroke();
    c.fillStyle = '#070e18'; c.fillRect(o.x - 20, o.y - o.radius - 9, 40, 3); c.fillStyle = c.strokeStyle; c.fillRect(o.x - 20, o.y - o.radius - 9, 40 * o.hp / o.maxHp, 3);
    if (o.type === 'anchor') { c.strokeStyle = '#6ed9f2'; c.lineWidth = 3; c.beginPath(); c.arc(o.x, o.y, o.radius + 9, 0, TAU); c.stroke(); c.fillStyle = '#c0f4ff'; c.font = 'bold 13px system-ui'; c.textAlign = 'center'; c.fillText(t('ANCHOR'), o.x, o.y - o.radius - 19); }
  }
  telegraph(e) {
    const c = this.ctx;
    if (e.spawn > 0) {
      c.globalAlpha = clamp(1.6 - e.spawn, .15, .8); c.strokeStyle = e.color; c.lineWidth = 1.5; c.setLineDash([4, 6]);
      c.beginPath(); c.ellipse(e.x, e.y, e.radius + 15, e.radius + 10, 0, 0, TAU); c.stroke(); c.setLineDash([]);
      c.font = 'bold 17px monospace'; c.textAlign = 'center'; c.fillStyle = e.color; c.fillText('+', e.x, e.y + 6); c.globalAlpha = 1; return;
    }
    if (e.state === 'recover' && !e.dummy && !e.trainer) {
      c.strokeStyle = '#9aefd950'; c.lineWidth = 1.5; c.setLineDash([2, 5]); c.beginPath(); c.arc(e.x, e.y, e.radius + 10, 0, TAU); c.stroke(); c.setLineDash([]);
      if (this.settings.cues) { c.fillStyle = MINT; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText('+', e.x, e.y - (e.boss ? 88 : 55)); }
    }
    if (e.state !== 'windup') return;
    const progress = 1 - clamp(e.stateTime / e.windup, 0, 1);
    c.strokeStyle = this.settings.contrast ? '#fff' : e.color; c.fillStyle = e.color + (progress > .7 ? '35' : '18'); c.lineWidth = this.settings.contrast ? 3 : 2;
    if (e.attack === 'charge' || e.attack === 'thrust') {
      const length = e.type === 'brute' ? (e.phase === 2 ? 415 : 347) : e.type === 'knight' ? 286 : 206, width = e.radius + 9;
      c.save(); c.translate(e.x, e.y); c.rotate(e.facing); c.fillRect(0, -width, length, width * 2); c.strokeRect(0, -width, length, width * 2);
      c.setLineDash([8, 7]); c.beginPath(); c.moveTo(0, 0); c.lineTo(length, 0); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.moveTo(length - 16, -8); c.lineTo(length, 0); c.lineTo(length - 16, 8); c.stroke(); c.restore();
    }
    if (['slash', 'shieldSwing', 'doubleSlash'].includes(e.attack)) {
      c.beginPath(); c.moveTo(e.x, e.y); c.arc(e.x, e.y, e.attack === 'doubleSlash' ? 135 : e.attack === 'shieldSwing' ? 112 : 87, e.facing - 1.2, e.facing + 1.2); c.closePath(); c.fill(); c.stroke();
    }
    if (e.attack === 'slam') {
      c.beginPath(); c.arc(e.x, e.y, 285, 0, TAU); c.fill(); c.setLineDash([6, 9]); c.stroke(); c.setLineDash([]);
      c.beginPath(); c.arc(e.x, e.y, Math.max(2, 62 * (1 - progress)), 0, TAU); c.stroke();
    }
    if (e.attack === 'blot' || e.attack === 'blots' || e.attack === 'redact' || e.attack === 'tide') {
      for (const target of e.targets || []) {
        this.hazard({ ...target, warning: e.stateTime });
        c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.arc(target.x, target.y, Math.max(2, target.radius * (1 - progress)), 0, TAU); c.stroke();
      }
    }
    if (['summon', 'callMender', 'mend'].includes(e.attack)) { c.setLineDash([4, 6]); c.beginPath(); c.arc(e.x, e.y, 70, 0, TAU); c.stroke(); c.setLineDash([]); }
    if (e.attack === 'snipe') { c.setLineDash([8, 6]); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(e.facing) * 1000, e.y + Math.sin(e.facing) * 1000); c.stroke(); c.setLineDash([]); }
    if (['shot', 'fan', 'quill', 'orbit'].includes(e.attack)) {
      const count = e.attack === 'orbit' ? (e.phase === 2 ? 16 : 12) : e.attack === 'quill' ? (e.phase === 2 ? 11 : 7) : e.attack === 'fan' ? (e.phase === 2 ? 9 : 7) : 1;
      c.setLineDash([3, 8]);
      for (let i = 0; i < count; i++) { const a = e.attack === 'orbit' ? e.facing + i * TAU / count : e.facing + (i - (count - 1) / 2) * (e.attack === 'quill' ? .22 : .3); c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.x + Math.cos(a) * 160, e.y + Math.sin(a) * 160); c.stroke(); }
      c.setLineDash([]);
    }
    c.strokeStyle = progress > .78 ? '#fff1cf' : e.color; c.lineWidth = 3;
    c.beginPath(); c.arc(e.x, e.y, e.radius + 10, -Math.PI / 2, -Math.PI / 2 + progress * TAU); c.stroke();
    c.font = 'bold 22px system-ui'; c.textAlign = 'center'; c.fillStyle = GOLD;
    c.fillText(this.settings.cues ? (['mend', 'callMender'].includes(e.attack) ? '!' : ['blot', 'blots', 'redact', 'summon', 'tide', 'tether'].includes(e.attack) ? '×' : '◇') : '!', e.x, e.y - (e.boss ? 88 : 55));
  }
  figure(x, y, color, scale, facing, walk, sword = false, heavy = false, weapon = 'scrapsteel') {
    const c = this.ctx, stride = Math.sin(walk) * 5;
    c.save(); c.translate(x, y); c.scale(scale, scale); c.strokeStyle = color; c.fillStyle = '#131e29';
    c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = heavy ? 6 : 3.5;
    c.beginPath(); c.arc(0, -28, heavy ? 12 : 8.5, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(0, -18); c.lineTo(0, 2); c.lineTo(-11 - stride, 16); c.moveTo(0, 2); c.lineTo(11 + stride, 16);
    c.moveTo(0, -11); c.lineTo(-13, -2 + stride * .25); c.moveTo(0, -11); c.lineTo(Math.cos(facing) * 18, -6 + Math.sin(facing) * 12); c.stroke();
    if (sword) {
      c.save(); c.translate(Math.cos(facing) * 19, -6 + Math.sin(facing) * 12); c.rotate(facing);
      c.strokeStyle = WEAPONS[weapon].color; c.lineWidth = weapon === 'pagebreaker' ? 7 : weapon === 'emberbrand' ? 2.5 : 3;
      c.beginPath(); c.moveTo(-3, 0); c.lineTo(weapon === 'pagebreaker' ? 38 : weapon === 'emberbrand' ? 20 : 28, 0); c.moveTo(2, -5); c.lineTo(2, 5); c.stroke(); c.restore();
    }
    c.restore();
  }
  enemy(e) {
    const c = this.ctx, heavy = e.type === 'brute', scale = heavy ? 1.85 : e.boss ? 1.45 : e.type === 'warder' ? 1.2 : e.type === 'skitter' ? .92 : 1;
    if (this.settings.contrast || e.champion) { c.strokeStyle = this.settings.contrast ? '#ffffff' : GOLD; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.radius + 5, 0, TAU); c.stroke(); }
    if (e.type === 'mender') { c.strokeStyle = '#79e5d4'; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x - 8, e.y - 53); c.lineTo(e.x + 8, e.y - 53); c.moveTo(e.x, e.y - 61); c.lineTo(e.x, e.y - 45); c.stroke(); }
    if (e.type === 'leech') { c.strokeStyle = '#b7a5ff'; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y - 28, 17, 0, TAU); c.stroke(); }
    if (e.type === 'tidekeeper') { c.strokeStyle = '#6ed9f2'; c.lineWidth = 3; c.beginPath(); c.arc(e.x, e.y, e.radius + 14, 0, TAU); c.stroke(); for (const anchor of this.game.props.filter(o => o.type === 'anchor' && o.hp > 0)) { c.strokeStyle = '#6ed9f277'; c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(anchor.x, anchor.y); c.stroke(); } }
    c.fillStyle = '#02061165'; c.beginPath(); c.ellipse(e.x, e.y + 16 * scale, e.radius + 5, e.radius * .4, 0, 0, TAU); c.fill();
    if (e.burn > 0) { c.strokeStyle = '#ffad78'; c.lineWidth = 2; c.setLineDash([3, 4]); c.beginPath(); c.arc(e.x, e.y, e.radius + 7, 0, TAU); c.stroke(); c.setLineDash([]); }
    if (e.type === 'queen') {
      c.strokeStyle = e.color; c.lineWidth = 3; c.beginPath();
      c.moveTo(e.x - 20, e.y - 65); c.lineTo(e.x - 15, e.y - 81); c.lineTo(e.x - 5, e.y - 70); c.lineTo(e.x + 3, e.y - 87); c.lineTo(e.x + 12, e.y - 70); c.lineTo(e.x + 22, e.y - 78); c.lineTo(e.x + 20, e.y - 60); c.stroke();
      c.fillStyle = e.phase === 2 ? '#d5a5ff25' : '#d5a5ff10'; c.beginPath(); c.ellipse(e.x, e.y + 14, 38, 15, 0, 0, TAU); c.fill();
    }
    if ((e.type === 'warder' || e.type === 'knight' && e.stance === 'shield') && ['approach', 'windup'].includes(e.state)) {
      c.strokeStyle = '#8fcbff'; c.lineWidth = 7; c.beginPath(); c.arc(e.x, e.y, 33, e.facing - 1.25, e.facing + 1.25); c.stroke();
    }
    if (e.type === 'blotter') {
      c.strokeStyle = e.color; c.fillStyle = '#df9cd933'; c.lineWidth = 2; c.beginPath(); c.arc(e.x + 20, e.y - 15, 13, 0, TAU); c.fill(); c.stroke();
    }
    if (e.type === 'spitter') {
      c.save(); c.translate(e.x, e.y); c.rotate(e.facing); c.fillStyle = e.color; c.beginPath(); c.moveTo(24, 0); c.lineTo(8, -9); c.lineTo(8, 9); c.closePath(); c.fill(); c.restore();
    }
    if (['weaver', 'summoner', 'palimpsest'].includes(e.type)) {
      c.strokeStyle = e.color; c.lineWidth = 2; c.beginPath(); c.arc(e.x, e.y - 31, e.type === 'palimpsest' ? 36 : 25, 0, TAU); c.stroke();
      if (e.type === 'weaver') { c.beginPath(); c.moveTo(e.x - 16, e.y - 50); c.lineTo(e.x + 16, e.y - 14); c.moveTo(e.x + 16, e.y - 50); c.lineTo(e.x - 16, e.y - 14); c.stroke(); }
    }
    if (e.type === 'knight') { c.strokeStyle = e.color; c.lineWidth = 4; c.beginPath(); c.moveTo(e.x - 18, e.y - 45); c.lineTo(e.x + 18, e.y - 45); c.moveTo(e.x, e.y - 64); c.lineTo(e.x, e.y - 43); c.stroke(); }
    if (e.type === 'sniper') { c.strokeStyle = e.color; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x, e.y - 12); c.lineTo(e.x + Math.cos(e.facing) * 49, e.y - 12 + Math.sin(e.facing) * 49); c.stroke(); }
    this.figure(e.x, e.y, e.flash > 0 ? '#ffffff' : e.color, scale, e.facing, e.walk, ['scrapper', 'duelist', 'knight'].includes(e.type), heavy, e.type === 'knight' ? 'pagebreaker' : 'scrapsteel');
    if (e.type === 'duelist') { c.strokeStyle = e.color; c.lineWidth = 3; c.beginPath(); c.moveTo(e.x - 13, e.y - 2); c.lineTo(e.x - 35, e.y - 26); c.stroke(); }
    if (heavy) {
      c.strokeStyle = '#ff827d95'; c.lineWidth = 2;
      for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(e.x - 17, e.y - 55 + i * 6); c.lineTo(e.x + 17, e.y - 44 + i * 6); c.stroke(); }
    }
    if (e.type === 'skitter') { c.strokeStyle = e.color; c.lineWidth = 2; c.beginPath(); c.moveTo(e.x - 10, e.y - 33); c.lineTo(e.x - 18, e.y - 49); c.moveTo(e.x + 7, e.y - 33); c.lineTo(e.x + 12, e.y - 47); c.stroke(); }
    if (!e.boss && !e.dummy && !e.trainer && e.hp < e.maxHp) {
      c.fillStyle = '#070e18'; c.fillRect(e.x - 19, e.y - 51, 38, 4); c.fillStyle = e.color; c.fillRect(e.x - 19, e.y - 51, 38 * e.hp / e.maxHp, 4);
    }
    if (e.dummy || e.trainer) { c.font = '12px monospace'; c.textAlign = 'center'; c.fillStyle = '#a7bac7'; c.fillText(t('PRACTICE'), e.x, e.y - 56); }
  }
  player(p, title = false) {
    const c = this.ctx;
    c.fillStyle = '#02071080'; c.beginPath(); c.ellipse(p.x, p.y + 19, 23, 9, 0, 0, TAU); c.fill();
    c.strokeStyle = '#9aefd938'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(p.x, p.y + 13, 23, 11, 0, 0, TAU); c.stroke();
    if (p.invulnerable > 0 && !p.dash && !this.settings.reduced) c.globalAlpha = .65 + Math.sin(this.time * 38) * .25;
    const color = p.flash > 0 ? RED : this.game.forms.appearance === 'master' ? '#fff1ca' : INK;
    const swingAngle = p.attack ? p.attack.angle + (p.attack.combo === 2 ? 1 : -1) * (1 - p.attack.age / p.attack.duration * 2) * 1.3 : p.facing;
    this.figure(p.x, p.y, color, 1.12, swingAngle, title ? 0 : p.walk, !p.guarding, false, p.weapon);
    c.globalAlpha = 1;
    c.strokeStyle = this.game.forms.appearance === 'master' ? WEAPONS[p.weapon].color : MINT; c.lineWidth = this.game.forms.appearance === 'master' ? 6 : 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(p.x - 6, p.y - 21); c.lineTo(p.x + 7, p.y - 21); c.lineTo(p.x + 14 + (this.settings.reduced ? 0 : Math.sin(this.time * 5) * 3), p.y - 11); c.stroke();
    if (p.counter > 0) { c.strokeStyle = MINT; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, 34, 0, TAU); c.stroke(); }
    if (!title && !p.attack && !p.guarding) {
      c.strokeStyle = '#dce7eb55'; c.lineWidth = 1.5; c.beginPath(); c.arc(p.x, p.y, 45, p.facing - .22, p.facing + .22); c.stroke();
    }
    if (p.guarding) {
      c.strokeStyle = p.guardAge < .23 ? MINT : GOLD; c.lineWidth = p.guardAge < .23 ? 7 : 5;
      c.beginPath(); c.arc(p.x, p.y, 36, p.facing - 1.15, p.facing + 1.15); c.stroke();
      c.strokeStyle = '#ffd08828'; c.lineWidth = 14; c.stroke();
    }
    if (p.attack) {
      const a = p.attack, fraction = a.age / a.duration;
      c.save(); c.globalAlpha = (1 - fraction) * .8; c.lineWidth = a.combo === 3 ? 16 : 10;
      c.strokeStyle = a.color; c.beginPath(); c.arc(p.x, p.y, a.range * .84, a.angle - a.arc / 2, a.angle + a.arc / 2); c.stroke();
      c.globalAlpha *= .25; c.lineWidth *= 2; c.stroke(); c.restore();
    }
  }
}
