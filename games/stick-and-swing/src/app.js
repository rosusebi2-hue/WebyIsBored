import { VERSION, ROUTE, NODES, ENEMIES, WEAPONS, LESSONS, UPGRADES, SHOP_HEAL, giftPrice, clamp } from './config.js?v=2.1.0';
import { SaveStore } from './storage.js?v=2.1.0';
import { Game } from './engine.js?v=2.1.0';
import { Renderer } from './renderer.js?v=2.1.0';
import { Input } from './input.js?v=2.1.0';
import { AudioEngine } from './audio.js?v=2.1.0';

const $ = id => document.getElementById(id);
const text = (tag, content, className) => { const e = document.createElement(tag); e.textContent = content; if (className) e.className = className; return e; };
const timeLabel = value => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const store = new SaveStore(storage);
const settings = store.settings(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const game = new Game(store);
const canvas = $('arena');
const audio = new AudioEngine(settings);
const dialog = $('game-dialog');
const inner = $('dialog-inner');
let renderer, input, toastTime = 0, feedbackTime = 0, dialogView = '', lastFocus = null;

function showToast(message, duration = 3) { $('toast').textContent = message; $('toast').hidden = false; toastTime = duration; }
function button(label, action, className = 'secondary') {
  const b = text('button', label, className); b.type = 'button';
  b.addEventListener('click', () => { audio.unlock(); action(); processEvents(); }); return b;
}
function openDialog(view, eyebrow, title, copy, wide = false) {
  dialogView = view; dialog.dataset.view = view;
  inner.replaceChildren(); inner.className = wide ? 'dialog-inner wide' : 'dialog-inner';
  inner.append(text('p', eyebrow, 'dialog-eyebrow'));
  const h = text('h2', title); h.id = 'dialog-title'; inner.append(h);
  if (copy) inner.append(text('p', copy, 'dialog-copy'));
  if (!dialog.open) { lastFocus = document.activeElement; dialog.showModal(); }
  requestAnimationFrame(() => inner.querySelector('button:not(:disabled), a, input')?.focus({ preventScroll: true }));
}
function closeDialog() {
  if (dialog.open) dialog.close();
  dialogView = ''; input?.clear();
  if (['combat', 'tutorial'].includes(game.mode)) canvas.focus({ preventScroll: true });
  else if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
}
function actions(...buttons) { const e = text('div', '', 'menu-actions'); e.append(...buttons); inner.append(e); }
function subactions(...elements) { const e = text('div', '', 'sub-actions'); e.append(...elements); inner.append(e); }
function link(label, href) { const a = text('a', label); a.href = href; return a; }
function launch(practice = false, confirmed = false) {
  if (!confirmed && (store.loadRun() || game.checkpoint)) {
    openDialog('confirm', 'A FRESH PAGE', 'Start over?', 'This replaces your current adventure checkpoint. Your settings and past clears stay saved.');
    actions(button('Choose a weapon', () => launch(practice, true), 'primary'), button('Go back', showMode)); return;
  }
  openDialog('weapons', 'YOUR FIRST CHOICE', 'How will you make your mark?', 'All three weapons are ready to use. Gifts you find along the route can develop their strengths.', true);
  const grid = text('div', '', 'upgrade-grid weapon-grid');
  for (const [id, w] of Object.entries(WEAPONS)) {
    const card = button('', () => { closeDialog(); game.startNew(practice || !store.profile().tutorialDone, Date.now() >>> 0, id); }, 'upgrade-card weapon-card');
    card.style.setProperty('--weapon-color', w.color);
    card.append(text('span', w.icon, 'upgrade-icon'), text('span', w.tag, 'upgrade-tag'), text('strong', w.name), text('p', w.description), text('small', w.detail, 'weapon-detail'), text('span', 'Take this weapon →', 'upgrade-pick'));
    grid.append(card);
  }
  inner.append(grid); subactions(button('Go back', showMode, ''));
}
function showTitle() {
  const save = store.loadRun() || game.checkpoint, profile = store.profile();
  openDialog('title', `THE ADVENTURE UPDATE · ${VERSION}`, 'An unfinished world.\nA story of your own.', 'You are Line, a drawing the Artist left behind. Choose your blade, follow the ink, and take on the Queen who wants to redraw it all.');
  const quote = text('p', '“You don’t have to be finished to matter.”', 'dialog-quote'); quote.append(text('span', '— THE MARGIN')); inner.append(quote);
  if (save) actions(button(`Continue · ${save.room < 0 ? 'Choose your route' : NODES[save.node].title}`, () => { closeDialog(); game.restore(save); }, 'primary'), button('New adventure', () => launch()));
  else actions(button('Choose your weapon →', () => launch(), 'primary'));
  subactions(button('Practice controls', () => launch(true), ''), button('Settings', showSettings, ''), link('What’s new ↗', '../../news/#stick-and-swing-2-1'));
  const meta = text('div', '', 'run-meta');
  meta.append(text('span', '3 weapons'), text('span', '8 stops · 2 chapters · 2 bosses'));
  if (profile.adventureBest) meta.append(text('span', `Best adventure ${timeLabel(profile.adventureBest)}`));
  if (profile.adventureWins) meta.append(text('span', `${profile.adventureWins} adventures cleared`));
  else if (profile.wins) meta.append(text('span', `${profile.wins} First Page clears kept`));
  inner.append(meta);
}
function wallet() {
  const row = text('div', '', 'journey-wallet');
  row.append(text('span', WEAPONS[game.weapon].name, 'wallet-weapon'), text('span', `${Math.ceil(game.player.hp)} / ${game.player.maxHp} health`), text('strong', `${game.ink} ink`));
  inner.append(row);
}
function routeMap() {
  const map = text('ol', '', 'route-map'); map.setAttribute('aria-label', 'Your eight-stop adventure');
  ROUTE.forEach((options, i) => {
    const id = game.path[i], next = i === game.room + 1;
    const cell = text('li', '', `map-stop ${id ? 'visited' : ''} ${next ? 'next' : ''} ${i === 3 || i === 7 ? 'map-boss' : ''}`);
    if (next) cell.setAttribute('aria-current', 'step');
    cell.append(text('span', `${String(i + 1).padStart(2, '0')} · ${i < 4 ? 'PAGE I' : 'PAGE II'}`, 'map-number'));
    cell.append(text('strong', id ? NODES[id].title : options.length === 1 ? NODES[options[0]].title : i === 2 || i === 6 ? 'Shop or recovery' : 'Battle or challenge'));
    cell.append(text('small', next ? 'Choose this stop' : id ? 'Your path' : 'Ahead'));
    map.append(cell);
  });
  return map;
}
function showRoute() {
  openDialog('route', `STOP ${game.room + 2} / ${ROUTE.length} · ${game.room + 1 < 4 ? 'THE FIRST PAGE' : 'THE SECOND PAGE'}`, game.routeOptions().length > 1 ? 'Choose your next mark.' : game.room < 0 ? 'Your adventure starts here.' : 'Turn the page.', NODES[game.node]?.outro || 'Every route moves you forward. Ink buys gifts at Nib’s shop; recovery stops restore health for free.', true);
  wallet();
  const grid = text('div', '', `route-choices ${game.routeOptions().length === 1 ? 'single' : ''}`);
  const labels = { combat: 'BATTLE', elite: 'HARDER BATTLE · MORE INK', shop: 'SHOP', rest: 'RECOVERY', boss: 'BOSS' };
  for (const id of game.routeOptions()) {
    const n = NODES[id], card = button('', () => { closeDialog(); game.chooseRoute(id); }, `upgrade-card route-card ${n.kind}`);
    card.append(text('span', labels[n.kind], 'upgrade-tag'), text('strong', n.title), text('p', n.note));
    if (n.waves) {
      const ink = n.reward + n.waves.flat().reduce((sum, type) => sum + ENEMIES[type].ink, 0);
      card.append(text('small', `${n.waves.length} ${n.waves.length === 1 ? 'wave' : 'waves'} · ${ink} ink${id === 'queen' ? '' : ' · a gift + 16 health'}`, 'route-reward'));
    }
    card.append(text('span', 'Take this route →', 'upgrade-pick')); grid.append(card);
  }
  inner.append(grid);
  const overview = text('details', '', 'route-overview'); overview.open = matchMedia('(min-width: 761px)').matches;
  overview.append(text('summary', 'Your full eight-stop route'), routeMap()); inner.append(overview);
  subactions(button(`Your build · ${game.upgrades.length} gifts`, showBuild, ''), button('Save & title', () => game.title(), ''), link('Back to the arcade', '../../'));
}
function showShop() {
  openDialog('shop', 'NIB’S SHOP', 'Make the ink count.', 'Everything takes effect immediately and lasts for this run. Each item is available once here. You can leave whenever you’re ready.', true);
  wallet(); const grid = text('div', '', 'upgrade-grid');
  for (const id of game.stock) {
    const item = id === 'mend' ? SHOP_HEAL : UPGRADES.find(u => u.id === id), price = id === 'mend' ? SHOP_HEAL.price : giftPrice(id);
    const sold = game.purchased.includes(id), full = id === 'mend' && game.player.hp >= game.player.maxHp;
    const card = button('', () => game.buyItem(id), 'upgrade-card shop-card');
    card.disabled = sold || full || game.ink < price;
    card.append(text('span', item.icon, 'upgrade-icon'), text('span', id === 'mend' ? 'HEALTH REFILL' : item.tag, 'upgrade-tag'), text('strong', item.name), text('p', item.description));
    const status = sold ? 'Bought' : full ? 'Health is full' : game.ink < price ? `${price} ink · need ${price - game.ink} more` : `Buy for ${price} ink →`;
    card.append(text('span', status, 'upgrade-pick')); grid.append(card);
  }
  inner.append(grid); actions(button('Continue the adventure →', () => game.leaveShop(), 'primary'));
  subactions(button('See your build', showBuild, ''), button('Save & title', () => game.title(), ''));
}
function showBuild() {
  openDialog('build', 'THIS RUN', WEAPONS[game.weapon].name, WEAPONS[game.weapon].description, true); wallet();
  const list = text('ul', '', 'build-detail');
  for (const id of game.upgrades) {
    const u = UPGRADES.find(x => x.id === id), row = text('li', '');
    row.append(text('strong', u.name), text('span', u.description)); list.append(row);
  }
  if (game.upgrades.length) inner.append(list);
  else inner.append(text('p', 'Clear a battle to choose your first gift.', 'build-list'));
  actions(button('Back', showMode, 'primary'));
}
function showMode() {
  input?.clear();
  if (game.mode === 'title') showTitle();
  else if (game.mode === 'route') showRoute();
  else if (game.mode === 'story') {
    const story = NODES[game.node].story;
    openDialog('story', story.speaker, story.title, story.text);
    inner.append(text('p', NODES[game.node].note, 'dialog-quote'));
    actions(button('Continue →', () => { closeDialog(); game.beginEncounter(); }, 'primary'));
    subactions(button('Save & title', () => game.title(), ''));
  } else if (game.mode === 'shop') showShop();
  else if (game.mode === 'rest') {
    openDialog('rest', 'A QUIET MOMENT · THE MARGIN', 'Leave some space.', '“Even a good drawing needs a little blank space.” The ink settles. You can breathe again.');
    wallet();
    const heal = Math.min(50, game.player.maxHp - game.player.hp);
    inner.append(text('p', heal > 0 ? `Recover ${Math.ceil(heal)} health. No ink needed.` : 'You’re already at full health. Take the quiet path onward.', 'dialog-quote'));
    actions(button('Rest & continue →', () => game.takeRest(), 'primary'));
  } else if (game.mode === 'paused') {
    openDialog('paused', 'TAKE A BREATH', 'The page can wait.', 'Your run is paused. Return when you’re ready.');
    actions(button('Back to the fight →', () => { closeDialog(); game.resume(); }, 'primary'), button('Settings & controls', showSettings));
    subactions(button('Your build', showBuild, ''), button('New adventure', () => launch(), ''), button('Title screen', () => game.title(), ''), link('Back to the arcade', '../../'));
    inner.append(text('p', 'Continue restores the encounter’s entrance. Route choices, gifts, and shop purchases save immediately on this browser and device.', 'build-list'));
  } else if (game.mode === 'reward') {
    openDialog('reward', `${NODES[game.node].title.toUpperCase()} · CLEARED`, 'Make your next mark.', 'Choose one gift for this adventure. You’ll also recover 16 health. Your ink is already collected.', true);
    wallet(); const grid = text('div', '', 'upgrade-grid');
    for (const id of game.choices) {
      const u = UPGRADES.find(x => x.id === id);
      const card = button('', () => { if (game.chooseUpgrade(id)) closeDialog(); }, 'upgrade-card');
      card.append(text('span', u.icon, 'upgrade-icon'), text('span', u.tag, 'upgrade-tag'), text('strong', u.name), text('p', u.description), text('span', 'Take this gift →', 'upgrade-pick')); grid.append(card);
    }
    inner.append(grid);
    if (!game.choices.length) actions(button('Recover & continue →', () => game.skipEmptyReward(), 'primary'));
    subactions(button('See your build', showBuild, ''), button('Save & title', () => game.title(), ''));
  } else if (game.mode === 'death') {
    openDialog('death', 'A ROUGH DRAFT', 'Not your last line.', `${game.deathSource} caught you. Retry from this encounter’s entrance with the same build, ink, health, and enemies.`);
    inner.append(text('p', game.lastHit?.reason || NODES[game.node].note, 'dialog-quote')); stats();
    actions(button('Retry this encounter →', () => { closeDialog(); game.retryRoom(); }, 'primary'), button('New adventure', () => launch()));
    subactions(button('See your build', showBuild, ''), link('Back to the arcade', '../../'));
  } else if (game.mode === 'victory') {
    openDialog('victory', 'TWO PAGES COMPLETE', 'One version is enough.', 'The Queen’s crown falls into the ink. For a moment she is just another unfinished drawing. Line offers a hand. The Margin turns the page.');
    inner.append(text('p', '“Perhaps the Artist didn’t leave us an ending. Perhaps they left us room.” — Nib', 'dialog-quote'));
    stats(); inner.append(text('p', `${WEAPONS[game.weapon].name} · ${game.upgrades.map(id => UPGRADES.find(u => u.id === id).name).join(' · ') || 'No gifts'}`, 'build-list'));
    actions(button('Draw another adventure →', () => launch(false, true), 'primary'));
    subactions(button('Your build', showBuild, ''), link('Back to the arcade', '../../'), link('Release notes ↗', '../../news/#stick-and-swing-2-1'));
  } else closeDialog();
  $('pause-button').disabled = !['combat', 'tutorial'].includes(game.mode);
  $('build-button').disabled = ['title', 'tutorial'].includes(game.mode);
  $('tutorial-card').hidden = game.mode !== 'tutorial';
  $('arena-corner').hidden = !['combat', 'title'].includes(game.mode);
}
function stats() {
  const grid = text('div', '', 'stats-grid');
  for (const [value, label] of [[timeLabel(game.stats.time), 'Combat time'], [game.stats.kills, 'Enemies cleared'], [game.stats.parries, 'Perfect blocks'], [game.stats.retries, 'Retries'], [game.stats.inkEarned, 'Ink earned'], [game.stats.damageTaken, 'Damage taken']]) {
    const e = text('div', '', 'stat-card'); e.append(text('strong', String(value)), text('span', label)); grid.append(e);
  }
  inner.append(grid);
}
function showSettings() {
  openDialog('settings', 'MAKE YOURSELF AT HOME', 'Settings & controls', 'Use the mouse to aim, or attack with Space for automatic targeting.');
  const list = text('div', '', 'settings-list');
  for (const [key, name, description] of [
    ['sound', 'Sound effects', 'Hits, blocks, and enemy warnings.'],
    ['reduced', 'Reduced effects', 'Disable shake, reduce particles, and simplify menu motion.'],
    ['holdAttack', 'Hold to attack', 'Hold your attack button to chain sword swings.'],
  ]) {
    const label = text('label', '', 'setting'), words = text('span', '');
    words.append(text('strong', name), text('small', description));
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => { settings[key] = checkbox.checked; store.saveSettings(settings); applySettings(); audio.unlock(); });
    label.append(words, checkbox); list.append(label);
  }
  inner.append(list);
  const controls = text('dl', '', 'controls-grid');
  for (const [name, keys] of [['Move', 'WASD / arrow keys'], ['Aim', 'Mouse / automatic with Space'], ['Swing', 'Left click / Space'], ['Guard / perfect block', 'Hold / tap right click or F'], ['Dash', 'Shift'], ['Pause', 'Escape']]) {
    const item = text('div', ''); item.append(text('dt', name), text('dd', keys)); controls.append(item);
  }
  inner.append(controls);
  inner.append(text('p', 'Touch: drag the left stick to move; hold Swing or Guard and tap Dash on the right. Touch aiming selects the nearest enemy. While guarding, aim assist faces a nearby incoming shot. Guard takes priority over holding Swing.', 'build-list'));
  actions(button('Back', showMode, 'primary'));
}
function applySettings() {
  document.body.classList.toggle('reduce-effects', settings.reduced);
  $('sound-button').textContent = settings.sound ? 'Sound on' : 'Sound off';
  $('sound-button').setAttribute('aria-label', settings.sound ? 'Mute sound' : 'Enable sound');
  $('sound-button').setAttribute('aria-pressed', String(!settings.sound));
}
function lessonUI() {
  const l = LESSONS[game.lesson]; if (!l) return;
  $('lesson-count').textContent = `LESSON ${game.lesson + 1} / 5`;
  $('lesson-title').textContent = l.title; $('lesson-text').textContent = l.text;
  let hint = l.hint;
  if (matchMedia('(pointer: coarse)').matches) {
    hint = ['Drag the left stick.', 'Hold Swing. Your aim follows the nearest enemy.', 'Move with the left stick, then tap Dash.', 'Hold Guard on the right.', 'Let go of Guard between shots. Tap again when the shot is close.'][game.lesson];
  }
  $('lesson-hint').textContent = hint;
}
function processEvents() {
  for (const e of game.drainEvents()) {
    renderer?.event(e); audio.event(e);
    if (e.type === 'mode' || e.type === 'shop') showMode();
    if (e.type === 'hurt') { $('combat-feedback').textContent = `−${e.damage} health · ${e.source}`; $('combat-feedback').hidden = false; feedbackTime = 2.5; }
    if (e.type === 'room' || e.type === 'lesson' || e.type === 'mode') { $('combat-feedback').hidden = true; feedbackTime = 0; }
    if (e.type === 'lesson') lessonUI();
    if (e.type === 'lessonComplete') $('lesson-count').textContent = 'NICE. YOU’VE GOT IT.';
    if (e.type === 'storageWarning') $('save-note').textContent = 'Saving unavailable in this browser';
    if (e.type === 'note') showToast(e.text);
  }
}
let uiCache = {};
function setText(id, value) { if (uiCache[id] !== value) { $(id).textContent = value; uiCache[id] = value; } }
function setWidth(id, value) { const rounded = Math.round(clamp(value, 0, 1) * 100); if (uiCache[id] !== rounded) { $(id).style.width = `${rounded}%`; uiCache[id] = rounded; } }
function updateHUD() {
  const p = game.player;
  setText('health-value', `${Math.ceil(p.hp)} / ${p.maxHp}`); setWidth('health-fill', p.hp / p.maxHp);
  $('health-meter').classList.toggle('low', p.hp < p.maxHp * .3);
  $('health-meter').setAttribute('aria-valuenow', String(Math.ceil(p.hp))); $('health-meter').setAttribute('aria-valuemax', String(p.maxHp));
  setText('guard-value', p.broken > 0 ? 'Broken' : String(Math.ceil(p.guard))); setWidth('guard-fill', p.guard / 100);
  setText('dash-value', p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'Ready'); setWidth('dash-fill', 1 - p.dashCd / p.dashCooldown);
  const inRun = !['title', 'tutorial'].includes(game.mode), chapter = game.room >= 4 ? 'CHAPTER 02' : 'CHAPTER 01';
  setText('chapter-label', game.mode === 'tutorial' ? 'THE BASICS' : chapter);
  setText('room-value', inRun && game.room >= 0 ? `STOP ${game.room + 1} / 8` : 'THE ADVENTURE');
  setText('weapon-value', WEAPONS[game.weapon].name); setText('ink-value', `${game.ink} ink`);
  setText('combat-state', p.broken > 0 ? 'Guard broken · release to recover' : p.counter > 0 ? 'Counter ready · swing now' : '');
  setText('wave-value', game.mode === 'combat' ? `WAVE ${game.wave + 1} / ${NODES[game.node].waves.length}` : 'YOU ARE LINE');
  setText('touch-dash-state', p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'Ready');
  const nodes = $('room-progress').children;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.toggle('active', inRun && i === game.room); nodes[i].classList.toggle('done', inRun && i < game.room);
    if (inRun && i === game.room) nodes[i].setAttribute('aria-current', 'step'); else nodes[i].removeAttribute('aria-current');
  }
  const boss = game.enemies.find(e => e.boss && e.spawn <= 0 && e.hp > 0);
  $('boss-health').hidden = !boss || game.mode !== 'combat';
  if (boss) { setWidth('boss-fill', boss.hp / boss.maxHp); setText('boss-name', boss.name); setText('boss-phase', boss.phase === 2 ? 'PHASE II' : 'PHASE I'); }
  $('room-banner').hidden = game.mode !== 'combat' || game.banner.time <= 0 || !!boss;
  if (game.banner.time > 0) { setText('banner-title', game.banner.title); setText('banner-text', game.banner.text); }
}
try {
  renderer = new Renderer(canvas, game, settings);
  input = new Input(canvas, () => ['combat', 'tutorial'].includes(game.mode), () => { game.pause(); processEvents(); }, () => audio.unlock());
  $('build-button').addEventListener('click', () => { game.pause(); processEvents(); showBuild(); });
  $('pause-button').addEventListener('click', () => { input.clear(); game.pause(); processEvents(); });
  $('sound-button').addEventListener('click', () => { audio.unlock(); settings.sound = !settings.sound; store.saveSettings(settings); applySettings(); });
  $('skip-tutorial').addEventListener('click', () => { input.clear(); game.finishTutorial(); processEvents(); });
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    if (['settings', 'confirm', 'build', 'weapons'].includes(dialogView)) showMode();
    else if (game.mode === 'paused') { closeDialog(); game.resume(); processEvents(); }
  });
  const autoPause = () => { input.clear(); game.pause(); processEvents(); };
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('pagehide', () => input.clear());
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
    if (e.matches) { settings.reduced = true; store.saveSettings(settings); applySettings(); }
  });
  applySettings(); showMode(); updateHUD();
  let previous = performance.now(), accumulator = 0, hudClock = 0;
  function frame(now) {
    const dt = Math.min(Math.max((now - previous) / 1000, 0), .1); previous = now;
    const active = ['combat', 'tutorial'].includes(game.mode);
    accumulator = active ? Math.min(accumulator + dt, .1) : 0;
    while (accumulator >= 1 / 60) {
      game.step(1 / 60, input.sample(settings.holdAttack, game.hitStop <= 0)); accumulator -= 1 / 60;
      processEvents();
      if (!['combat', 'tutorial'].includes(game.mode)) { accumulator = 0; break; }
    }
    renderer.render(dt);
    hudClock += dt;
    if (hudClock > .08) { updateHUD(); hudClock = 0; }
    if (feedbackTime > 0) { feedbackTime -= dt; if (feedbackTime <= 0) $('combat-feedback').hidden = true; }
    if (toastTime > 0) { toastTime -= dt; if (toastTime <= 0) $('toast').hidden = true; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
} catch (error) {
  const box = text('div', '', 'fallback');
  box.append(text('h1', 'This page couldn’t open.'), text('p', 'Try reloading in an updated browser. Your saved checkpoint will still be there.'), link('Back to the arcade', '../../'));
  document.body.append(box);
  console.error('Stick & Swing startup:', error);
}
