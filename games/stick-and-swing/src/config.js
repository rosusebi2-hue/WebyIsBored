import { CHAPTER_NODES } from './chapter.js?v=2.3.0';
export { CHAPTER_ROUTE, KEEPSAKES, MEMORIES, keepsakeUnlocked } from './chapter.js?v=2.3.0';
export const VERSION = '2.3.0';
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
  duelist: { name: 'Crossblade', hp: 90, speed: 108, radius: 18, damage: 17, color: '#f1bc79', ink: 5 },
  sniper: { name: 'Needle Scribe', hp: 62, speed: 52, radius: 17, damage: 24, color: '#95dbe3', ink: 5 },
  weaver: { name: 'Shield Weaver', hp: 85, speed: 62, radius: 20, damage: 12, color: '#a9c8ff', ink: 6 },
  summoner: { name: 'Inkwright', hp: 110, speed: 44, radius: 22, damage: 15, color: '#edabcf', ink: 7 },
  palimpsest: { name: 'The Palimpsest', hp: 850, speed: 74, radius: 27, damage: 19, color: '#bdedce', ink: 45, boss: true, secret: true },
  knight: { name: 'The Margin Knight', hp: 2200, speed: 96, radius: 29, damage: 24, color: '#f1bc79', ink: 80, boss: true },
  brute: { name: 'The Scribbled Brute', hp: 1050, speed: 61, radius: 35, damage: 22, color: '#ff827d', ink: 35, boss: true },
  queen: { name: 'The Ink Queen', hp: 1650, speed: 90, radius: 28, damage: 18, color: '#d5a5ff', ink: 60, boss: true },
};
// Branches merge at the next stop. Every option advances exactly once.
export const ROUTE = [['first'], ['archive', 'trial'], ['nib', 'shelter'], ['brute'], ['spillway'], ['gallery', 'gauntlet'], ['last-shop', 'last-rest'], ['queen'], ['binding', 'crease'], ['stitches', 'foundry'], ['bind-shop', 'bind-rest'], ['knight']];
export const RUSH_ROUTE = [['brute'], ['queen'], ['knight']];
export const NODES = {
  ...CHAPTER_NODES,
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
  queen: { title: 'The Queen’s ink court', kind: 'boss', chapter: 2, layout: 'court', note: 'Read the quills, leave marked puddles, and dash between the radial shots.', reward: 24, outro: 'The Queen lowers her crown. Behind her throne, a golden seam opens. Someone has been stitching the abandoned pages together.', waves: [['queen']], story: { speaker: 'THE INK QUEEN', title: '“I can make you perfect.”', text: 'She wears a crown of snapped pen tips. Beneath her throne, a thousand versions of the same drawing wait to be erased. Line raises a blade. One version is enough.' } },
  binding: { title: 'The torn binding', kind: 'combat', chapter: 3, layout: 'binding', note: 'Crossblades follow their first swing with a thrust. Wait for both before moving in.', reward: 24, waves: [['duelist', 'sniper', 'scrapper'], ['weaver', 'duelist', 'skitter']], story: { speaker: 'THE MARGIN', title: 'Held together by a thread.', text: 'The binding is full of drawings from other stories. Someone has sewn them together so none of them disappear. At the far end, a knight keeps watch.' } },
  crease: { title: 'Through the crease', kind: 'elite', chapter: 3, layout: 'crease', note: 'Moving ink sweeps across the page. Watch the dashed warning before each crossing.', reward: 48, waves: [['duelist', 'sniper', 'weaver'], ['summoner', 'skitter', 'spitter'], ['duelist', 'warder', 'sniper']] },
  stitches: { title: 'The last stitches', kind: 'combat', chapter: 3, layout: 'stitches', note: 'Defeat the Weaver to remove nearby shields. Inkwrights can summon two reinforcements.', reward: 28, waves: [['weaver', 'warder', 'sniper'], ['summoner', 'duelist', 'blotter']] },
  foundry: { title: 'The pencil foundry', kind: 'elite', chapter: 3, layout: 'foundry', note: 'Break the ink barrels to blast nearby enemies. Leave their blast circles before they burst.', reward: 52, waves: [['summoner', 'weaver', 'duelist'], ['sniper', 'sniper', 'warder'], ['summoner', 'blotter', 'duelist']] },
  'bind-shop': { title: 'Nib’s binding stall', kind: 'shop', chapter: 3, note: 'Prepare for the Margin Knight. Gifts and a health refill are available.' },
  'bind-rest': { title: 'Between the threads', kind: 'rest', chapter: 3, note: 'Recover 50 health for free before the final duel.' },
  knight: { title: 'The final margin', kind: 'boss', chapter: 3, layout: 'throne', note: 'The Knight alternates sword and shield stances. Parry a thrust, then strike during recovery.', reward: 0, waves: [['knight']], story: { speaker: 'THE MARGIN KNIGHT', title: '“Someone had to hold the pages.”', text: 'The Knight has not been keeping you out. He has been keeping the book together. But he no longer knows how to let go. Line offers to take a turn.' } },
  'secret-duel': { title: 'A drawing beneath the drawing', kind: 'boss', chapter: 2, layout: 'sanctum', note: 'The Palimpsest redraws old attacks. Defeat it to claim its seal.', reward: 20, waves: [['palimpsest']] },

};
const stone = (x, y, radius = 36) => ({ x, y, radius });
const pool = (x, y, radius = 53, offset = 0) => ({ x, y, radius, offset });
export const LAYOUTS = {
  courtyard: { name: 'The pencil courtyard', obstacles: [stone(300, 300, 40), stone(660, 300, 40)], pools: [], props: [{ x: 480, y: 245, radius: 24, type: 'cover' }] },
  'archive-room': { name: 'Rook’s scattered wings', obstacles: [stone(340, 300, 40), stone(620, 300, 40)], pools: [] },
  'eraser-room': { name: 'The road home', obstacles: [], pools: [], props: [{ x: 250, y: 295, radius: 26, type: 'cover' }, { x: 710, y: 295, radius: 26, type: 'cover' }] },
  open: { name: 'An open page', obstacles: [], pools: [] },
  columns: { name: 'The archive', obstacles: [stone(310, 215), stone(650, 395), stone(680, 195, 28)], pools: [] },
  crossing: { name: 'Red-ink crossing', obstacles: [stone(310, 300, 42), stone(650, 300, 42)], pools: [pool(480, 210, 57), pool(480, 390, 57, 3)] },
  spillway: { name: 'The spillway', obstacles: [stone(230, 295), stone(730, 295)], pools: [pool(370, 270, 50), pool(590, 340, 50, 3)] },
  court: { name: 'The ink court', obstacles: [stone(245, 290, 30), stone(715, 290, 30)], pools: [] },
  binding: { name: 'The torn binding', obstacles: [stone(260, 280), stone(700, 280)], pools: [], props: [{ x: 400, y: 255, radius: 25, type: 'cover' }, { x: 560, y: 255, radius: 25, type: 'cover' }] },
  crease: { name: 'The moving crease', obstacles: [stone(290, 215, 28), stone(670, 385, 28)], pools: [], sweep: true, props: [{ x: 480, y: 295, radius: 23, type: 'barrel' }] },
  stitches: { name: 'The last stitches', obstacles: [stone(310, 190, 28), stone(650, 190, 28)], pools: [pool(480, 290, 47, 2)], props: [{ x: 285, y: 370, radius: 25, type: 'cover' }, { x: 675, y: 370, radius: 25, type: 'cover' }] },
  foundry: { name: 'The pencil foundry', obstacles: [stone(480, 280, 34)], pools: [], props: [{ x: 290, y: 250, radius: 22, type: 'barrel' }, { x: 670, y: 360, radius: 22, type: 'barrel' }, { x: 700, y: 170, radius: 24, type: 'cover' }] },
  throne: { name: 'The final margin', obstacles: [stone(215, 300, 30), stone(745, 300, 30)], pools: [], props: [{ x: 355, y: 210, radius: 24, type: 'cover' }, { x: 605, y: 210, radius: 24, type: 'cover' }] },
  sanctum: { name: 'The hidden draft', obstacles: [stone(310, 280, 27), stone(650, 280, 27)], pools: [], sweep: true },

};
export const UPGRADES = [
  { id: 'rebound', icon: '◇', name: 'Return to sender', tag: 'PARRY', description: 'Reflected shots pierce enemies and deal 50% more damage.' },
  { id: 'inkblades', icon: '〃', name: 'Split sentence', tag: 'COMBO', description: 'Every third swing fires two 18-damage ink blades at an angle.' },
  { id: 'afterimage', icon: '»', name: 'Leave a mark', tag: 'DASH', description: 'Dashing leaves a mark that bursts after a moment for 28 damage.' },
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
  { id: 'focus', icon: '◴', name: 'A clear thought', tag: 'ABILITY', description: 'Your active ability recharges 25% faster.' },
  { id: 'secondWind', icon: '+', name: 'Small victories', tag: 'HEALTH', description: 'Recover 3 health whenever you defeat a regular enemy.' },
  { id: 'reservoir', icon: '◈', name: 'Deep reserves', tag: 'GUARD', description: 'Gain 25 maximum guard and refill it now.' },
  { id: 'keen', icon: '◇', name: 'Remember the opening', tag: 'COUNTER', description: 'Your perfect-block counter stays ready for four seconds instead of two.' },
  { id: 'momentum', icon: '»', name: 'Follow the motion', tag: 'DASH', description: 'After a dash, your next blade hit within 1.5 seconds deals 30% more damage.' },
  { id: 'seal', secret: true, icon: '◎', name: 'Palimpsest’s seal', tag: 'SECRET', description: 'Gain 15 maximum health and recharge your ability 15% faster. Found only in the hidden duel.' },
  { id: 'needle', weapon: 'scrapsteel', icon: '↗', name: 'Straight to the point', tag: 'SCRAPSTEEL', description: 'Your active ability deals 50% more damage.' },
  { id: 'tempo', weapon: 'scrapsteel', icon: '〃', name: 'Borrowed time', tag: 'SCRAPSTEEL', description: 'Each perfect block removes two seconds from your ability cooldown.' },
  { id: 'aftershock', weapon: 'pagebreaker', icon: '⌁', name: 'An echo below', tag: 'PAGEBREAKER', description: 'Your active ability adds a delayed 24-damage burst around you.' },
  { id: 'stonewall', weapon: 'pagebreaker', icon: '▱', name: 'Unshakeable', tag: 'PAGEBREAKER', description: 'Using your ability restores 25 guard and reduces incoming damage by 30% for 1.5 seconds.' },
  { id: 'firestorm', weapon: 'emberbrand', icon: '✳', name: 'A wider flame', tag: 'EMBERBRAND', description: 'Your active ability launches two extra burning projectiles.' },
  { id: 'cinderstep', weapon: 'emberbrand', icon: '♨', name: 'Cinder steps', tag: 'EMBERBRAND', description: 'Dashing leaves a small flame behind for 1.5 seconds. Enemies inside take 12 damage per second.' },

];
export const availableUpgrades = (weapon, owned = [], includeSecret = false) => UPGRADES.filter(u => (!u.weapon || u.weapon === weapon) && (!u.secret || includeSecret) && !owned.includes(u.id));
export const SHOP_HEAL = { id: 'mend', name: 'Fresh paper', icon: '+', price: 18, description: 'Recover 35 health now. One refill at this shop.' };
export const giftPrice = id => UPGRADES.find(u => u.id === id)?.weapon ? 45 : 35;
export const LESSONS = [
  { title: 'Leave your first mark', text: 'Move into the glowing circle.', hint: 'WASD / arrows · left touch stick' },
  { title: 'Three strokes. One combo.', text: 'Hit the practice drawing three times. You can hold attack.', hint: 'Aim with the mouse · hold left click or Space' },
  { title: 'Cross it out', text: 'Dash into the glowing circle. You are safe during a dash.', hint: 'Move toward the circle and press Shift · or tap Dash' },
  { title: 'Hold your ground', text: 'Face the practice drawing and hold guard to stop a shot.', hint: 'Hold right click or F · or hold Guard' },
  { title: 'Perfect timing', text: 'Release guard, then tap it just before a shot reaches you. Watch for the blue ring.', hint: 'A perfect block reflects the shot and powers your next swing.' },
  { title: 'Your signature move', text: 'Use your ability. Each weapon has its own move; the purple meter shows its recharge.', hint: 'Press Q · or tap Ability' },
];
export const freshStats = () => ({ time: 0, kills: 0, parries: 0, damageTaken: 0, inkEarned: 0, spent: 0, retries: 0, bosses: 0 });
export function playerStats(upgrades = [], weapon = 'scrapsteel') {
  return { weapon, maxHp: 100 + (upgrades.includes('heart') ? 25 : 0) + (upgrades.includes('seal') ? 15 : 0), damage: upgrades.includes('edge') ? 1.25 : 1,
    reach: upgrades.includes('reach') ? 1.22 : 1, dashCooldown: upgrades.includes('dash') ? .77 : 1.1,
    echo: upgrades.includes('echo'), healParry: upgrades.includes('parry') ? 6 : 0,
    rebound: upgrades.includes('rebound'), inkblades: upgrades.includes('inkblades'), afterimage: upgrades.includes('afterimage'),
    guardCost: upgrades.includes('guard') ? .65 : 1, armor: upgrades.includes('armor') ? .85 : 1,
    counterMultiplier: upgrades.includes('riposte') ? 2.2 : 1.65, attackSpeed: upgrades.includes('flurry') ? .78 : 1,
    burnDuration: upgrades.includes('kindling') ? 4 : 2, burnDamage: upgrades.includes('kindling') ? 10 : 7,
    wildfire: upgrades.includes('wildfire'), faultline: upgrades.includes('faultline'), impact: upgrades.includes('impact'),
    maxGuard: upgrades.includes('reservoir') ? 125 : 100, abilityCooldown: (weapon === 'pagebreaker' ? 8 : 7) * (upgrades.includes('focus') ? .75 : 1) * (upgrades.includes('seal') ? .85 : 1),
    healKill: upgrades.includes('secondWind') ? 3 : 0, counterTime: upgrades.includes('keen') ? 4 : 2, momentum: upgrades.includes('momentum'),
    needle: upgrades.includes('needle'), tempo: upgrades.includes('tempo'), aftershock: upgrades.includes('aftershock'), stonewall: upgrades.includes('stonewall'), firestorm: upgrades.includes('firestorm'), cinderstep: upgrades.includes('cinderstep') };
}
export function createPlayer(upgrades = [], hp, weapon = 'scrapsteel') {
  const stats = playerStats(upgrades, weapon);
  return { x: 480, y: 465, radius: 17, facing: -Math.PI / 2, hp: clamp(hp ?? stats.maxHp, 1, stats.maxHp), ...stats,
    guard: stats.maxGuard, abilityCd: 0, skillRush: 0, skillHits: new Set(), momentumTime: 0, fortify: 0, guarding: false, guardAge: 9, guardDelay: 0, broken: 0, dash: 0, dashCd: 0,
    dashX: 0, dashY: -1, invulnerable: 0, attack: null, attackCd: 0, combo: 0, comboWindow: 0, counter: 0,
    vx: 0, vy: 0, walk: 0, flash: 0 };
}

export const ABILITIES = {
  scrapsteel: { name: 'Lunging strike', description: 'Lunge forward, safely cutting through enemies for 40 damage.', alternate: 'Retort', alternateDescription: 'Reflect nearby shots, restore 20 guard, and prepare a counterattack.' },
  pagebreaker: { name: 'Ground smash', description: 'Deal 60 damage around you and break shields.', alternate: 'Faultfront', alternateDescription: 'Launch three shield-piercing waves forward for 22 damage each.' },
  emberbrand: { name: 'Flame fan', description: 'Launch five burning projectiles for 16 damage each.', alternate: 'Firewheel', alternateDescription: 'Launch eight burning projectiles around you for 12 damage each.' },
};
export const FINISHERS = {
  scrapsteel: { name: 'Needlepoint', description: 'The third hit becomes a narrow thrust: 45 damage and 155 reach.' },
  pagebreaker: { name: 'Roundabout', description: 'The third hit strikes in every direction: 34 damage and 112 reach.' },
  emberbrand: { name: 'Flashpoint', description: 'The third hit burns enemies all around you: 17 damage and 120 reach.' },
};
export const MASTERIES = {
  scrapsteel: [{ metric: 'kills', goal: 45, label: 'Defeat 45 enemies', unlock: 'finisher' }, { metric: 'parries', goal: 12, label: 'Make 12 perfect blocks', unlock: 'ability' }, { metric: 'bosses', goal: 3, label: 'Defeat 3 bosses', unlock: 'appearance' }],
  pagebreaker: [{ metric: 'shieldBreaks', goal: 8, label: 'Break 8 shields with a third hit or ability', unlock: 'finisher' }, { metric: 'abilityHits', goal: 30, label: 'Hit enemies 30 times with your ability', unlock: 'ability' }, { metric: 'bosses', goal: 3, label: 'Defeat 3 bosses', unlock: 'appearance' }],
  emberbrand: [{ metric: 'burnKills', goal: 20, label: 'Defeat 20 burning enemies', unlock: 'finisher' }, { metric: 'abilityHits', goal: 30, label: 'Hit enemies 30 times with your ability', unlock: 'ability' }, { metric: 'bosses', goal: 3, label: 'Defeat 3 bosses', unlock: 'appearance' }],
};
export const masteryEmpty = () => ({ kills: 0, parries: 0, bosses: 0, shieldBreaks: 0, abilityHits: 0, burnKills: 0 });
export const unlocked = (profile, weapon, part) => { const task = MASTERIES[weapon].find(t => t.unlock === part); return (profile.mastery?.[weapon]?.[task.metric] || 0) >= task.goal; };
export const SYNERGIES = [
  { ids: ['riposte', 'tempo'], title: 'Countercraft', text: 'Perfect blocks empower your blade and bring your ability back sooner.' },
  { ids: ['impact', 'faultline'], title: 'Breaking point', text: 'Your finishing blow combines a heavy hit with a forward shockwave.' },
  { ids: ['kindling', 'wildfire'], title: 'Chain reaction', text: 'Long burns help trigger bursts when enemies fall.' },
  { ids: ['dash', 'momentum'], title: 'Moving ink', text: 'Frequent dashes create more empowered attacks.' },
  { ids: ['focus', 'aftershock'], title: 'Rolling thunder', text: 'A shorter ability cooldown means more delayed bursts.' },
];
export const EVENTS = [
  { id: 'rescue', title: 'A drawing in the rain', text: 'A tiny sketch is washing away. Nib can patch its page, but needs a little ink.', choices: [{ id: 'help', label: 'Give 12 ink · rescue the drawing and recover 20 health', ink: -12, heal: 20, rescue: true }, { id: 'leave', label: 'Leave the drawing with Nib · keep your ink' }] },
  { id: 'well', title: 'The forgotten ink well', text: 'There is enough left for one useful thing. The choice is yours.', choices: [{ id: 'drink', label: 'Restore the page · recover 25 health', heal: 25 }, { id: 'bottle', label: 'Bottle the ink · gain 18 ink', ink: 18 }] },
  { id: 'bargain', title: 'A suspicious signature', text: 'A name writes itself beneath your feet. It offers ink in exchange for a piece of your page.', choices: [{ id: 'accept', label: 'Lose 20 health · gain 35 ink', hurt: 20, ink: 35 }, { id: 'decline', label: 'Cross it out · continue safely' }] },
  { id: 'duel', title: 'Under the old drawing', text: 'A second figure moves beneath the paper. You can open its hidden arena or leave the page intact.', choices: [{ id: 'fight', label: 'Enter the hidden duel · win the Palimpsest’s seal', secret: true }, { id: 'leave', label: 'Leave the hidden drawing undisturbed' }] },
  { id: 'merchant', title: 'A folded envelope', text: 'Nib left supplies for whoever made it this far. Only one parcel will fit in your pocket.', choices: [{ id: 'paper', label: 'Take the paper · recover 30 health', heal: 30 }, { id: 'ink', label: 'Take the ink · gain 22 ink', ink: 22 }] },
  { id: 'echo', title: 'The drawing that answered', text: 'A faint voice asks if anyone is still reading. A small kindness could bring it back into the story.', choices: [{ id: 'answer', label: 'Offer 10 health · rescue the drawing and gain 25 ink', hurt: 10, ink: 25, rescue: true }, { id: 'listen', label: 'Stay and listen · recover 10 health', heal: 10 }] },
];
export const JOURNAL = {
  scrapper: 'A short red slash. Step out of its cone, then strike during recovery.', skitter: 'A straight purple charge. Move sideways after the warning locks.', spitter: 'A gold shot. Use cover or tap guard just before impact.', warder: 'A blue shield guards the front. Circle behind, parry, or use a heavy shield-breaking hit.', blotter: 'Its circles lock onto your position before filling. Floor ink cannot be blocked.',
  duelist: 'Crossblade attacks twice. Avoid the slash and the following thrust before closing in.', sniper: 'Needle Scribe locks a long aiming line. Step sideways or reflect the shot.', weaver: 'Nearby drawings take less damage while the Weaver lives. Defeat it first.', summoner: 'Inkwright can summon two Scrappers. Strike during its long summoning warning.',
  brute: 'The Brute cycles a charge, a shockwave, and a fan. Its second phase is faster, but recovery still leaves an opening.', queen: 'The Queen alternates quill fans, marked pools, and radial shots. Dash through gaps and attack during recovery.', knight: 'The Knight switches between shield and sword stances. Parrying opens its defence; sword stance includes a second attack.', palimpsest: 'The hidden drawing repeats familiar attacks. Defeat it to earn a seal that strengthens health and ability recovery.',
};
export const DEFAULT_BINDINGS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', attack: 'Space', guard: 'KeyF', dash: 'ShiftLeft', ability: 'KeyQ', pause: 'Escape' };
