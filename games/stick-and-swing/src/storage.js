import { UPGRADES, ROUTE, NODES, WEAPONS, availableUpgrades, playerStats, freshStats } from './config.js?v=2.1.0';
const RUN_KEY = 'weby.stickSwing.run.v3';
const PROFILE_KEY = 'weby.stickSwing.profile.v2';
const SETTINGS_KEY = 'weby.stickSwing.settings.v2';
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const unique = value => Array.isArray(value) && new Set(value).size === value.length;
export function validateCheckpoint(value) {
  if (!value || value.version !== 3 || !['route', 'story', 'combat', 'reward', 'shop', 'rest'].includes(value.phase)) return null;
  const { phase, room, weapon, node, path, upgrades, hp, seed, ink, stats } = value;
  if (!Object.hasOwn(WEAPONS, weapon) || !Number.isInteger(room) || room < -1 || room >= ROUTE.length) return null;
  if (!unique(path) || path.length !== room + 1 || path.some((id, i) => !ROUTE[i].includes(id)) || node !== (path.at(-1) ?? null)) return null;
  if (room === -1 && phase !== 'route' || phase === 'route' && room === ROUTE.length - 1) return null;
  const eligible = availableUpgrades(weapon).map(u => u.id);
  if (!unique(upgrades) || upgrades.length > eligible.length || upgrades.some(id => !eligible.includes(id))) return null;
  if (!finite(hp, 1, playerStats(upgrades, weapon).maxHp) || !Number.isInteger(seed) || !finite(seed, 1, 4294967295) || !Number.isInteger(ink) || !finite(ink, 0, 1000000)) return null;
  if (!stats || Object.keys(freshStats()).some(key => !finite(stats[key], 0, 1000000))) return null;
  const kind = NODES[node]?.kind;
  if (['combat', 'reward'].includes(phase) && !['combat', 'elite', 'boss'].includes(kind)) return null;
  if (phase === 'story' && !NODES[node]?.story || phase === 'shop' && kind !== 'shop' || phase === 'rest' && kind !== 'rest') return null;
  const result = { version: 3, phase, room, weapon, node, path: [...path], upgrades: [...upgrades], hp, seed, ink,
    stats: Object.fromEntries(Object.keys(freshStats()).map(k => [k, stats[k]])) };
  if (phase === 'reward') {
    const choices = value.choices, available = availableUpgrades(weapon, upgrades).map(u => u.id);
    if (node === 'queen' || !unique(choices) || choices.length !== Math.min(3, available.length) || choices.some(id => !available.includes(id))) return null;
    result.choices = [...choices];
  }
  if (phase === 'shop') {
    const { stock, purchased } = value;
    if (!unique(stock) || stock.length < 1 || stock.length > 3 || !stock.includes('mend') || stock.some(id => id !== 'mend' && !eligible.includes(id))) return null;
    if (!unique(purchased) || purchased.some(id => !stock.includes(id)) || stock.some(id => id !== 'mend' && upgrades.includes(id) !== purchased.includes(id))) return null;
    result.stock = [...stock]; result.purchased = [...purchased];
  }
  return result;
}
export class SaveStore {
  constructor(storage) { this.storage = storage; this.available = !!storage; }
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
      bestTime: finite(p.bestTime, 1, 86400) ? p.bestTime : null,
      adventureWins: finite(p.adventureWins, 0, 100000) ? Math.floor(p.adventureWins) : 0,
      adventureBest: finite(p.adventureBest, 1, 86400) ? p.adventureBest : null };
  }
  saveProfile(value) { return this.write(PROFILE_KEY, value); }
  settings(reduced = false) {
    const s = this.read(SETTINGS_KEY) || {};
    return { sound: s.sound !== false, reduced: typeof s.reduced === 'boolean' ? s.reduced : reduced, holdAttack: s.holdAttack !== false };
  }
  saveSettings(value) { return this.write(SETTINGS_KEY, value); }
}
