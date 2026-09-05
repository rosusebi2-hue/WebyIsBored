# Adding a game to WebyIsBored

The homepage is the arcade. Stick & Swing plays at `games/stick-and-swing/`, using the existing root `js/` and `css/` assets. The old `stick-and-swing-cinematic-story/` URL redirects there. The duplicated legacy assets are retained for compatibility, but the active route uses the root runtime.

## Publish another playable game

1. Put the game and its own assets under `games/<slug>/`, with an `index.html` entrypoint.
2. Add its cover under `assets/hub/`.
3. Replace one placeholder in `assets/hub/games.js` with:

```js
{
  id: 'your-game',
  title: 'Your Game',
  kicker: 'A short subtitle',
  description: 'Explain the actual activity in one sentence.',
  status: 'playable',
  href: 'games/your-game/',
  cover: 'assets/hub/your-game.webp',
  tags: ['Puzzle', 'Single player']
}
```

4. Include an `../../` link back to the arcade in the new game's menu.
5. Check the root and nested game URLs. Keep URLs relative so the site works both on a custom domain and under a GitHub Pages repository prefix.

The catalog creates play links only for entries with `status: 'playable'` and a local `games/` path. Placeholder entries have no play links. The layout changes to a grid as playable games are added. Omit `controls` for a new game until it has its own control guide; do not reuse Stick & Swing's bindings for unrelated games.

The static HTML includes a fallback for the current catalog. If the catalog changes substantially, update that fallback too so the existing game link remains usable when the enhancement script does not load.

Each game should use a unique localStorage prefix. Stick & Swing keeps its existing `stickswing_living_sketchbook` prefix, so moving to a nested path on the same origin retains its saves. Saves do not automatically move between different domains or browser profiles.

## Current hub

- Plain HTML/CSS/JavaScript; no package installation or build step.
- One playable entry, three explicitly labeled placeholders.
- Responsive layout, scroll reveals, cover zoom, card hover effects, and a native controls dialog.
- Reduced-motion support and keyboard focus styles.
- Custom cover illustration optimized to WebP. This is cover art, not a gameplay screenshot.
- Existing GitHub Pages workflow deploys the repository on pushes to `main`.

The user-facing domain is managed separately from the source code. This change does not purchase a domain or alter DNS.
