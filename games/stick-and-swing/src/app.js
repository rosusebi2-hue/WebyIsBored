import { VERSION, ROOMS, LESSONS, UPGRADES, clamp } from './config.js';
import { SaveStore } from './storage.js';
import { Game } from './engine.js';
import { Renderer } from './renderer.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';

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
let renderer, input, toastTime = 0, dialogView = '', lastFocus = null;

function showToast(message, duration = 3) { $('toast').textContent = message; $('toast').hidden = false; toastTime = duration; }
function button(label, action, className = 'secondary') {
  const b = text('button', label, className); b.type = 'button';
  b.addEventListener('click', () => { audio.unlock(); action(); processEvents(); }); return b;
}
function openDialog(view, eyebrow, title, copy, wide = false) {
  dialogView = view;
  inner.replaceChildren(); inner.className = wide ? 'dialog-inner wide' : 'dialog-inner';
  inner.append(text('p', eyebrow, 'dialog-eyebrow'));
  const h = text('h2', title); h.id = 'dialog-title'; inner.append(h);
  if (copy) inner.append(text('p', copy, 'dialog-copy'));
  if (!dialog.open) { lastFocus = document.activeElement; dialog.showModal(); }
  requestAnimationFrame(() => inner.querySelector('button, a, input')?.focus({ preventScroll: true }));
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
  if (!confirmed && (store.loadRun() || ['paused', 'death'].includes(game.mode))) {
    openDialog('confirm', 'A FRESH PAGE', 'Start over?', 'This replaces your current run checkpoint. Your settings and best time stay saved.');
    actions(button('Start a new run', () => launch(practice, true), 'primary'), button('Go back', showMode));
    return;
  }
  closeDialog(); game.startNew(practice || !store.profile().tutorialDone);
}
function showTitle() {
  const save = store.loadRun(), profile = store.profile();
  openDialog('title', `CHAPTER 01 · VERSION ${VERSION}`, 'A line worth\nfighting for.', 'You are Line, a drawing the Artist left behind. Take up your sword. Survive the page. Face the thing they tried to erase.');
  const quote = text('p', '“You don’t have to be finished to matter.”', 'dialog-quote'); quote.append(text('span', '— THE MARGIN')); inner.append(quote);
  if (save) actions(button(`Continue · Room ${save.room + 1}`, () => { closeDialog(); game.restore(save); }, 'primary'), button('New run', () => launch()));
  else actions(button(profile.tutorialDone ? 'Enter the sketchbook →' : 'Pick up your sword →', () => launch(), 'primary'));
  subactions(button('Practice controls', () => launch(true), ''), button('Settings', showSettings, ''), link('Release notes ↗', '../../news/#stick-and-swing-2-0'));
  const meta = text('div', '', 'run-meta'); meta.append(text('span', '4 rooms · 1 boss'), text('span', 'Sword · dash · perfect block'));
  if (profile.bestTime) meta.append(text('span', `Best clear ${timeLabel(profile.bestTime)}`));
  inner.append(meta);
}
function showMode() {
  input?.clear();
  if (game.mode === 'title') showTitle();
  else if (game.mode === 'paused') {
    openDialog('paused', 'TAKE A BREATH', 'The page can wait.', 'Your run is paused. Return when you’re ready.');
    actions(button('Back to the fight →', () => { closeDialog(); game.resume(); }, 'primary'), button('Settings & controls', showSettings));
    subactions(button('New run', () => launch(), ''), button('Title screen', () => game.title(), ''), link('Back to the arcade', '../../'));
    inner.append(text('p', 'Continue restores your room entrance, or your unchosen reward. Checkpoints stay on this browser and device.', 'build-list'));
  } else if (game.mode === 'reward') {
    openDialog('reward', `ROOM ${game.room + 1} CLEARED · THE MARGIN`, 'Make your next mark.', 'Choose one gift for this run. You’ll also recover 22 health before the next room.', true);
    const grid = text('div', '', 'upgrade-grid');
    for (const id of game.choices) {
      const u = UPGRADES.find(x => x.id === id);
      const card = button('', () => { if (game.chooseUpgrade(id)) closeDialog(); }, 'upgrade-card');
      card.append(text('span', u.icon, 'upgrade-icon'), text('span', u.tag, 'upgrade-tag'), text('strong', u.name), text('p', u.description), text('span', 'Take this gift →', 'upgrade-pick'));
      grid.append(card);
    }
    inner.append(grid);
    inner.append(text('p', game.room === 2 ? 'Next: the Scribbled Brute. Save a dash for its shockwave.' : `Next: ${ROOMS[game.room + 1].title}`, 'build-list'));
    subactions(link('Back to the arcade', '../../'));
  } else if (game.mode === 'death') {
    openDialog('death', 'A ROUGH DRAFT', 'Not your last line.', `${game.deathSource} caught you. Retry from this room’s entrance with your saved build and health.`);
    const hint = game.room === 3 ? 'The Brute leaves a long opening after each attack. Dash through its expanding ring, then close the distance.' : 'A warning marks where an enemy will strike. Step aside, then swing while the green recovery ring is visible.';
    inner.append(text('p', hint, 'dialog-quote')); stats();
    actions(button('Retry this room →', () => { closeDialog(); game.retryRoom(); }, 'primary'), button('New run', () => launch()));
    subactions(link('Back to the arcade', '../../'));
  } else if (game.mode === 'victory') {
    openDialog('victory', 'CHAPTER 01 COMPLETE', 'Still here.\nStill drawing.', 'The Scribbled Brute falls apart into a hundred unfinished lines. For the first time, the page is quiet.');
    const quote = text('p', '“The Artist gave up on this page. You didn’t.”', 'dialog-quote'); quote.append(text('span', '— THE MARGIN')); inner.append(quote);
    stats();
    const names = game.upgrades.map(id => UPGRADES.find(u => u.id === id)?.name).join(' · ');
    inner.append(text('p', `Your marks: ${names || 'Scrapsteel, all the way.'}`, 'build-list'));
    actions(button('Draw another run →', () => launch(false, true), 'primary'));
    subactions(link('Back to the arcade', '../../'), link('What’s next ↗', '../../news/#stick-and-swing-2-0'));
  } else closeDialog();
  $('pause-button').disabled = !['combat', 'tutorial'].includes(game.mode);
  $('tutorial-card').hidden = game.mode !== 'tutorial';
  $('arena-corner').hidden = !['combat', 'title'].includes(game.mode);
}
function stats() {
  const grid = text('div', '', 'stats-grid');
  for (const [value, label] of [[timeLabel(game.stats.time), 'Run time'], [game.stats.kills, 'Drawings defeated'], [game.stats.parries, 'Perfect blocks']]) {
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
  inner.append(text('p', 'Touch: drag the left stick to move; hold Swing or Guard and tap Dash on the right. Touch aiming selects the nearest enemy. Guard protects the direction you face.', 'build-list'));
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
    if (e.type === 'mode') showMode();
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
  const inRun = !['title', 'tutorial'].includes(game.mode);
  setText('chapter-label', game.mode === 'tutorial' ? 'THE BASICS' : 'CHAPTER 01');
  setText('room-value', inRun ? `ROOM ${game.room + 1} / 4` : 'FIRST PAGE');
  const nodes = $('room-progress').children;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].classList.toggle('active', inRun && i === game.room); nodes[i].classList.toggle('done', inRun && i < game.room);
    if (inRun && i === game.room) nodes[i].setAttribute('aria-current', 'step'); else nodes[i].removeAttribute('aria-current');
  }
  const boss = game.enemies.find(e => e.type === 'brute' && e.spawn <= 0);
  $('boss-health').hidden = !boss || game.mode !== 'combat' || game.banner.time > 0;
  if (boss) { setWidth('boss-fill', boss.hp / boss.maxHp); setText('boss-phase', boss.phase === 2 ? 'ROUGHER DRAFT' : 'FIRST DRAFT'); }
  $('room-banner').hidden = game.mode !== 'combat' || game.banner.time <= 0;
  if (game.banner.time > 0) { setText('banner-title', game.banner.title); setText('banner-text', game.banner.text); }
}
try {
  renderer = new Renderer(canvas, game, settings);
  input = new Input(canvas, () => ['combat', 'tutorial'].includes(game.mode), () => { game.pause(); processEvents(); }, () => audio.unlock());
  $('pause-button').addEventListener('click', () => { input.clear(); game.pause(); processEvents(); });
  $('sound-button').addEventListener('click', () => { audio.unlock(); settings.sound = !settings.sound; store.saveSettings(settings); applySettings(); });
  $('skip-tutorial').addEventListener('click', () => { input.clear(); game.finishTutorial(); processEvents(); });
  dialog.addEventListener('cancel', e => {
    e.preventDefault();
    if (dialogView === 'settings' || dialogView === 'confirm') showMode();
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
