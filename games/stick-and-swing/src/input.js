import { WORLD, clamp } from './config.js';
import { idleInput } from './engine.js';
export class Input {
  constructor(canvas, active, onPause, unlock) {
    this.canvas = canvas; this.active = active; this.onPause = onPause; this.unlock = unlock;
    this.keys = new Set(); this.mouseAttack = false; this.mouseGuard = false;
    this.touchAttack = false; this.touchGuard = false; this.stick = { x: 0, y: 0 };
    this.attackPressed = false; this.dashPressed = false; this.aim = null; this.touch = false;
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' && !e.repeat) { if (this.active()) { e.preventDefault(); onPause(); } return; }
      if (!this.active() || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight', 'KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); this.unlock();
      if (e.code === 'Space') { this.attackPressed = true; this.aim = null; }
      if (e.code.startsWith('Shift')) this.dashPressed = true;
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      this.aim = { x: (e.clientX - rect.left) / rect.width * WORLD.width, y: (e.clientY - rect.top) / rect.height * WORLD.height };
      this.touch = false;
    });
    canvas.addEventListener('pointerdown', e => {
      if (!this.active() || e.pointerType !== 'mouse') return;
      e.preventDefault(); canvas.focus({ preventScroll: true }); unlock();
      if (e.button === 0) { this.mouseAttack = true; this.attackPressed = true; }
      if (e.button === 2) this.mouseGuard = true;
    });
    window.addEventListener('pointerup', e => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) this.mouseAttack = false;
      if (e.button === 2) this.mouseGuard = false;
    });
    window.addEventListener('blur', () => this.clear());
    this.bindTouch();
  }
  bindTouch() {
    const stick = document.getElementById('joystick'), thumb = document.getElementById('stick-thumb');
    let stickId = null;
    this.touchResets = [() => {
      const id = stickId; stickId = null;
      if (id !== null && stick.hasPointerCapture?.(id)) stick.releasePointerCapture(id);
      thumb.style.transform = '';
    }];
    const move = e => {
      if (e.pointerId !== stickId) return;
      const r = stick.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const len = Math.hypot(dx, dy), scale = Math.min(1, 36 / Math.max(1, len));
      this.stick = { x: dx * scale / 36, y: dy * scale / 36 };
      thumb.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    };
    const stop = e => { if (e.pointerId !== stickId) return; stickId = null; this.stick = { x: 0, y: 0 }; thumb.style.transform = ''; };
    stick.addEventListener('pointerdown', e => {
      if (!this.active() || stickId !== null) return;
      e.preventDefault(); this.touch = true; this.aim = null; stickId = e.pointerId; stick.setPointerCapture(e.pointerId); this.unlock(); move(e);
    });
    stick.addEventListener('pointermove', move); stick.addEventListener('pointerup', stop);
    stick.addEventListener('pointercancel', stop); stick.addEventListener('lostpointercapture', stop);
    for (const action of ['attack', 'guard', 'dash']) {
      const button = document.getElementById(`touch-${action}`);
      const ids = new Set();
      this.touchResets.push(() => {
        for (const id of ids) if (button.hasPointerCapture?.(id)) button.releasePointerCapture(id);
        ids.clear(); button.classList.remove('pressed');
      });
      button.addEventListener('pointerdown', e => {
        if (!this.active()) return;
        e.preventDefault(); this.touch = true; this.aim = null; this.unlock(); ids.add(e.pointerId); button.setPointerCapture(e.pointerId);
        if (action === 'attack') { this.touchAttack = true; this.attackPressed = true; }
        if (action === 'guard') this.touchGuard = true;
        if (action === 'dash') this.dashPressed = true;
        button.classList.add('pressed');
      });
      const end = e => {
        ids.delete(e.pointerId); if (ids.size) return;
        if (action === 'attack') this.touchAttack = false;
        if (action === 'guard') this.touchGuard = false;
        button.classList.remove('pressed');
      };
      button.addEventListener('pointerup', end); button.addEventListener('pointercancel', end); button.addEventListener('lostpointercapture', end);
      button.addEventListener('contextmenu', e => e.preventDefault());
    }
  }
  clear() {
    this.touchResets?.forEach(reset => reset());
    this.keys.clear(); this.mouseAttack = this.mouseGuard = this.touchAttack = this.touchGuard = false;
    this.attackPressed = this.dashPressed = false; this.stick = { x: 0, y: 0 };
    const thumb = document.getElementById('stick-thumb'); if (thumb) thumb.style.transform = '';
    document.querySelectorAll('.touch-action.pressed').forEach(el => el.classList.remove('pressed'));
  }
  sample(holdAttack = true, consume = true) {
    const value = idleInput(), k = this.keys;
    value.moveX = clamp((k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0) + this.stick.x, -1, 1);
    value.moveY = clamp((k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) + this.stick.y, -1, 1);
    value.attackHeld = holdAttack && (this.mouseAttack || this.touchAttack || k.has('Space'));
    value.attackPressed = this.attackPressed;
    value.guardHeld = this.mouseGuard || this.touchGuard || k.has('KeyF');
    value.dashPressed = this.dashPressed;
    value.autoAim = this.touch || !this.aim;
    if (this.aim && !this.touch) { value.aimX = this.aim.x; value.aimY = this.aim.y; }
    if (consume) { this.attackPressed = false; this.dashPressed = false; }
    return value;
  }
}
