import { UPGRADES, ROOMS, playerStats } from './config.js';
const RUN_KEY = 'weby.stickSwing.run.v2';
const PROFILE_KEY = 'weby.stickSwing.profile.v2';
const SETTINGS_KEY = 'weby.stickSwing.settings.v2';
const allowed = new Set(UPGRADES.map(u => u.id));
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export function validateCheckpoint(value) {
  if (!value || value.version !== 2 || !['combat', 'reward'].includes(value.phase)) return null;
  if (!Number.isInteger(value.room) || value.room < 0 || value.room >= ROOMS.length) return null;
  if (!Array.isArray(value.upgrades) || value.upgrades.length > 3 || new Set(value.upgrades).size !== value.upgrades.length || value.upgrades.some(x => !allowed.has(x))) return null;
  if (!finite(value.hp, 1, playerStats(value.upgrades).maxHp) || !finite(value.seed, 1, 4294967295)) return null;
  const s = value.stats;
  if (!s || !finite(s.time, 0, 86400) || !finite(s.kills, 0, 1000) || !finite(s.parries, 0, 10000) || !finite(s.damageTaken, 0, 100000)) return null;
  if (value.phase === 'reward') {
    if (value.room === ROOMS.length - 1 || !Array.isArray(value.choices) || value.choices.length !== 3 || new Set(value.choices).size !== 3 || value.choices.some(x => !allowed.has(x) || value.upgrades.includes(x))) return null;
  }
  return structuredClone(value);
}
export class SaveStore {
  constructor(storage) { this.storage = storage; this.available = true; }
  read(key) {
    try { const raw = this.storage?.getItem(key); return raw ? JSON.parse(raw) : null; }
    catch { this.available = false; return null; }
  }
  write(key, value) {
    try { if (!this.storage) throw new Error('No storage'); this.storage.setItem(key, JSON.stringify(value)); return true; }
    catch { this.available = false; return false; }
  }
  loadRun() { return validateCheckpoint(this.read(RUN_KEY)); }
  saveRun(value) { const valid = validateCheckpoint(value); return valid ? this.write(RUN_KEY, valid) : false; }
  clearRun() { try { this.storage?.removeItem(RUN_KEY); } catch { this.available = false; } }
  profile() {
    const p = this.read(PROFILE_KEY) || {};
    return { tutorialDone: p.tutorialDone === true, wins: finite(p.wins, 0, 100000) ? Math.floor(p.wins) : 0,
      bestTime: finite(p.bestTime, 1, 86400) ? p.bestTime : null };
  }
  saveProfile(value) { return this.write(PROFILE_KEY, value); }
  settings(reduced = false) {
    const s = this.read(SETTINGS_KEY) || {};
    return { sound: s.sound !== false, reduced: typeof s.reduced === 'boolean' ? s.reduced : reduced, holdAttack: s.holdAttack !== false };
  }
  saveSettings(value) { return this.write(SETTINGS_KEY, value); }
}
