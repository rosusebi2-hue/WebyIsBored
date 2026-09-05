export const VERSION = '2.0.0';
export const WORLD = { width: 960, height: 600, inset: 46 };
export const TAU = Math.PI * 2;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const ENEMIES = {
  scrapper: { name: 'Scrapper', hp: 54, speed: 88, radius: 17, damage: 13, color: '#ff827d' },
  skitter: { name: 'Skitter', hp: 42, speed: 113, radius: 15, damage: 15, color: '#d5a5ff' },
  spitter: { name: 'Spitter', hp: 38, speed: 63, radius: 16, damage: 12, color: '#ffd088' },
  brute: { name: 'The Scribbled Brute', hp: 950, speed: 61, radius: 35, damage: 22, color: '#ff827d' },
};
export const ROOMS = [
  { title: 'The first line', note: 'Three bad ideas. One good sword.', enemies: ['scrapper', 'scrapper', 'scrapper'] },
  { title: 'Between the margins', note: 'Purple ink lunges. Gold ink shoots. Read their wind-up.', enemies: ['scrapper', 'skitter', 'spitter', 'scrapper'] },
  { title: 'Red ink rising', note: 'Use the inkstones as cover. Keep a dash in reserve.', enemies: ['skitter', 'spitter', 'scrapper', 'skitter', 'spitter'] },
  { title: 'The unfinished giant', note: 'Let the Brute commit. Strike while it recovers.', enemies: ['brute'] },
];
export const UPGRADES = [
  { id: 'reach', icon: '↗', name: 'A longer line', tag: 'SWORD', description: 'Your sword reaches 22% farther. Catch more enemies in each swing.' },
  { id: 'dash', icon: '»', name: 'Quick sketch', tag: 'DASH', description: 'Dash recharges 30% faster. Slip through danger more often.' },
  { id: 'echo', icon: '✳', name: 'Third impression', tag: 'COMBO', description: 'Your third swing sends out an ink burst that hits nearby enemies.' },
  { id: 'edge', icon: '✦', name: 'Make your mark', tag: 'SWORD', description: 'Every sword hit deals 25% more damage.' },
  { id: 'heart', icon: '+', name: 'Room to breathe', tag: 'HEALTH', description: 'Gain 25 maximum health and heal an extra 25 now.' },
  { id: 'parry', icon: '◇', name: 'Silver lining', tag: 'PARRY', description: 'A perfect block restores 6 health as well as opening a counterattack.' },
];
export const LESSONS = [
  { title: 'Leave your first mark', text: 'Move into the glowing circle.', hint: 'WASD / arrows · left touch stick' },
  { title: 'Three strokes. One combo.', text: 'Hit the practice drawing three times. You can hold attack.', hint: 'Aim with the mouse · hold left click or Space' },
  { title: 'Cross it out', text: 'Dash into the glowing circle. You are safe during a dash.', hint: 'Move toward the circle and press Shift · or tap Dash' },
  { title: 'Hold your ground', text: 'Face the practice drawing and hold guard to stop a shot.', hint: 'Hold right click or F · or hold Guard' },
  { title: 'Perfect timing', text: 'Release guard, then tap it just before a shot reaches you. Watch for the blue ring.', hint: 'A perfect block reflects the shot and powers your next swing.' },
];
export const OBSTACLES = [{ x: 310, y: 215, radius: 36 }, { x: 650, y: 395, radius: 36 }];
export function playerStats(upgrades = []) {
  return {
    maxHp: 100 + (upgrades.includes('heart') ? 25 : 0),
    damage: upgrades.includes('edge') ? 1.25 : 1,
    reach: upgrades.includes('reach') ? 1.22 : 1,
    dashCooldown: upgrades.includes('dash') ? .77 : 1.1,
    echo: upgrades.includes('echo'), healParry: upgrades.includes('parry') ? 6 : 0,
  };
}
export function createPlayer(upgrades = [], hp) {
  const stats = playerStats(upgrades);
  return { x: 480, y: 400, radius: 17, facing: -Math.PI / 2, hp: hp ?? stats.maxHp, ...stats,
    guard: 100, guarding: false, guardAge: 9, guardDelay: 0, broken: 0, dash: 0, dashCd: 0,
    dashX: 0, dashY: -1, invulnerable: 0, attack: null, attackCd: 0, combo: 0, comboWindow: 0, counter: 0,
    vx: 0, vy: 0, walk: 0, flash: 0 };
}
