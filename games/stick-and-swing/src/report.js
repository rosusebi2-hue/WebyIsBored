import { VERSION } from './config.js?v=2.3.0';
export function buildReport(game, settings, errors = []) {
  return JSON.stringify({ game: 'Stick & Swing', version: VERSION, seed: game.initialSeed, randomState: game.seed,
    mode: game.runMode, screen: game.mode, encounter: game.encounter, stop: game.room + 1, route: game.path,
    weapon: game.weapon, forms: game.forms, keepsake: game.keepsake, gifts: game.upgrades, health: game.player.hp, ink: game.ink,
    stats: game.stats, lastHit: game.lastHit || null, events: game.eventsSeen, recentActions: (game.trace || []).slice(-60), checkpoint: game.checkpoint || null,
    controls: { bindings: settings.bindings, holdAttack: settings.holdAttack, touchSide: settings.touchSide, touchScale: settings.touchScale },
    effects: { sound: settings.sound, reduced: settings.reduced, contrast: settings.contrast, cues: settings.cues }, errors: errors.slice(-5),
    reproductionSteps: 'Describe what you did and what went wrong here.' }, null, 2);
}
