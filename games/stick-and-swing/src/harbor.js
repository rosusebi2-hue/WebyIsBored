// Chapter II is an independent checkpointed journey. Choices alter later rooms.
export const HARBOR_ROUTE = [['harbor-arrival'], ['broken-quay'], ['ferry-choice'], ['tide-market'], ['sluice-choice'], ['lower-street', 'sunken-cache'], ['beacon-crossing'], ['last-crossing'], ['harbor-rest', 'harbor-shop'], ['tidekeeper']];
export const HARBOR_NODES = {
  'harbor-arrival': { title: 'Where the ink rises', kind: 'combat', chapter: 2, layout: 'harbor-quay', reward: 12, waves: [['scrapper', 'mender'], ['warder', 'mender']], note: 'Menders heal nearby drawings. Hit a Mender while it channels to interrupt the heal.', story: { speaker: 'ROOK', title: 'The harbor is disappearing.', text: 'Rain has filled the next page with ink. Someone is ringing a bell beyond the flooded streets. Find the beacon and stop the Tidekeeper before the harbor washes away.' } },
  'broken-quay': { title: 'Across the broken quay', kind: 'combat', chapter: 2, layout: 'broken-quay', explore: true, reward: 8, objective: 'waymarks', exit: { x: 810, y: 95 }, markers: [[220, 170], [790, 390]], waves: [[]], note: 'Walk onto both waymarks. Dash across the dark gap; arrows show a safe crossing. An incomplete crossing returns you to firm ground.' },
  'ferry-choice': { title: 'One boat, one promise', kind: 'choice', chapter: 2, decision: 'ferry', note: 'This choice changes the market and the last crossing.', story: { speaker: 'THE FERRYMAN', title: 'What do we carry?', text: 'A ferryman is trapped beneath a fallen crate. His supplies are still dry. Free him and he will help you later, or take the supplies and face the crossing alone.' } },
  'tide-market': { title: 'The silent market', kind: 'combat', chapter: 2, layout: 'harbor-market', reward: 18, waves: [['leech', 'scrapper'], ['leech', 'mender', 'warder']], note: 'A Leech’s tether breaks behind cover, at a distance, or when you hit it. Watch the link before closing in.' },
  'sluice-choice': { title: 'The sluice wheel', kind: 'choice', chapter: 2, decision: 'water', note: 'The water cannot go both ways. Your choice lasts until the chapter ends.', story: { speaker: 'ROOK', title: 'Streets or tower?', text: 'One channel drains the lower streets. The other sends the current into the Tidekeeper’s tower, breaking one of its anchors. Choose where the flood goes.' } },
  'lower-street': { title: 'The lower streets', kind: 'combat', chapter: 2, layout: 'harbor-flood', reward: 16, waves: [['warder', 'mender'], ['leech', 'scrapper', 'spitter']], note: 'Separate the defenders from their healers. Your sluice choice controls the floor ink here.' },
  'sunken-cache': { title: 'The sunken cache', kind: 'elite', chapter: 2, layout: 'harbor-flood', reward: 32, waves: [['weaver', 'mender', 'duelist'], ['leech', 'warder', 'mender']], note: 'Weavers protect and Menders heal. Break their support first. This harder route pays more ink.' },
  'beacon-crossing': { title: 'Light across the water', kind: 'combat', chapter: 2, layout: 'beacon-walk', explore: true, reward: 10, objective: 'waymarks', exit: { x: 810, y: 95 }, markers: [[210, 165], [760, 175]], waves: [[]], note: 'Follow the crossing arrows and reach both beacon lenses. Dash from close to each bank, then wait for your dash to recover.', story: { speaker: 'ROOK', title: 'A light for the lost.', text: 'Two lenses lie on separate banks. Join their light and every drawing in the harbor will see a way home.' } },
  'last-crossing': { title: 'The last crossing', kind: 'combat', chapter: 2, layout: 'harbor-flood', reward: 22, waves: [['duelist', 'leech'], ['warder', 'mender', 'spitter']], note: 'The ferryman remembers your choice. Look for his healing lantern, or prepare for an extra ambush.' },
  'harbor-rest': { title: 'A dry corner', kind: 'rest', chapter: 2, note: 'Recover 50 health for free before facing the Tidekeeper.' },
  'harbor-shop': { title: 'Nib’s harbor stall', kind: 'shop', chapter: 2, note: 'Spend your remaining ink on gifts and a health refill.' },
  tidekeeper: { title: 'The Tidekeeper', kind: 'boss', chapter: 2, layout: 'tide-tower', reward: 0, waves: [['tidekeeper']], note: 'Break the anchors to remove the Tidekeeper’s protection. Leave marked flood lanes and interrupt its Menders.', story: { speaker: 'THE TIDEKEEPER', title: 'Nothing leaves this page.', text: 'The tower holds the harbor under water. Break its anchors, survive the rising tide, and let the drawings leave.' } },
};
export const HARBOR_CHOICES = {
  ferry: [
    { id: 'help', title: 'Free the ferryman', text: 'Gain his memory. A lantern heals 25 health once in the market and once at the last crossing. No extra ambush.' },
    { id: 'supplies', title: 'Take the dry supplies', text: 'Gain 35 ink now. There will be no healing lantern, and two extra enemies wait at the last crossing.', ink: 35 },
  ],
  water: [
    { id: 'drain', title: 'Drain the lower streets', text: 'Remove floor pools from later streets. The Tidekeeper keeps both protective anchors.' },
    { id: 'tower', title: 'Send the flood into the tower', text: 'One boss anchor breaks before you arrive. Later streets remain flooded.' },
  ],
};
const gap = (x, width) => ({ x, y: 45, width, height: 510, crossingY: 310 });
const pillar = (x, y, radius = 32) => ({ x, y, radius });
export const HARBOR_LAYOUTS = {
  'harbor-quay': { name: 'The harbor quay', obstacles: [pillar(350, 280), pillar(650, 280)], pools: [], props: [{ x: 480, y: 190, radius: 24, type: 'cover' }] },
  'broken-quay': { name: 'The broken quay', obstacles: [], pools: [], gaps: [gap(430, 72)], start: { x: 175, y: 440 } },
  'harbor-market': { name: 'The harbor market', obstacles: [pillar(360, 250), pillar(610, 365)], pools: [], props: [{ x: 690, y: 175, radius: 24, type: 'cover' }] },
  'harbor-flood': { name: 'The flooded streets', obstacles: [pillar(340, 235), pillar(650, 380)], pools: [{ x: 530, y: 210, radius: 72, offset: 0 }, { x: 245, y: 380, radius: 62, offset: 3 }] },
  'beacon-walk': { name: 'The beacon walk', obstacles: [], pools: [], gaps: [gap(305, 66), gap(595, 66)], start: { x: 160, y: 440 } },
  'tide-tower': { name: 'The tide tower', obstacles: [], pools: [], props: [{ x: 250, y: 230, radius: 28, type: 'anchor' }, { x: 710, y: 230, radius: 28, type: 'anchor' }] },
};
