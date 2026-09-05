import { ROUTE, RUSH_ROUTE, CHAPTER_ROUTE, KEEPSAKES, MEMORIES, keepsakeUnlocked, NODES, ENEMIES, EVENTS, WEAPONS, DEFAULT_BINDINGS, availableUpgrades, playerStats, freshStats, masteryEmpty, unlocked } from './config.js?v=2.3.0';
const STATE_KEY = 'weby.stickSwing.state.v4';
const SETTINGS_KEY = 'weby.stickSwing.settings.v2';
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const unique = value => Array.isArray(value) && new Set(value).size === value.length;
const metric = value => finite(value, 0, 1000000) ? Math.floor(value) : 0;
const forms = value => ({ finisher: value?.finisher === 'alternate' ? 'alternate' : 'standard', ability: value?.ability === 'alternate' ? 'alternate' : 'standard', appearance: value?.appearance === 'master' ? 'master' : 'classic' });
export function normalizeProfile(raw = {}) {
  const p = raw || {}, result = {
    tutorialDone: p.tutorialDone === true, wins: metric(p.wins), bestTime: finite(p.bestTime, 1, 86400) ? p.bestTime : null,
    adventureWins: metric(p.adventureWins), adventureBest: finite(p.adventureBest, 1, 86400) ? p.adventureBest : null,
    bookWins: metric(p.bookWins), bookBest: finite(p.bookBest, 1, 86400) ? p.bookBest : null,
    mastery: {}, loadouts: {}, rushBest: {}, chapterWins: metric(p.chapterWins),
    chapterBest: finite(p.chapterBest, 1, 86400) ? p.chapterBest : null,
    memories: [...new Set(Array.isArray(p.memories) ? p.memories.filter(id => Object.hasOwn(MEMORIES, id)) : [])], keepsake: 'thread',
    discovered: [...new Set(Array.isArray(p.discovered) ? p.discovered.filter(id => Object.hasOwn(ENEMIES, id)) : [])],
    rescued: [...new Set(Array.isArray(p.rescued) ? p.rescued.filter(id => ['rescue', 'echo'].includes(id)) : [])],
  };
  for (const weapon of Object.keys(WEAPONS)) {
    result.mastery[weapon] = Object.fromEntries(Object.keys(masteryEmpty()).map(key => [key, metric(p.mastery?.[weapon]?.[key])]));
    result.loadouts[weapon] = forms(p.loadouts?.[weapon]);
    for (const part of ['finisher', 'ability', 'appearance']) if (!unlocked(result, weapon, part)) result.loadouts[weapon][part] = part === 'appearance' ? 'classic' : 'standard';
    result.rushBest[weapon] = finite(p.rushBest?.[weapon], 1, 86400) ? p.rushBest[weapon] : null;
  }
  if (keepsakeUnlocked(result, p.keepsake)) result.keepsake = p.keepsake;
  return result;
}
export function validateCheckpoint(raw) {
  if (!raw || ![3, 4].includes(raw.version)) return null;
  let value = raw;
  if (raw.version === 3) value = { ...raw, version: 4, runMode: 'adventure', encounter: 'main', initialSeed: raw.seed, runId: `migrated-${raw.seed}`, forms: forms(), eventsSeen: [], eventId: null, afterReward: 'route' };
  if (!['route', 'story', 'combat', 'reward', 'shop', 'rest', 'event'].includes(value.phase)) return null;
  const { phase, room, weapon, node, path, upgrades, hp, seed, ink, stats, runMode, encounter, eventsSeen, eventId, afterReward, runId, initialSeed } = value;
  const route = runMode === 'rush' ? RUSH_ROUTE : runMode === 'chapter' ? CHAPTER_ROUTE : ROUTE;
  if (!['adventure', 'rush', 'chapter'].includes(runMode) || !['main', 'secret'].includes(encounter) || !['route', 'event'].includes(afterReward)) return null;
  if (runMode === 'chapter' && !Object.hasOwn(KEEPSAKES, value.keepsake)) return null;
  if (typeof runId !== 'string' || !/^[a-z0-9-]{1,64}$/.test(runId) || !Number.isInteger(initialSeed) || !finite(initialSeed, 1, 4294967295)) return null;
  if (!Object.hasOwn(WEAPONS, weapon) || !Number.isInteger(room) || room < -1 || room >= route.length) return null;
  if (!unique(path) || path.length !== room + 1 || path.some((id, i) => !route[i].includes(id)) || node !== (path.at(-1) ?? null)) return null;
  if (room === -1 && phase !== 'route' || phase === 'route' && room === route.length - 1) return null;
  const eligible = availableUpgrades(weapon, [], true).map(u => u.id);
  if (!unique(upgrades) || upgrades.length > eligible.length || upgrades.some(id => !eligible.includes(id))) return null;
  if (!finite(hp, 1, playerStats(upgrades, weapon).maxHp) || !Number.isInteger(seed) || !finite(seed, 1, 4294967295) || !Number.isInteger(ink) || !finite(ink, 0, 1000000)) return null;
  if (!stats || Object.keys(freshStats()).some(key => !finite(stats[key], 0, 1000000))) return null;
  if (!unique(eventsSeen) || eventsSeen.length > EVENTS.length || eventsSeen.some(id => !EVENTS.some(e => e.id === id))) return null;
  if (phase === 'event' && (!EVENTS.some(e => e.id === eventId) || eventsSeen.includes(eventId) || runMode !== 'adventure')) return null;
  if (encounter === 'secret' && (!eventsSeen.includes('duel') || !['combat', 'reward'].includes(phase) || runMode !== 'adventure')) return null;
  const kind = NODES[node]?.kind;
  if (['combat', 'reward'].includes(phase) && !['combat', 'elite', 'boss'].includes(kind)) return null;
  if (phase === 'story' && !NODES[node]?.story || phase === 'shop' && kind !== 'shop' || phase === 'rest' && kind !== 'rest') return null;
  const result = { version: 4, phase, room, weapon, node, path: [...path], upgrades: [...upgrades], hp, seed, ink, runMode, encounter, runId, initialSeed,
    forms: forms(value.forms), keepsake: runMode === 'chapter' ? value.keepsake : null, eventsSeen: [...eventsSeen], eventId: phase === 'event' ? eventId : null, afterReward,
    stats: Object.fromEntries(Object.keys(freshStats()).map(k => [k, stats[k]])) };
  if (phase === 'reward') {
    const choices = value.choices, available = encounter === 'secret' && !upgrades.includes('seal') ? ['seal'] : availableUpgrades(weapon, upgrades).map(u => u.id);
    if (['knight', 'eraser'].includes(node) || !unique(choices) || choices.length !== Math.min(3, available.length) || choices.some(id => !available.includes(id))) return null;
    result.choices = [...choices];
  }
  if (phase === 'shop') {
    const { stock, purchased } = value;
    if (!unique(stock) || stock.length < 1 || stock.length > 3 || !stock.includes('mend') || stock.some(id => id !== 'mend' && (!eligible.includes(id) || id === 'seal'))) return null;
    if (!unique(purchased) || purchased.some(id => !stock.includes(id)) || stock.some(id => id !== 'mend' && upgrades.includes(id) !== purchased.includes(id))) return null;
    result.stock = [...stock]; result.purchased = [...purchased];
  }
  return result;
}
function validHistory(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(r => r && typeof r.id === 'string' && r.id.length < 100 && Object.hasOwn(WEAPONS, r.weapon) && ['adventure', 'rush', 'chapter'].includes(r.mode) && ['victory', 'defeat'].includes(r.result) && finite(r.time, 0, 1000000) && Number.isInteger(r.seed) && finite(r.seed, 1, 4294967295) && finite(r.stop, 1, 12) && typeof r.date === 'string' && r.date.length < 40 && Array.isArray(r.path) && r.path.every(id => Object.hasOwn(NODES, id)) && Array.isArray(r.build) && r.build.every(id => availableUpgrades(r.weapon, [], true).some(u => u.id === id))).slice(0, 10).map(r => ({ id: r.id, weapon: r.weapon, mode: r.mode, result: r.result, time: r.time, seed: r.seed, stop: r.stop, date: r.date, path: [...r.path], build: [...r.build] }));
}
export class SaveStore {
  constructor(storage) {
    this.storage = storage; this.available = !!storage;
    const saved = this.read(STATE_KEY);
    this.state = { version: 4, profile: normalizeProfile(saved?.profile || this.read('weby.stickSwing.profile.v2')), run: validateCheckpoint(saved ? saved.run : this.read('weby.stickSwing.run.v3')), history: validHistory(saved?.history) };
  }
  read(key) { try { const raw = this.storage?.getItem(key); return raw ? JSON.parse(raw) : null; } catch { this.available = false; return null; } }
  write(key, value) { try { if (!this.storage) throw new Error('No storage'); this.storage.setItem(key, JSON.stringify(value)); return true; } catch { this.available = false; return false; } }
  commit() { return this.write(STATE_KEY, this.state); }
  progress(delta) {
    if (!delta || !Object.hasOwn(WEAPONS, delta.weapon)) return;
    const profile = this.state.profile;
    for (const key of Object.keys(masteryEmpty())) profile.mastery[delta.weapon][key] = Math.min(1000000, profile.mastery[delta.weapon][key] + metric(delta.mastery?.[key]));
    profile.discovered = [...new Set([...profile.discovered, ...(delta.discovered || []).filter(id => Object.hasOwn(ENEMIES, id))])];
    profile.rescued = [...new Set([...profile.rescued, ...(delta.rescued || []).filter(id => ['rescue', 'echo'].includes(id))])];
    profile.memories = [...new Set([...profile.memories, ...(delta.memories || []).filter(id => Object.hasOwn(MEMORIES, id))])];
  }
  loadRun() { return validateCheckpoint(this.state.run); }
  saveRun(value, delta) { const valid = validateCheckpoint(value); if (!valid) return false; this.state.run = valid; this.progress(delta); return this.commit(); }
  clearRun() { this.state.run = null; return this.commit(); }
  profile() { return structuredClone(this.state.profile); }
  saveProfile(value) { this.state.profile = normalizeProfile(value); return this.commit(); }
  history() { return structuredClone(this.state.history); }
  finishAttempt(record, delta, victory = false) {
    if (this.state.history.some(r => r.id === record.id)) return true;
    const valid = validHistory([record])[0]; if (!valid) return false;
    this.progress(delta); this.state.history = [valid, ...this.state.history].slice(0, 10);
    if (victory) {
      this.state.run = null;
      const p = this.state.profile;
      if (record.mode === 'chapter') { p.chapterWins++; p.chapterBest = Math.min(p.chapterBest || Infinity, record.time); }
      else if (record.mode === 'rush') p.rushBest[record.weapon] = Math.min(p.rushBest[record.weapon] || Infinity, record.time);
      else { p.bookWins++; p.bookBest = Math.min(p.bookBest || Infinity, record.time); }
    }
    return this.commit();
  }
  settings(reduced = false) {
    const s = this.read(SETTINGS_KEY) || {}, bindings = { ...DEFAULT_BINDINGS };
    const used = new Set();
    for (const key of Object.keys(bindings)) {
      const value = s.bindings?.[key];
      if (typeof value === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|ShiftLeft|ShiftRight|Escape)$/.test(value) && !used.has(value)) { bindings[key] = value; used.add(value); }
    }
    if (new Set(Object.values(bindings)).size !== Object.keys(bindings).length) Object.assign(bindings, DEFAULT_BINDINGS);
    return { sound: s.sound !== false, reduced: typeof s.reduced === 'boolean' ? s.reduced : reduced, holdAttack: s.holdAttack !== false,
      contrast: s.contrast === true, cues: s.cues !== false, coach: s.coach !== false,
      bindings, touchSide: s.touchSide === 'left' ? 'left' : 'right', touchScale: finite(s.touchScale, .85, 1.2) ? s.touchScale : 1 };
  }
  saveSettings(value) { return this.write(SETTINGS_KEY, value); }
}
