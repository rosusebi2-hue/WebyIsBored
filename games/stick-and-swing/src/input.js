import { WORLD, DEFAULT_BINDINGS, clamp } from './config.js?v=2.4.0';
import { idleInput } from './engine.js?v=2.4.0';
export const keyLabel = code => code.replace(/^Key|^Digit/, '').replace('ShiftLeft', 'Left Shift').replace('ShiftRight', 'Right Shift').replace('Arrow', '');
export class Input {
  constructor(canvas, active, onPause, unlock, settings = {}) {
    this.canvas = canvas; this.active = active; this.onPause = onPause; this.unlock = unlock;
    this.settings = settings; this.pad = null; this.padPrevious = []; this.menuAxis = 0; this.connected = false;
    this.keys = new Set(); this.mouseAttack = false; this.mouseGuard = false;
    this.touchAttack = false; this.touchGuard = false; this.stick = { x: 0, y: 0 };
    this.attackPressed = false; this.dashPressed = false; this.abilityPressed = false; this.aim = null; this.touch = false;
    window.addEventListener('keydown', e => {
      const bindings = this.settings.bindings || DEFAULT_BINDINGS;
      if (e.code === bindings.pause && !e.repeat) { if (this.active()) { e.preventDefault(); onPause(); } return; }
      if (!this.active() || /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName)) return;
      if ([...Object.values(bindings), 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code); this.unlock();
      if (e.code === bindings.attack) { this.attackPressed = true; this.aim = null; }
      if (e.code === bindings.dash) this.dashPressed = true;
      if (e.code === bindings.ability) this.abilityPressed = true;
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
      const r = canvas.getBoundingClientRect();
      this.aim = { x: (e.clientX - r.left) / r.width * WORLD.width, y: (e.clientY - r.top) / r.height * WORLD.height }; this.touch = false;
      if (e.button === 0) { this.mouseAttack = true; this.attackPressed = true; }
      if (e.button === 2) this.mouseGuard = true;
    });
    window.addEventListener('pointerup', e => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 0) this.mouseAttack = false;
      if (e.button === 2) this.mouseGuard = false;
    });
    window.addEventListener('pointercancel', e => { if (e.pointerType === 'mouse') { this.mouseAttack = false; this.mouseGuard = false; } });
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
      const r = stick.getBoundingClientRect(), size = r.height / 116 || 1, dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + 51 * size);
      const len = Math.hypot(dx, dy), scale = Math.min(1, 36 * size / Math.max(1, len));
      this.stick = { x: dx * scale / (36 * size), y: dy * scale / (36 * size) };
      thumb.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    };
    const stop = e => { if (e.pointerId !== stickId) return; stickId = null; this.stick = { x: 0, y: 0 }; thumb.style.transform = ''; };
    stick.addEventListener('pointerdown', e => {
      if (!this.active() || stickId !== null) return;
      e.preventDefault(); this.touch = true; this.aim = null; stickId = e.pointerId; stick.setPointerCapture(e.pointerId); this.unlock(); move(e);
    });
    stick.addEventListener('pointermove', move); stick.addEventListener('pointerup', stop);
    stick.addEventListener('pointercancel', stop); stick.addEventListener('lostpointercapture', stop);
    for (const action of ['attack', 'guard', 'dash', 'ability']) {
      const button = document.getElementById(`touch-${action}`);
      if (!button) continue;
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
        if (action === 'ability') this.abilityPressed = true;
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
    this.attackPressed = this.dashPressed = this.abilityPressed = false; this.stick = { x: 0, y: 0 };
    const thumb = document.getElementById('stick-thumb'); if (thumb) thumb.style.transform = '';
    document.querySelectorAll('.touch-action.pressed').forEach(el => el.classList.remove('pressed'));
  }
  pollGamepad() {
    let pad;
    try { pad = Array.from(navigator.getGamepads?.() || []).find(p => p?.connected && p.mapping === 'standard'); } catch { pad = null; }
    if (!pad) {
      if (this.connected) { this.clear(); if (this.active()) this.onPause(); }
      this.pad = null; this.connected = false; this.padPrevious = []; this.menuAxis = 0; return;
    }
    const buttons = pad.buttons.map(b => b.pressed || b.value > .5), edge = i => buttons[i] && !this.padPrevious[i];
    const axis = i => Math.abs(pad.axes[i] || 0) > .18 ? pad.axes[i] : 0;
    this.pad = { buttons, x: axis(0), y: axis(1), aimX: axis(2), aimY: axis(3) }; this.connected = true;
    if (this.active()) {
      if (edge(2)) this.attackPressed = true;
      if (edge(0)) this.dashPressed = true;
      if (edge(3)) this.abilityPressed = true;
      if (edge(9)) this.onPause();
    } else {
      const direction = buttons[13] || buttons[15] || axis(1) > .5 ? 1 : buttons[12] || buttons[14] || axis(1) < -.5 ? -1 : 0;
      const controls = [...document.querySelectorAll('dialog[open] button:not(:disabled), dialog[open] a, dialog[open] input, dialog[open] select, dialog[open] summary')];
      if (direction && direction !== this.menuAxis && controls.length) {
        const at = controls.indexOf(document.activeElement); controls[(at + direction + controls.length) % controls.length].focus();
      }
      if (edge(0)) {
        const el = document.activeElement;
        if (el?.tagName === 'SELECT') {
          for (let step = 1; step <= el.options.length; step++) { const next = (el.selectedIndex + step) % el.options.length; if (!el.options[next].disabled) { el.selectedIndex = next; el.dispatchEvent(new Event('change', { bubbles: true })); break; } }
        } else el?.click?.();
      }
      this.menuAxis = direction;
    }
    if (buttons.some((down, i) => down && !this.padPrevious[i])) this.unlock();
    this.padPrevious = buttons;
  }
  sample(holdAttack = true, consume = true, player = { x: 480, y: 300 }) {
    const value = idleInput(), k = this.keys, b = this.settings.bindings || DEFAULT_BINDINGS, pad = this.pad;
    const moving = (action, arrow) => k.has(b[action]) || !Object.values(b).includes(arrow) && k.has(arrow);
    value.moveX = clamp((moving('right', 'ArrowRight') ? 1 : 0) - (moving('left', 'ArrowLeft') ? 1 : 0) + this.stick.x + (pad?.x || 0), -1, 1);
    value.moveY = clamp((moving('down', 'ArrowDown') ? 1 : 0) - (moving('up', 'ArrowUp') ? 1 : 0) + this.stick.y + (pad?.y || 0), -1, 1);
    value.attackHeld = holdAttack && (this.mouseAttack || this.touchAttack || k.has(b.attack) || !!pad?.buttons[2]);
    value.attackPressed = this.attackPressed;
    value.guardHeld = this.mouseGuard || this.touchGuard || k.has(b.guard) || !!pad?.buttons[7];
    value.dashPressed = this.dashPressed;
    value.abilityPressed = this.abilityPressed;
    value.autoAim = this.touch || !this.aim;
    if (this.aim && !this.touch) { value.aimX = this.aim.x; value.aimY = this.aim.y; }
    if (pad && (pad.aimX || pad.aimY)) { value.aimX = player.x + pad.aimX * 100; value.aimY = player.y + pad.aimY * 100; value.autoAim = false; }
    else if (pad && (pad.x || pad.y || pad.buttons.some(Boolean))) { value.aimX = value.aimY = null; value.autoAim = true; }
    if (consume) { this.attackPressed = false; this.dashPressed = false; this.abilityPressed = false; }
    return value;
  }
}
