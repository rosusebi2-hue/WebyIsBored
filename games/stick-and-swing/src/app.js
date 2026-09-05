import { VERSION, NODES, ENEMIES, WEAPONS, LESSONS, UPGRADES, SHOP_HEAL, EVENTS, ABILITIES, FINISHERS, MASTERIES, SYNERGIES, JOURNAL, DEFAULT_BINDINGS, KEEPSAKES, MEMORIES, keepsakeUnlocked, unlocked, giftPrice, clamp } from './config.js?v=2.3.0';
import { SaveStore } from './storage.js?v=2.3.0';
import { Game } from './engine.js?v=2.3.0';
import { Renderer } from './renderer.js?v=2.3.0';
import { Input, keyLabel } from './input.js?v=2.3.0';
import { AudioEngine } from './audio.js?v=2.3.0';

import { buildReport } from './report.js?v=2.3.0';
const t = (value, params) => globalThis.WebyI18n?.t(value, params) || String(value).replace(/\{(\w+)\}/g, (_, key) => params?.[key] ?? `{${key}}`);
const errors = [];
window.addEventListener('error', e => errors.push(String(e.message).slice(0, 300)));
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason?.message || e.reason).slice(0, 300)));
const $ = id => document.getElementById(id);
const text = (tag, content, className) => { const e = document.createElement(tag); if (globalThis.WebyI18n) WebyI18n.setText(e, content); else e.textContent = t(content); if (className) e.className = className; return e; };
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

function showToast(message, duration = 3) { $('toast').textContent = t(message); $('toast').hidden = false; toastTime = duration; }
function button(label, action, className = 'secondary') {
  const b = text('button', label, className); b.type = 'button';
  b.addEventListener('click', () => { audio.unlock(); action(); processEvents(); }); return b;
}
function openDialog(view, eyebrow, title, copy, wide = false) {
  dialogView = view; dialog.dataset.view = view;
  inner.replaceChildren(); if (globalThis.WebyI18n) inner.append(WebyI18n.makeSelector()); inner.className = wide ? 'dialog-inner wide' : 'dialog-inner';
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
function launch(practice = false, confirmed = false, mode = 'chapter') {
  if (!confirmed && (store.loadRun() || game.checkpoint)) {
    openDialog('confirm', 'A FRESH PAGE', 'Start over?', 'This replaces your current adventure checkpoint. Your settings and past clears stay saved.');
    actions(button('Choose a weapon', () => launch(practice, true, mode), 'primary'), button('Go back', showMode)); return;
  }
  openDialog('weapons', 'YOUR FIRST CHOICE', 'How will you make your mark?', 'All three weapons are ready. Workshop choices apply when you start a new run.', true);
  const grid = text('div', '', 'upgrade-grid weapon-grid');
  for (const [id, w] of Object.entries(WEAPONS)) {
    const card = button('', () => { closeDialog(); game.startNew(mode !== 'rush' && (practice || !store.profile().tutorialDone), Date.now() >>> 0, id, mode); }, 'upgrade-card weapon-card');
    card.style.setProperty('--weapon-color', w.color);
    card.append(text('span', w.icon, 'upgrade-icon'), text('span', w.tag, 'upgrade-tag'), text('strong', w.name), text('p', w.description), text('small', w.detail, 'weapon-detail'), text('span', 'Take this weapon →', 'upgrade-pick'));
    const form = store.profile().loadouts[id].ability, ability = ABILITIES[id]; card.append(text('small', form === 'alternate' ? ability.alternateDescription : ability.description, 'weapon-detail'));
    grid.append(card);
  }
  inner.append(grid); subactions(button('Go back', showMode, ''));
}
function showTitle() {
  const save = store.loadRun(), profile = store.profile();
  openDialog('title', `STICK & SWING · ${VERSION}`, 'The quiet margin.', 'Your home between the pages. Choose a keepsake, take a blade, and bring the lost drawings back.', true);
  const cover = text('div', '', 'home-cover');
  cover.append(text('p', 'CHAPTER I', 'dialog-eyebrow'), text('h3', 'The Lost Drawing'), text('p', profile.memories.includes('home') ? 'The road home is safe. There are still other paths and memories to discover.' : 'Rescue Rook. Find the missing wings. Keep the road home from being erased.'));
  inner.append(cover);
  if (save) actions(button(`Continue · ${save.room < 0 ? 'Choose your route' : NODES[save.node].title}`, () => { closeDialog(); game.restore(save); }, 'primary'), button('New adventure', () => launch()));
  else actions(button('Begin Chapter I →', () => launch(), 'primary'));
  subactions(button('Workshop', () => showWorkshop(), ''), button('Journal', showJournal, ''), button('Extras', showExtras, ''), button('Settings', showSettings, ''));
  inner.append(text('h3', 'Take a keepsake'));
  const keepsakes = text('div', '', 'keepsake-grid');
  for (const [id, item] of Object.entries(KEEPSAKES)) {
    const unlocked = keepsakeUnlocked(profile, id), selected = profile.keepsake === id;
    const card = button('', () => { const p = store.profile(); p.keepsake = id; if (!store.saveProfile(p)) showToast('Saving unavailable in this browser'); showTitle(); }, 'keepsake-card');
    card.disabled = !unlocked; card.setAttribute('aria-pressed', String(selected));
    card.append(text('span', selected ? 'Selected' : unlocked ? 'Available' : 'Locked', 'upgrade-tag'), text('strong', item.name), text('p', item.description)); keepsakes.append(card);
  }
  inner.append(keepsakes, text('p', 'Keepsakes apply to new Chapter I runs. Your current checkpoint keeps its original choice.', 'field-note'));
  const memories = text('div', '', 'memory-list');
  for (const [id, item] of Object.entries(MEMORIES)) { const row = text('div', '', 'memory-row'); row.append(text('span', profile.memories.includes(id) ? '✓' : '○'), text('strong', item.name), text('small', item.description)); memories.append(row); }
  inner.append(text('h3', t('Memories restored: {0} / 3', { 0: profile.memories.length })), memories);
  inner.append(text('p', profile.memories.includes('rook') ? 'Rook: “You came back. I kept your place.”' : 'Nib: “There is room here for one more drawing.”', 'dialog-quote'));
  subactions(button('Learn the controls', () => launch(true), ''), button('Recent runs', showHistory, ''), link('What’s new ↗', '../../news/#stick-and-swing-2-3'));
}
function showExtras() {
  openDialog('extras', 'MORE PAGES TO EXPLORE', 'Extras', 'The original expedition, challenges, and practice share your weapon mastery. Starting a run replaces the current checkpoint.', true);
  const grid = text('div', '', 'mode-grid');
  for (const [name, copy, action] of [['Sketchbook expedition', '12 stops · 3 chapters · 3 bosses', () => launch(false, false, 'adventure')], ['Boss Rush', 'Three bosses. One prepared build. Beat your own time.', () => launch(false, false, 'rush')], ['Practice arena', 'Choose an enemy and learn at your own pace.', showPractice]]) {
    const card = button('', action, 'mode-card'); card.append(text('strong', name), text('small', copy)); grid.append(card);
  }
  inner.append(grid); actions(button('Back', showMode, 'primary'));
}
function wallet() {
  const row = text('div', '', 'journey-wallet');
  row.append(text('span', WEAPONS[game.weapon].name, 'wallet-weapon'), text('span', `${Math.ceil(game.player.hp)} / ${game.player.maxHp} health`), text('strong', `${game.ink} ink`));
  inner.append(row);
}
function routeMap() {
  const map = text('ol', '', 'route-map'); map.setAttribute('aria-label', 'Your adventure route');
  game.route.forEach((options, i) => {
    const id = game.path[i], next = i === game.room + 1;
    const cell = text('li', '', `map-stop ${id ? 'visited' : ''} ${next ? 'next' : ''} ${options.length === 1 && NODES[options[0]].kind === 'boss' ? 'map-boss' : ''}`);
    if (next) cell.setAttribute('aria-current', 'step');
    cell.append(text('span', `${String(i + 1).padStart(2, '0')} · ${game.runMode === 'chapter' ? 'PAGE I' : game.runMode === 'rush' ? 'BOSS' : i < 4 ? 'PAGE I' : i < 8 ? 'PAGE II' : 'PAGE III'}`, 'map-number'));
    cell.append(text('strong', id ? NODES[id].title : options.length === 1 ? NODES[options[0]].title : options.some(id => NODES[id].kind === 'shop') ? 'Shop or recovery' : 'Battle or challenge'));
    cell.append(text('small', next ? 'Choose this stop' : id ? 'Your path' : 'Ahead'));
    map.append(cell);
  });
  return map;
}
function showRoute() {
  openDialog('route', `STOP ${game.room + 2} / ${game.route.length} · ${game.runMode === 'chapter' ? 'THE LOST DRAWING' : game.runMode === 'rush' ? 'BOSS RUSH' : game.room + 1 < 4 ? 'THE FIRST PAGE' : game.room + 1 < 8 ? 'THE SECOND PAGE' : 'THE TORN BINDING'}`, game.routeOptions().length > 1 ? 'Choose your next mark.' : game.room < 0 ? 'Your adventure starts here.' : 'Turn the page.', (game.runMode === 'rush' ? 'Start with stronger hits, extra health, and a faster dash. Between bosses, choose a gift and recover all health.' : NODES[game.node]?.outro) || 'Every route moves you forward. Ink buys gifts at Nib’s shop; recovery stops restore health for free.', true);
  wallet();
  if (game.runMode === 'chapter') inner.append(text('p', game.room < 3 ? 'Find Rook in the archive.' : 'Rook is safe. Stop the Brute and restore the road home.', 'chapter-objective'));
  const grid = text('div', '', `route-choices ${game.routeOptions().length === 1 ? 'single' : ''}`);
  const labels = { combat: 'BATTLE', elite: 'HARDER BATTLE · MORE INK', shop: 'SHOP', rest: 'RECOVERY', boss: 'BOSS' };
  for (const id of game.routeOptions()) {
    const n = NODES[id], card = button('', () => { closeDialog(); game.chooseRoute(id); }, `upgrade-card route-card ${n.kind}`);
    card.append(text('span', labels[n.kind], 'upgrade-tag'), text('strong', n.title), text('p', n.note));
    if (n.waves) {
      const ink = n.reward + n.waves.flat().reduce((sum, type) => sum + ENEMIES[type].ink, 0);
      card.append(text('small', `${n.waves.length} ${n.waves.length === 1 ? 'wave' : 'waves'} · ${ink} ink${['knight', 'eraser'].includes(id) ? '' : game.runMode === 'rush' ? ' · a gift + full health' : ' · a gift + 16 health'}`, 'route-reward'));
    }
    card.append(text('span', 'Take this route →', 'upgrade-pick')); grid.append(card);
  }
  inner.append(grid);
  const overview = text('details', '', 'route-overview'); overview.open = matchMedia('(min-width: 761px)').matches;
  overview.append(text('summary', 'Your full route'), routeMap()); inner.append(overview);
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
  if (game.keepsake) { const k = KEEPSAKES[game.keepsake], row = text('li', ''); row.append(text('strong', k.name), text('span', k.description)); list.append(row); }
  for (const id of game.upgrades) {
    const u = UPGRADES.find(x => x.id === id), row = text('li', '');
    row.append(text('strong', u.name), text('span', u.description)); list.append(row);
  }
  if (game.upgrades.length || game.keepsake) inner.append(list);
  else inner.append(text('p', 'Clear a battle to choose your first gift.', 'build-list'));
  const ability = ABILITIES[game.weapon];
  inner.append(text('h3', game.forms.ability === 'alternate' ? ability.alternate : ability.name), text('p', game.forms.ability === 'alternate' ? ability.alternateDescription : ability.description, 'build-list'));
  for (const combo of SYNERGIES.filter(s => s.ids.every(id => game.upgrades.includes(id)))) {
    const row = text('div', '', 'synergy'); row.append(text('strong', combo.title), text('p', combo.text)); inner.append(row);
  }
  actions(button('Back', showMode, 'primary'));
}
function selectField(name, values, selected, change) {
  const label = text('label', '', 'select-setting'), select = document.createElement('select');
  label.append(text('span', name));
  for (const [value, title, disabled = false] of values) {
    const option = text('option', title); option.value = value; option.disabled = disabled; option.selected = value === String(selected); select.append(option);
  }
  select.value = String(selected); select.addEventListener('change', () => change(select.value)); label.append(select); return label;
}
function showWorkshop(weapon = 'scrapsteel') {
  const profile = store.profile(), loadout = profile.loadouts[weapon];
  openDialog('workshop', 'THE WORKSHOP', 'Make the blade your own.', 'Mastery carries across adventures and Boss Rush. Training gives no mastery. New choices apply to your next run.', true);
  inner.append(selectField('Weapon', Object.entries(WEAPONS).map(([id, w]) => [id, w.name]), weapon, showWorkshop));
  const grid = text('div', '', 'mastery-grid');
  for (const task of MASTERIES[weapon]) {
    const card = text('div', '', 'mastery-card'), count = profile.mastery[weapon][task.metric], done = count >= task.goal;
    const reward = task.unlock === 'finisher' ? FINISHERS[weapon].name : task.unlock === 'ability' ? ABILITIES[weapon].alternate : 'Master’s scarf';
    card.append(text('span', done ? 'UNLOCKED' : 'MASTERY CHALLENGE', 'upgrade-tag'), text('strong', task.label), text('p', `${Math.min(count, task.goal)} / ${task.goal}`), text('small', t('Reward: {0}', { 0: t(reward) })));
    const progress = document.createElement('progress'); progress.max = task.goal; progress.value = Math.min(count, task.goal); progress.setAttribute('aria-label', t(task.label)); card.append(progress); grid.append(card);
  }
  inner.append(grid);
  for (const [part, name, base, alternate, description] of [
    ['finisher', 'Third strike', 'Original combo', FINISHERS[weapon].name, FINISHERS[weapon].description],
    ['ability', 'Active ability', ABILITIES[weapon].name, ABILITIES[weapon].alternate, ABILITIES[weapon].alternateDescription],
    ['appearance', 'Appearance', 'Classic scarf', 'Master’s scarf', 'A bright scarf and warm paper finish. A cosmetic reward with no stat bonus.'],
  ]) {
    const isOpen = unlocked(profile, weapon, part), original = part === 'appearance' ? 'classic' : 'standard', alt = part === 'appearance' ? 'master' : 'alternate';
    inner.append(selectField(name, [[original, base], [alt, isOpen ? alternate : t('{0} · locked', { 0: t(alternate) }), !isOpen]], loadout[part], value => {
      const current = store.profile(); current.loadouts[weapon][part] = value; store.saveProfile(current); showToast('Workshop choice saved for your next run.');
    }), text('p', description, 'field-note'));
  }
  actions(button('Back', showMode, 'primary'));
}
function showPractice() {
  openDialog('practice', 'LEARN AT YOUR OWN PACE', 'The practice page.', 'Choose any enemy or boss phase. Your adventure checkpoint stays saved. Practice gives no ink, records, or mastery.', true);
  const options = { enemy: 'scrapper', weapon: game.weapon, phase: 1, invincible: true, ranges: true };
  inner.append(selectField('Weapon', Object.entries(WEAPONS).map(([id, w]) => [id, w.name]), options.weapon, value => options.weapon = value));
  inner.append(selectField('Opponent', Object.entries(ENEMIES).map(([id, e]) => [id, e.name]), options.enemy, value => options.enemy = value));
  inner.append(selectField('Boss phase', [['1', 'Phase I'], ['2', 'Phase II']], '1', value => options.phase = Number(value)));
  for (const [key, name] of [['invincible', 'Invincibility'], ['ranges', 'Show attack ranges']]) {
    const label = text('label', '', 'setting'), checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = true;
    checkbox.addEventListener('change', () => options[key] = checkbox.checked); label.append(text('span', name), checkbox); inner.append(label);
  }
  actions(button('Enter practice →', () => { closeDialog(); game.startPractice(options); }, 'primary'), button('Back', showMode));
}
function showJournal() {
  const profile = store.profile();
  openDialog('journal', 'THE DRAWINGS WE MEET', 'Your sketchbook journal.', 'Meet drawings in an adventure or Boss Rush to keep their notes here. Rescued drawings stay with you.', true);
  const grid = text('div', '', 'journal-grid');
  for (const [id, entry] of Object.entries(JOURNAL)) {
    const discovered = profile.discovered.includes(id), card = text('article', '', 'journal-card');
    card.append(text('h3', discovered ? ENEMIES[id].name : 'An undiscovered drawing'), text('p', discovered ? entry : 'Keep exploring to reveal this page.')); grid.append(card);
  }
  inner.append(grid, text('h3', 'Forgotten drawings'));
  inner.append(text('p', profile.rescued.includes('rescue') ? 'The rain sketch is safe. Nib gave it a dry corner of the book.' : 'A little drawing is still waiting for shelter.', 'build-list'));
  inner.append(text('p', profile.rescued.includes('echo') ? 'The answering drawing has a voice again. It knows someone is reading.' : 'Somewhere between the pages, a quiet voice is waiting.', 'build-list'));
  actions(button('Back', showMode, 'primary'));
}
function showHistory() {
  openDialog('history', 'YOUR RECENT PAGES', 'Every attempt leaves a mark.', 'The last ten finished attempts are kept on this browser and device. Combat time includes retries; menus are excluded.', true);
  const profile = store.profile(), records = store.history();
  for (const [id, w] of Object.entries(WEAPONS)) inner.append(text('p', t('Boss Rush · {0}: {1}', { 0: w.name, 1: profile.rushBest[id] ? timeLabel(profile.rushBest[id]) : t('No clear yet') }), 'build-list'));
  if (!records.length) inner.append(text('p', 'Finish an adventure attempt or Boss Rush to start your history.', 'build-list'));
  for (const r of records) {
    const row = text('article', '', 'history-row');
    row.append(text('strong', `${r.result === 'victory' ? 'Victory' : 'Defeat'} · ${WEAPONS[r.weapon].name}`), text('p', t('{0} · {1} · stop {2}', { 0: t(r.mode === 'chapter' ? 'Chapter I' : r.mode === 'rush' ? 'Boss Rush' : 'Adventure'), 1: timeLabel(r.time), 2: r.stop })), text('small', t('Seed {0} · {1}', { 0: r.seed, 1: r.date.slice(0, 10) })));
    const details = text('details', ''); details.append(text('summary', 'Route and build'), text('p', r.path.map(id => t(NODES[id].title)).join(' → ')), text('p', r.build.map(id => t(UPGRADES.find(u => u.id === id).name)).join(' · ') || 'No gifts')); row.append(details); inner.append(row);
  }
  actions(button('Back', showMode, 'primary')); subactions(button('Copy a bug report', showReport, ''));
}
function showReport() {
  openDialog('report', 'HELP IMPROVE THE GAME', 'A useful bug report.', 'Copy these details and add what happened. Nothing is sent automatically. You can share the report when you contact us.', true);
  const report = document.createElement('textarea'); report.value = buildReport(game, settings, errors); report.readOnly = true; report.rows = 12; report.className = 'report-text'; report.setAttribute('aria-label', t('Bug report details')); report.dataset.noI18n = ''; inner.append(report);
  actions(button('Copy report', async () => {
    try { await navigator.clipboard.writeText(report.value); showToast('Report copied. Add the steps that caused the problem.'); }
    catch { report.focus(); report.select(); showToast('Select and copy the report from this box.'); }
  }, 'primary'), button('Back', showMode));
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
  else if (game.mode === 'event') {
    const event = EVENTS.find(e => e.id === game.eventId);
    openDialog('event', 'BETWEEN THE LINES', event.title, event.text, true); wallet();
    const choices = text('div', '', 'event-choices');
    for (const c of event.choices) {
      const choice = button(c.label, () => { if (game.chooseEvent(c.id)) closeDialog(); }, 'event-choice');
      choice.disabled = game.ink + (c.ink || 0) < 0 || game.player.hp <= (c.hurt || 0); choices.append(choice);
    }
    inner.append(choices); subactions(button('Save & title', () => game.title(), ''));
  } else if (game.mode === 'practiceResult') {
    openDialog('practiceResult', 'PRACTICE COMPLETE', 'One more page?', 'Try another approach or return to your adventure. Practice has not changed your saved progress.');
    actions(button('Practice again', () => { closeDialog(); game.startPractice(game.practiceOptions); }, 'primary'), button('Choose another opponent', showPractice));
    subactions(button('Title screen', () => game.title(), ''));
  }
  else if (game.mode === 'rest') {
    openDialog('rest', 'A QUIET MOMENT · THE MARGIN', 'Leave some space.', '“Even a good drawing needs a little blank space.” The ink settles. You can breathe again.');
    wallet();
    const heal = Math.min(50, game.player.maxHp - game.player.hp);
    inner.append(text('p', heal > 0 ? `Recover ${Math.ceil(heal)} health. No ink needed.` : 'You’re already at full health. Take the quiet path onward.', 'dialog-quote'));
    actions(button('Rest & continue →', () => game.takeRest(), 'primary'));
  } else if (game.mode === 'paused') {
    openDialog('paused', 'TAKE A BREATH', 'The page can wait.', 'Your run is paused. Return when you’re ready.');
    actions(button('Back to the fight →', () => { closeDialog(); game.resume(); }, 'primary'), button('Settings & controls', showSettings));
    subactions(button('Your build', showBuild, ''), button('Copy a bug report', showReport, ''), button('Title screen', () => game.title(), ''), link('Back to the arcade', '../../'));
    inner.append(text('p', 'Continue restores the encounter’s entrance. Route choices, gifts, and shop purchases save immediately on this browser and device.', 'build-list'));
  } else if (game.mode === 'reward') {
    openDialog('reward', `${game.currentNode.title} · CLEARED`, 'Make your next mark.', game.runMode === 'rush' ? 'Choose a gift to prepare for the next boss. All health will be restored.' : 'Choose one gift for this adventure. You’ll also recover 16 health. Your ink is already collected.', true);
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
    inner.append(text('p', game.lastHit?.reason || game.currentNode.note, 'dialog-quote')); stats();
    actions(button('Retry this encounter →', () => { closeDialog(); game.retryRoom(); }, 'primary'), button('New adventure', () => launch()));
    subactions(button('See your build', showBuild, ''), button('Copy a bug report', showReport, ''), button('Title screen', () => game.title(), ''), link('Back to the arcade', '../../'));
  } else if (game.mode === 'victory') {
    openDialog('victory', game.runMode === 'chapter' ? 'CHAPTER I COMPLETE' : game.runMode === 'rush' ? 'BOSS RUSH COMPLETE' : 'THREE CHAPTERS COMPLETE', 'Room for every drawing.', game.runMode === 'chapter' ? 'The Brute stops erasing. Rook draws a doorway in the last blank space. Beyond it, Nib has set a third place at the table. You brought someone home.' : game.runMode === 'rush' ? 'The Brute, the Queen, and the Knight have fallen. Your time is saved for this weapon.' : 'The Knight sets down his sword. Together, the drawings take the weight of the binding. The book holds. There is room for everyone, even the unfinished.');
    if (game.runMode === 'chapter') inner.append(text('p', 'The unfinished quill is unlocked. Choose it at home to change your next run.', 'chapter-objective'));
    inner.append(text('p', '“Perhaps the Artist didn’t leave us an ending. Perhaps they left us room.” — Nib', 'dialog-quote'));
    stats(); inner.append(text('p', `${WEAPONS[game.weapon].name} · ${game.upgrades.map(id => UPGRADES.find(u => u.id === id).name).join(' · ') || 'No gifts'}`, 'build-list'));
    actions(button(game.runMode === 'chapter' ? 'Return home →' : 'Draw another adventure →', () => game.runMode === 'chapter' ? game.title() : launch(false, true, game.runMode), 'primary'));
    subactions(button('Your build', showBuild, ''), button('Title screen', () => game.title(), ''), link('Back to the arcade', '../../'), link('Release notes ↗', '../../news/#stick-and-swing-2-3'));
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
  openDialog('settings', 'MAKE YOURSELF AT HOME', 'Settings & controls', 'Use the mouse to aim, or use the keyboard for automatic targeting.', true);
  const list = text('div', '', 'settings-list');
  for (const [key, name, description] of [
    ['sound', 'Sound effects', 'Hits, blocks, and enemy warnings.'],
    ['reduced', 'Reduced effects', 'Disable shake, reduce particles, and simplify menu motion.'],
    ['holdAttack', 'Hold to attack', 'Hold your attack button to chain sword swings.'],
    ['contrast', 'High-contrast arena', 'Brighter outlines for enemies, attacks, and hazards.'],
    ['cues', 'Attack symbols', 'Show symbols for blockable attacks, floor hazards, and recovery openings.'],
    ['coach', 'Contextual guidance', 'Show short control hints during Chapter I.'],
  ]) {
    const label = text('label', '', 'setting'), words = text('span', '');
    words.append(text('strong', name), text('small', description));
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => { settings[key] = checkbox.checked; store.saveSettings(settings); applySettings(); audio.unlock(); });
    label.append(words, checkbox); list.append(label);
  }
  inner.append(list);
  inner.append(text('p', '◇ Block or parry · × Move out · + Attack during recovery', 'field-note'));
  inner.append(text('h3', 'Keyboard bindings'));
  const bindingGrid = text('div', '', 'binding-grid'), keys = ['Space', 'ShiftLeft', 'ShiftRight', 'Escape', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(k => `Key${k}`), ...'0123456789'.split('').map(k => `Digit${k}`), 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const names = { up: 'Move up', down: 'Move down', left: 'Move left', right: 'Move right', attack: 'Swing', guard: 'Guard', dash: 'Dash', ability: 'Ability', pause: 'Pause' };
  for (const [action, name] of Object.entries(names)) bindingGrid.append(selectField(name, keys.map(k => [k, keyLabel(k)]), settings.bindings[action], value => {
    const occupied = Object.keys(settings.bindings).find(key => key !== action && settings.bindings[key] === value);
    if (occupied) settings.bindings[occupied] = settings.bindings[action];
    settings.bindings[action] = value; store.saveSettings(settings); input.clear(); applySettings(); showSettings();
  }));
  inner.append(bindingGrid);
  subactions(button('Reset keyboard bindings', () => { settings.bindings = { ...DEFAULT_BINDINGS }; store.saveSettings(settings); applySettings(); showSettings(); }, ''));
  inner.append(selectField('Touch button side', [['right', 'Right'], ['left', 'Left']], settings.touchSide, value => { settings.touchSide = value; store.saveSettings(settings); applySettings(); }));
  inner.append(selectField('Touch control size', [['0.85', 'Compact'], ['1', 'Standard'], ['1.2', 'Large']], settings.touchScale, value => { settings.touchScale = Number(value); store.saveSettings(settings); applySettings(); }));
  const controls = text('dl', '', 'controls-grid');
  for (const [name, keys] of [['Move', 'Left stick'], ['Aim', 'Right stick / automatic'], ['Swing', 'X / Square'], ['Guard / perfect block', 'RT / R2'], ['Dash', 'A / Cross'], ['Ability', 'Y / Triangle'], ['Pause', 'Start / Options']]) {
    const item = text('div', ''); item.append(text('dt', name), text('dd', keys)); controls.append(item);
  }
  inner.append(text('h3', 'Controller'), controls);
  inner.append(text('p', 'Connect a standard controller and press a button. In menus, use the D-pad to move and A / Cross to choose. Press A / Cross on a dropdown to cycle its options.', 'build-list'));
  inner.append(text('p', 'Touch: drag the stick to move. Hold Swing or Guard; tap Dash or Ability. Aiming follows the nearest enemy. Guard turns toward nearby incoming shots and takes priority over Swing.', 'build-list'));
  actions(button('Back', showMode, 'primary'));
}
function applySettings() {
  document.body.classList.toggle('reduce-effects', settings.reduced);
  document.body.classList.toggle('high-contrast', settings.contrast);
  $('sound-button').textContent = t(settings.sound ? 'Sound on' : 'Sound off');
  $('sound-button').setAttribute('aria-label', t(settings.sound ? 'Mute sound' : 'Enable sound'));
  $('sound-button').setAttribute('aria-pressed', String(!settings.sound));
  document.body.classList.toggle('touch-left', settings.touchSide === 'left');
  $('touch-controls').style.setProperty('--touch-scale', settings.touchScale);
  const hints = $('keyboard-hints'); hints.replaceChildren();
  for (const [name, keys] of [['Move', [settings.bindings.up, settings.bindings.left, settings.bindings.down, settings.bindings.right].map(keyLabel).join(' / ')], ['Swing', keyLabel(settings.bindings.attack)], ['Guard', keyLabel(settings.bindings.guard)], ['Dash', keyLabel(settings.bindings.dash)], ['Ability', keyLabel(settings.bindings.ability)]]) {
    const item = text('span', ''); item.append(text('kbd', keys), text('span', name)); hints.append(item);
  }
  $('arena').setAttribute('aria-label', t('Game arena. Controls can be changed in Settings.'));
}
function lessonUI() {
  const l = LESSONS[game.lesson]; if (!l) return;
  $('lesson-count').textContent = t(`LESSON ${game.lesson + 1} / ${LESSONS.length}`);
  $('lesson-title').textContent = t(l.title); $('lesson-text').textContent = t(l.text);
  let hint = l.hint;
  if (matchMedia('(pointer: coarse)').matches) {
    hint = ['Drag the movement stick.', 'Hold Swing. Your aim follows the nearest enemy.', 'Move with the stick, then tap Dash.', 'Hold Guard.', 'Let go of Guard between shots. Tap again when the shot is close.'][game.lesson];
  }
  if (!matchMedia('(pointer: coarse)').matches) hint = game.lesson === 0 ? t('Move with {0}.', { 0: [settings.bindings.up, settings.bindings.left, settings.bindings.down, settings.bindings.right].map(keyLabel).join(' / ') }) : game.lesson === 1 ? t('Hold {0} to swing. Mouse aims; keyboard selects a target.', { 0: keyLabel(settings.bindings.attack) }) : game.lesson === 2 ? t('Move toward the circle and press {0}.', { 0: keyLabel(settings.bindings.dash) }) : t('Hold or tap {0} to guard. Face the incoming shot.', { 0: keyLabel(settings.bindings.guard) });
  $('lesson-hint').textContent = t(hint);
  if (game.lesson === 5) $('lesson-hint').textContent = matchMedia('(pointer: coarse)').matches ? t('Tap Ability.') : t('Press {0} to use your ability.', { 0: keyLabel(settings.bindings.ability) });
}
function processEvents() {
  for (const e of game.drainEvents()) {
    renderer?.event(e); audio.event(e);
    if (e.type === 'mode' || e.type === 'shop') showMode();
    if (e.type === 'hurt') { $('combat-feedback').textContent = t(`−${e.damage} health · ${e.source}`); $('combat-feedback').hidden = false; feedbackTime = 2.5; }
    if (e.type === 'room' || e.type === 'lesson' || e.type === 'mode') { $('combat-feedback').hidden = true; feedbackTime = 0; }
    if (e.type === 'lesson') lessonUI();
    if (e.type === 'lessonComplete') $('lesson-count').textContent = 'NICE. YOU’VE GOT IT.';
    if (e.type === 'storageWarning') $('save-note').textContent = 'Saving unavailable in this browser';
    if (e.type === 'note') showToast(e.text);
  }
}
let uiCache = {};
function setText(id, value) { const translated = t(value); if (uiCache[id] !== translated) { $(id).textContent = translated; uiCache[id] = translated; } }
function setWidth(id, value) { const rounded = Math.round(clamp(value, 0, 1) * 100); if (uiCache[id] !== rounded) { $(id).style.width = `${rounded}%`; uiCache[id] = rounded; } }
function updateHUD() {
  const p = game.player;
  $('chapter-guide').hidden = game.runMode !== 'chapter' || game.mode !== 'combat';
  if (game.runMode === 'chapter' && game.mode === 'combat') {
    const remaining = game.fragments.filter(f => !f.secret && !f.collected).length;
    setText('objective-text', game.exitReady ? 'The way is clear. Enter the doorway.' : remaining ? `Restore Rook’s wings: ${3 - remaining} / 3 fragments` : game.node === 'eraser' ? 'Defeat the Brute. Restore the road home.' : 'Clear the room to open the way.');
    const prompts = { swing: 'Swing', guard: 'Guard', dash: 'Dash', ability: 'Ability' }, action = game.currentNode.lesson;
    const binding = action === 'swing' ? 'attack' : action;
    $('coach-text').hidden = !settings.coach;
    $('coach-text').textContent = settings.coach ? (prompts[action] ? `${t(prompts[action])} · ${keyLabel(settings.bindings[binding])} — ` : '') + t(game.currentNode.note) : '';
  }
  setText('health-value', `${Math.ceil(p.hp)} / ${p.maxHp}`); setWidth('health-fill', p.hp / p.maxHp);
  $('health-meter').classList.toggle('low', p.hp < p.maxHp * .3);
  $('health-meter').setAttribute('aria-valuenow', String(Math.ceil(p.hp))); $('health-meter').setAttribute('aria-valuemax', String(p.maxHp));
  setText('guard-value', p.broken > 0 ? 'Broken' : String(Math.ceil(p.guard))); setWidth('guard-fill', p.guard / p.maxGuard);
  setText('dash-value', p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'Ready'); setWidth('dash-fill', 1 - p.dashCd / p.dashCooldown);
  setText('ability-name', game.forms.ability === 'alternate' ? ABILITIES[game.weapon].alternate : ABILITIES[game.weapon].name);
  setText('ability-value', p.abilityCd > 0 ? `${p.abilityCd.toFixed(1)}s` : 'Ready'); setWidth('ability-fill', 1 - p.abilityCd / p.abilityCooldown);
  setText('touch-ability-state', p.abilityCd > 0 ? `${p.abilityCd.toFixed(1)}s` : 'Ready');
  const inRun = !['title', 'tutorial'].includes(game.mode), chapter = game.runMode === 'practice' ? 'PRACTICE' : game.runMode === 'chapter' ? 'CHAPTER 01' : game.runMode === 'rush' ? 'BOSS RUSH' : game.room >= 8 ? 'CHAPTER 03' : game.room >= 4 ? 'CHAPTER 02' : 'CHAPTER 01';
  setText('chapter-label', game.mode === 'tutorial' ? 'THE BASICS' : chapter);
  setText('room-value', game.runMode === 'practice' ? 'PRACTICE' : inRun && game.room >= 0 ? `STOP ${game.room + 1} / ${game.route.length}` : 'THE ADVENTURE');
  setText('weapon-value', WEAPONS[game.weapon].name); setText('ink-value', `${game.ink} ink`);
  setText('combat-state', p.broken > 0 ? 'Guard broken · release to recover' : p.counter > 0 ? 'Counter ready · swing now' : '');
  setText('wave-value', game.mode === 'combat' ? `WAVE ${game.wave + 1} / ${game.currentNode.waves.length}` : 'YOU ARE LINE');
  setText('touch-dash-state', p.dashCd > 0 ? `${p.dashCd.toFixed(1)}s` : 'Ready');
  const nodes = $('room-progress').children;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].hidden = game.runMode === 'practice' || i >= game.route.length;
    nodes[i].classList.toggle('active', inRun && i === game.room); nodes[i].classList.toggle('done', inRun && i < game.room);
    if (inRun && i === game.room) nodes[i].setAttribute('aria-current', 'step'); else nodes[i].removeAttribute('aria-current');
  }
  const boss = game.enemies.find(e => (e.boss || e.champion) && e.spawn <= 0 && e.hp > 0);
  $('boss-health').hidden = !boss || game.mode !== 'combat';
  if (boss) { setWidth('boss-fill', boss.hp / boss.maxHp); setText('boss-name', boss.name); setText('boss-phase', boss.champion ? 'MINIBOSS' : boss.phase === 2 ? 'PHASE II' : 'PHASE I'); }
  $('room-banner').hidden = game.mode !== 'combat' || game.banner.time <= 0 || !!boss;
  if (game.banner.time > 0) { setText('banner-title', game.banner.title); setText('banner-text', game.banner.text); }
}
try {
  renderer = new Renderer(canvas, game, settings);
  input = new Input(canvas, () => ['combat', 'tutorial'].includes(game.mode), () => { game.pause(); processEvents(); }, () => audio.unlock(), settings);
  $('build-button').addEventListener('click', () => { game.pause(); processEvents(); showBuild(); });
  $('pause-button').addEventListener('click', () => { input.clear(); game.pause(); processEvents(); });
  $('sound-button').addEventListener('click', () => { audio.unlock(); settings.sound = !settings.sound; store.saveSettings(settings); applySettings(); });
  $('skip-tutorial').addEventListener('click', () => { input.clear(); game.finishTutorial(); processEvents(); });
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    if (['settings', 'confirm', 'build', 'weapons', 'workshop', 'practice', 'journal', 'history', 'report', 'extras'].includes(dialogView)) showMode();
    else if (game.mode === 'paused') { closeDialog(); game.resume(); processEvents(); }
  });
  const autoPause = () => { input.clear(); game.pause(); processEvents(); };
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  window.addEventListener('pagehide', () => input.clear());
  window.addEventListener('weby:language', () => {
    game.pause(); processEvents(); applySettings(); renderer.drawPaper(); uiCache = {}; updateHUD();
    const views = { extras: showExtras, settings: showSettings, workshop: showWorkshop, practice: showPractice, journal: showJournal, history: showHistory, report: showReport, build: showBuild };
    (views[dialogView] || showMode)(); if (game.mode === 'tutorial') lessonUI();
  });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', e => {
    if (e.matches) { settings.reduced = true; store.saveSettings(settings); applySettings(); }
  });
  applySettings(); showMode(); updateHUD();
  let previous = performance.now(), accumulator = 0, hudClock = 0;
  function frame(now) {
    const dt = Math.min(Math.max((now - previous) / 1000, 0), .1); previous = now;
    input.pollGamepad();
    const active = ['combat', 'tutorial'].includes(game.mode);
    accumulator = active ? Math.min(accumulator + dt, .1) : 0;
    while (accumulator >= 1 / 60) {
      game.step(1 / 60, input.sample(settings.holdAttack, game.hitStop <= 0, game.player)); accumulator -= 1 / 60;
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
