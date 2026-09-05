// Authored first chapter. The existing expedition route remains save-compatible.
export const CHAPTER_ROUTE = [['wake'], ['courtyard', 'rooftops'], ['gatekeeper'], ['rook'], ['camp-shop', 'camp-rest'], ['waterway', 'sealed-vault'], ['needler'], ['paperstorm', 'long-margin'], ['last-camp', 'last-trader'], ['eraser']];
export const CHAPTER_NODES = {
  wake: { title: 'A line in the dark', kind: 'combat', chapter: 1, layout: 'open', reward: 8, lesson: 'swing', waves: [['scrapper'], ['scrapper', 'skitter']], note: 'Step outside the marked attack. Strike while the drawing recovers.', story: { speaker: 'NIB', title: 'Someone is still here.', text: 'A paper bird calls from the archive. Its name is Rook. Find the scattered pieces of its drawing and bring it home.' } },
  courtyard: { title: 'The pencil courtyard', kind: 'combat', chapter: 1, layout: 'courtyard', reward: 12, lesson: 'guard', waves: [['spitter', 'scrapper'], ['spitter', 'skitter', 'scrapper']], note: 'Use cover against shots. A perfect block sends a shot back.' },
  rooftops: { title: 'Across the rooftops', kind: 'elite', chapter: 1, layout: 'binding', reward: 25, lesson: 'dash', waves: [['skitter', 'skitter'], ['skitter', 'spitter', 'scrapper']], note: 'Dodge sideways after a lunge warning locks. The harder route pays more ink.' },
  gatekeeper: { title: 'The archive keeper', kind: 'elite', chapter: 1, layout: 'courtyard', reward: 20, lesson: 'ability', champion: { type: 'warder', name: 'The archive keeper', hp: 340 }, waves: [['warder', 'spitter'], ['warder', 'skitter']], note: 'Circle the keeper’s shield. Your ability can break its guard.', story: { speaker: 'THE MARGIN', title: 'No drawing beyond this point.', text: 'The keeper protects a locked archive. Through the door, you hear a wing beating against the paper.' } },
  rook: { title: 'Rook’s scattered wings', kind: 'combat', chapter: 1, layout: 'archive-room', reward: 16, objective: 'fragments', waves: [['scrapper', 'skitter'], ['spitter', 'scrapper']], note: 'Collect all three glowing fragments and clear the archive to rescue Rook.', story: { speaker: 'ROOK', title: 'I remember how to fly.', text: '“My wings are somewhere on this page.” Rook holds its last line together. “Please don’t turn it yet.”' } },
  'camp-shop': { title: 'A table for two', kind: 'shop', chapter: 1, note: 'Spend ink on two gifts and a health refill. Each item can be bought once.', story: { speaker: 'ROOK', title: 'A place to return to.', text: 'Rook lands beside Nib. Beyond the archive, the Brute is erasing the road home. Find its last page and stop it.' } },
  'camp-rest': { title: 'A sheltered fold', kind: 'rest', chapter: 1, note: 'Recover 50 health for free. Save your ink for later.', story: { speaker: 'ROOK', title: 'A place to return to.', text: 'Rook lands beside Nib. Beyond the archive, the Brute is erasing the road home. Find its last page and stop it.' } },
  waterway: { title: 'The ink canal', kind: 'combat', chapter: 1, layout: 'spillway', reward: 18, lesson: 'hazard', waves: [['blotter', 'scrapper'], ['blotter', 'warder', 'spitter']], note: 'Hatched pools cannot be blocked. Leave the warning before the ink lands.' },
  'sealed-vault': { title: 'The forgotten vault', kind: 'elite', chapter: 1, layout: 'foundry', reward: 30, objective: 'secret', waves: [['duelist', 'spitter'], ['warder', 'blotter', 'skitter']], note: 'Break the cover in the upper-right corner and find the hidden memory. Barrels hurt both sides.' },
  needler: { title: 'The redactor', kind: 'elite', chapter: 1, layout: 'binding', reward: 22, champion: { type: 'sniper', name: 'The redactor', hp: 300 }, waves: [['sniper', 'duelist'], ['sniper', 'skitter']], note: 'A locked aiming line will not follow you. Step aside, then close the distance.' },
  paperstorm: { title: 'A storm of loose pages', kind: 'elite', chapter: 1, layout: 'crease', reward: 32, waves: [['duelist', 'blotter'], ['warder', 'skitter', 'spitter']], note: 'Moving ink sweeps across the page. Watch the dashed warning before each crossing.' },
  'long-margin': { title: 'The long way home', kind: 'combat', chapter: 1, layout: 'columns', reward: 18, waves: [['scrapper', 'duelist'], ['warder', 'spitter', 'scrapper']], note: 'Use cover against shots. Keep a clear escape from the puddles.' },
  'last-camp': { title: 'Before the last line', kind: 'rest', chapter: 1, note: 'Recover 50 health for free before the final duel.' },
  'last-trader': { title: 'Nib’s final parcel', kind: 'shop', chapter: 1, note: 'Prepare for the final fight. Choose a gift or refill your health.' },
  eraser: { title: 'The road home', kind: 'boss', chapter: 1, layout: 'eraser-room', reward: 0, waves: [['brute']], note: 'Break the Brute’s rhythm. Dash through rings and leave the erasure lanes.', story: { speaker: 'THE MARGIN', title: 'Leave this page standing.', text: 'The Brute is crossing out the path behind you. Rook has a home now. Keep it on the page.' } },
};
export const KEEPSAKES = {
  thread: { name: 'A loose thread', description: 'Each dash cuts through nearby enemies for 18 damage, once per enemy per dash.', requirement: null },
  bell: { name: 'Rook’s little bell', description: 'Perfect blocks send out a 24-damage pulse. Rescue Rook to unlock it.', requirement: 'rook' },
  quill: { name: 'The unfinished quill', description: 'Every third swing sends a 22-damage ink blade forward. Finish the chapter to unlock it.', requirement: 'home' },
};
export const MEMORIES = {
  rook: { name: 'A bird with both wings', description: 'Rescue Rook in the archive.' },
  vault: { name: 'A name beneath the ink', description: 'Find the hidden memory in the forgotten vault.' },
  home: { name: 'A page worth keeping', description: 'Defeat the Brute and restore the road home.' },
};
export const keepsakeUnlocked = (profile, id) => Object.hasOwn(KEEPSAKES, id) && (!KEEPSAKES[id].requirement || profile.memories?.includes(KEEPSAKES[id].requirement));
