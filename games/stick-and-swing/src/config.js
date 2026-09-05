export const VERSION = '2.1.0';
export const WORLD = { width: 960, height: 600, inset: 46 };
export const TAU = Math.PI * 2;
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const WEAPONS = {
  scrapsteel: { name: 'Scrapsteel', tag: 'BALANCED · COUNTERATTACKS', icon: '╱', color: '#9aefd9', description: 'A quick, dependable sword. Perfect blocks empower your next hit. A good first choice.', detail: '18 / 18 / 30 damage · medium reach', damage: [18, 18, 30], range: [87, 87, 106], cooldown: [.32, .32, .48], duration: [.23, .23, .32], arc: [2.15, 2.15, 2.5] },
  pagebreaker: { name: 'Pagebreaker', tag: 'HEAVY · SHIELD BREAKER', icon: '╋', color: '#ffd088', description: 'A slow, wide blade that knocks enemies back. Its third strike breaks through a Warder’s shield.', detail: '26 / 26 / 44 damage · long reach', damage: [26, 26, 44], range: [106, 106, 127], cooldown: [.54, .54, .78], duration: [.34, .34, .42], arc: [2.65, 2.65, 3.1] },
  emberbrand: { name: 'Emberbrand', tag: 'FAST · BURNING INK', icon: '✳', color: '#ffad78', description: 'A short, fast blade. Every hit burns for 14 extra damage over two seconds. Hits refresh the burn.', detail: '13 / 13 / 22 damage · short reach', damage: [13, 13, 22], range: [78, 78, 93], cooldown: [.24, .24, .37], duration: [.18, .18, .25], arc: [2.2, 2.2, 2.8] },
};
export const ENEMIES = {
  scrapper: { name: 'Scrapper', hp: 54, speed: 88, radius: 17, damage: 13, color: '#ff827d', ink: 3 },
  skitter: { name: 'Skitter', hp: 42, speed: 113, radius: 15, damage: 15, color: '#d5a5ff', ink: 3 },
  spitter: { name: 'Spitter', hp: 38, speed: 63, radius: 16, damage: 12, color: '#ffd088', ink: 3 },
  warder: { name: 'Warder', hp: 105, speed: 68, radius: 21, damage: 18, color: '#8fcbff', ink: 5 },
  blotter: { name: 'Blotter', hp: 66, speed: 57, radius: 19, damage: 14, color: '#df9cd9', ink: 5 },
  brute: { name: 'The Scribbled Brute', hp: 1050, speed: 61, radius: 35, damage: 22, color: '#ff827d', ink: 35, boss: true },
  queen: { name: 'The Ink Queen', hp: 1650, speed: 90, radius: 28, damage: 18, color: '#d5a5ff', ink: 60, boss: true },
};
// Branches merge at the next stop. Every option advances exactly once.
export const ROUTE = [['first'], ['archive', 'trial'], ['nib', 'shelter'], ['brute'], ['spillway'], ['gallery', 'gauntlet'], ['last-shop', 'last-rest'], ['queen']];
export const NODES = {
  first: { title: 'The first line', kind: 'combat', chapter: 1, layout: 'open', note: 'Clear two waves. Red ink swings; purple ink lunges.', reward: 12, waves: [['scrapper', 'scrapper', 'scrapper'], ['skitter', 'scrapper', 'spitter']], story: { speaker: 'THE MARGIN', title: 'The page remembers.', text: 'The Artist left you unfinished, Line. But something has started drawing in the dark. Follow the fresh ink. Find out who is holding the pen.' } },
  archive: { title: 'The torn archive', kind: 'combat', chapter: 1, layout: 'columns', note: 'Blue Warders block the front. Circle behind them or parry their swing.', reward: 16, waves: [['warder', 'scrapper', 'spitter'], ['warder', 'skitter', 'spitter']] },
  trial: { title: 'Red-ink challenge', kind: 'elite', chapter: 1, layout: 'crossing', note: 'Three waves. Extra ink. Keep moving when the floor starts to fill.', reward: 36, waves: [['skitter', 'spitter', 'scrapper'], ['warder', 'skitter', 'spitter'], ['warder', 'scrapper', 'skitter']] },
  nib: { title: 'Nib’s travelling shop', kind: 'shop', chapter: 1, note: 'Spend ink on two gifts and a health refill. Each item can be bought once.', story: { speaker: 'NIB', title: 'A little less unfinished.', text: 'A pen nib with a coat full of pockets blocks the path. “I collect what the Artist threw away. Turns out some of it is useful. What are you missing?”' } },
  shelter: { title: 'A quiet margin', kind: 'rest', chapter: 1, note: 'Recover 50 health for free. Save your ink for later.' },
  brute: { title: 'The unfinished giant', kind: 'boss', chapter: 1, layout: 'open', note: 'Read its charge. Dash through the shockwave. Strike during recovery.', reward: 20, waves: [['brute']], story: { speaker: 'THE MARGIN', title: 'The first thing they erased.', text: 'The Brute rises from a pile of crossed-out lines. It is not guarding a treasure. It is guarding the page where the Artist stopped coming back.' }, outro: 'The Brute’s broken lines reveal a second page. “Someone else is finishing these drawings,” the Margin whispers.' },
  spillway: { title: 'The ink spillway', kind: 'combat', chapter: 2, layout: 'spillway', note: 'Blotters mark your position, then flood it. Leave the dashed circles before they fill.', reward: 20, waves: [['blotter', 'scrapper', 'warder'], ['blotter', 'skitter', 'spitter', 'scrapper']] },
  gallery: { title: 'The abandoned gallery', kind: 'combat', chapter: 2, layout: 'columns', note: 'Use cover against shots. Keep a clear escape from the puddles.', reward: 20, waves: [['warder', 'blotter', 'spitter'], ['skitter', 'warder', 'blotter', 'spitter']] },
  gauntlet: { title: 'The Queen’s rehearsal', kind: 'elite', chapter: 2, layout: 'crossing', note: 'Three mixed waves. More ink, less room for mistakes.', reward: 42, waves: [['warder', 'blotter', 'skitter'], ['spitter', 'blotter', 'skitter', 'scrapper'], ['warder', 'warder', 'blotter', 'spitter']] },
  'last-shop': { title: 'Nib’s last stop', kind: 'shop', chapter: 2, note: 'Your last chance to spend ink before the Queen.', story: { speaker: 'NIB', title: 'Before you turn the page.', text: '“The Queen thinks a drawing only matters if it is perfect. Funny thing is, she has been redrawing herself for years.” Nib opens his coat. “Take what helps. Then go be a mess.”' } },
  'last-rest': { title: 'The blank space', kind: 'rest', chapter: 2, note: 'Recover 50 health for free before the Queen.' },
  queen: { title: 'The Queen’s ink court', kind: 'boss', chapter: 2, layout: 'court', note: 'Read the quills, leave marked puddles, and dash between the radial shots.', reward: 0, waves: [['queen']], story: { speaker: 'THE INK QUEEN', title: '“I can make you perfect.”', text: 'She wears a crown of snapped pen tips. Beneath her throne, a thousand versions of the same drawing wait to be erased. Line raises a blade. One version is enough.' } },
};
const stone = (x, y, radius = 36) => ({ x, y, radius });
const pool = (x, y, radius = 53, offset = 0) => ({ x, y, radius, offset });
export const LAYOUTS = {
  open: { name: 'An open page', obstacles: [], pools: [] },
  columns: { name: 'The archive', obstacles: [stone(310, 215), stone(650, 395), stone(680, 195, 28)], pools: [] },
  crossing: { name: 'Red-ink crossing', obstacles: [stone(310, 300, 42), stone(650, 300, 42)], pools: [pool(480, 210, 57), pool(480, 390, 57, 3)] },
  spillway: { name: 'The spillway', obstacles: [stone(230, 295), stone(730, 295)], pools: [pool(370, 270, 50), pool(590, 340, 50, 3)] },
  court: { name: 'The ink court', obstacles: [stone(245, 290, 30), stone(715, 290, 30)], pools: [] },
};
export const UPGRADES = [
  { id: 'reach', icon: '↗', name: 'A longer line', tag: 'REACH', description: 'Your blade reaches 22% farther.' },
  { id: 'dash', icon: '»', name: 'Quick sketch', tag: 'DASH', description: 'Dash recharges 30% faster: 0.77 seconds instead of 1.1.' },
  { id: 'echo', icon: '✳', name: 'Third impression', tag: 'COMBO', description: 'Your third swing adds a 14-damage burst around you.' },
  { id: 'edge', icon: '✦', name: 'Make your mark', tag: 'DAMAGE', description: 'Blade hits deal 25% more damage.' },
  { id: 'heart', icon: '+', name: 'Room to breathe', tag: 'HEALTH', description: 'Gain 25 maximum health and recover 25 health now.' },
  { id: 'parry', icon: '◇', name: 'Silver lining', tag: 'PARRY', description: 'Every perfect block restores 6 health.' },
  { id: 'guard', icon: '◈', name: 'Hold the line', tag: 'GUARD', description: 'Ordinary blocks use 35% less guard.' },
  { id: 'armor', icon: '▱', name: 'Thicker paper', tag: 'DEFENCE', description: 'Take 15% less damage from all enemy hits and ink hazards.' },
  { id: 'riposte', weapon: 'scrapsteel', icon: '◇', name: 'A sharp reply', tag: 'SCRAPSTEEL', description: 'Perfect-block counters deal 120% bonus blade damage instead of 65%.' },
  { id: 'flurry', weapon: 'scrapsteel', icon: '〃', name: 'Running script', tag: 'SCRAPSTEEL', description: 'All three swings recharge 22% faster.' },
  { id: 'faultline', weapon: 'pagebreaker', icon: '⌁', name: 'Fault line', tag: 'PAGEBREAKER', description: 'Your third swing launches a 32-damage shockwave forward. It pierces shields.' },
  { id: 'impact', weapon: 'pagebreaker', icon: '╋', name: 'Full stop', tag: 'PAGEBREAKER', description: 'Your third hit deals 45% more blade damage and knocks enemies farther back.' },
  { id: 'kindling', weapon: 'emberbrand', icon: '♨', name: 'Slow burn', tag: 'EMBERBRAND', description: 'Burns last four seconds and deal 10 damage per second. Hits still refresh them.' },
  { id: 'wildfire', weapon: 'emberbrand', icon: '✳', name: 'Wildfire', tag: 'EMBERBRAND', description: 'Burning enemies burst when defeated, dealing 22 damage to nearby enemies.' },
];
export const availableUpgrades = (weapon, owned = []) => UPGRADES.filter(u => (!u.weapon || u.weapon === weapon) && !owned.includes(u.id));
export const SHOP_HEAL = { id: 'mend', name: 'Fresh paper', icon: '+', price: 18, description: 'Recover 35 health now. One refill at this shop.' };
export const giftPrice = id => UPGRADES.find(u => u.id === id)?.weapon ? 45 : 35;
export const LESSONS = [
  { title: 'Leave your first mark', text: 'Move into the glowing circle.', hint: 'WASD / arrows · left touch stick' },
  { title: 'Three strokes. One combo.', text: 'Hit the practice drawing three times. You can hold attack.', hint: 'Aim with the mouse · hold left click or Space' },
  { title: 'Cross it out', text: 'Dash into the glowing circle. You are safe during a dash.', hint: 'Move toward the circle and press Shift · or tap Dash' },
  { title: 'Hold your ground', text: 'Face the practice drawing and hold guard to stop a shot.', hint: 'Hold right click or F · or hold Guard' },
  { title: 'Perfect timing', text: 'Release guard, then tap it just before a shot reaches you. Watch for the blue ring.', hint: 'A perfect block reflects the shot and powers your next swing.' },
];
export const freshStats = () => ({ time: 0, kills: 0, parries: 0, damageTaken: 0, inkEarned: 0, spent: 0, retries: 0, bosses: 0 });
export function playerStats(upgrades = [], weapon = 'scrapsteel') {
  return { weapon, maxHp: 100 + (upgrades.includes('heart') ? 25 : 0), damage: upgrades.includes('edge') ? 1.25 : 1,
    reach: upgrades.includes('reach') ? 1.22 : 1, dashCooldown: upgrades.includes('dash') ? .77 : 1.1,
    echo: upgrades.includes('echo'), healParry: upgrades.includes('parry') ? 6 : 0,
    guardCost: upgrades.includes('guard') ? .65 : 1, armor: upgrades.includes('armor') ? .85 : 1,
    counterMultiplier: upgrades.includes('riposte') ? 2.2 : 1.65, attackSpeed: upgrades.includes('flurry') ? .78 : 1,
    burnDuration: upgrades.includes('kindling') ? 4 : 2, burnDamage: upgrades.includes('kindling') ? 10 : 7,
    wildfire: upgrades.includes('wildfire'), faultline: upgrades.includes('faultline'), impact: upgrades.includes('impact') };
}
export function createPlayer(upgrades = [], hp, weapon = 'scrapsteel') {
  const stats = playerStats(upgrades, weapon);
  return { x: 480, y: 465, radius: 17, facing: -Math.PI / 2, hp: clamp(hp ?? stats.maxHp, 1, stats.maxHp), ...stats,
    guard: 100, guarding: false, guardAge: 9, guardDelay: 0, broken: 0, dash: 0, dashCd: 0,
    dashX: 0, dashY: -1, invulnerable: 0, attack: null, attackCd: 0, combo: 0, comboWindow: 0, counter: 0,
    vx: 0, vy: 0, walk: 0, flash: 0 };
}
