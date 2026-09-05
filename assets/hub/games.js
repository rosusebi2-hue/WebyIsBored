/* Add a game here when it is ready. Only status: 'playable' creates a play link.
   Keep the first playable entry as the featured game. Paths are relative to index.html. */
window.WEBY_GAMES = [
  {
    id: 'stick-and-swing', title: 'Stick & Swing', kicker: 'The First Page · Version 2.0',
    description: 'Swing. Dash. Make your mark. Fight through four rooms and face the Scribbled Brute in a whole new sketchbook adventure.',
    status: 'playable', href: 'games/stick-and-swing/', cover: 'assets/hub/stick-and-swing.webp',
    tags: ['Action', 'Roguelite', 'Single player'], controls: 'stick-and-swing'
  },
  { id: 'game-02', title: 'Game 02', status: 'coming-soon', accent: 'mint', slot: '02' },
  { id: 'game-03', title: 'Game 03', status: 'coming-soon', accent: 'lilac', slot: '03' },
  { id: 'game-04', title: 'Game 04', status: 'coming-soon', accent: 'amber', slot: '04' }
];
