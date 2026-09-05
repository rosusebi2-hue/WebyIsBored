# Adding a game to WebyIsBored

The arcade homepage contains playable games. The catalog is `assets/hub/games.js`. Unreleased entries are displayed only on `/coming-soon/`.

1. Add the game's `index.html` and its own assets under `games/<slug>/`.
2. Add cover art under `assets/hub/`.
3. Replace a placeholder in `assets/hub/games.js` with a playable entry:

```js
{
  id: 'your-game', title: 'Your Game', kicker: 'A short subtitle',
  description: 'Describe what the player does.',
  status: 'playable', href: 'games/your-game/',
  cover: 'assets/hub/your-game.webp', tags: ['Puzzle', 'Single player']
}
```

4. Include an `../../` link to return to the arcade from the game.
5. Add a release entry using [Publishing news](PUBLISHING_NEWS.md).
6. Run `node --test tests/*.test.mjs`, commit, and confirm the GitHub Pages deployment.

Only `status: 'playable'` entries with local `games/` paths get play links. Do not link placeholders to empty games. New games can omit `controls` until they have a matching guide; do not reuse another game's bindings.

Keep paths relative so both the custom domain and a GitHub Pages repository prefix work. The static homepage fallback should remain useful without JavaScript. The first catalog item supplies the featured card; multiple playable games use a grid.

Use a unique localStorage namespace per game and validate saved values. Stick & Swing 2.0 uses `weby.stickSwing.run.v2`, `weby.stickSwing.profile.v2`, and `weby.stickSwing.settings.v2`. It has no cloud account or global leaderboard.
