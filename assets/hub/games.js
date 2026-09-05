/* Add a game here when it is ready. Only status: 'playable' creates a play link.
   Keep the first playable entry as the featured game. Paths are relative to index.html. */
window.WEBY_GAMES = [
  {
    id: 'stick-and-swing', title: 'Stick & Swing', kicker: 'The Last Good Line',
    description: 'One little drawing. A whole lot of trouble. Fight your way through a sketchbook that’s trying to erase you.',
    status: 'playable', href: 'games/stick-and-swing/', cover: 'assets/hub/stick-and-swing.webp',
    tags: ['Action', 'Roguelite', 'Single player'], controls: 'stick-and-swing'
  },
  { id: 'game-02', title: 'Game 02', status: 'coming-soon', accent: 'mint', slot: '02' },
  { id: 'game-03', title: 'Game 03', status: 'coming-soon', accent: 'lilac', slot: '03' },
  { id: 'game-04', title: 'Game 04', status: 'coming-soon', accent: 'amber', slot: '04' }
];
