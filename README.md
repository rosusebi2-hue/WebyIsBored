# WebyIsBored

A static browser arcade, published at **https://webyisbored.com/** through GitHub Pages.

- `/` — playable games.
- `/games/stick-and-swing/` — **Stick & Swing 2.1: The Adventure Update**.
- `/news/` — releases, patches, and site updates.
- `/coming-soon/` — clearly marked spaces for future games.

## Stick & Swing: The Adventure Update

**Version 2.1** is an eight-stop adventure across two chapters. Play as Line, an unfinished drawing guided by the Margin. Choose Scrapsteel (balanced counters), Pagebreaker (slow, wide, shield-breaking strikes), or Emberbrand (fast attacks and burning ink). All weapons are immediately available.

Four forks offer regular or harder battles, and shops or recovery. Every branch advances once and merges at the next stop. Six combat stops use multiple waves, five arena layouts, five regular enemy types, and two bosses: the Scribbled Brute and the Ink Queen. Each boss has three telegraphed patterns and a second phase. Brief scenes introduce Nib and the abandoned sketchbook.

Earn ink from defeated enemies and cleared battles. Nib offers two gifts and one health refill at each shop. Purchases are limited to that shop's stock, take effect immediately, and cannot be repeated. Free recovery restores up to 50 health. The five battle rewards each offer a choice of gifts and restore up to 16 health. There are fourteen gifts: eight shared and two exclusive to each weapon.

Move with WASD or arrows. Aim with the mouse. Hold left click or Space to attack, right click or F to guard, and Shift to dash. Space uses aim assist. Tap guard just before impact to reflect shots and power your next hit. Guard interrupts a held swing immediately. Escape pauses; focus loss also pauses. Touch uses a movement stick and Swing, Guard and Dash buttons. Touch guard faces nearby incoming projectiles.

Settings include sound, hold-to-attack and reduced effects. Review your current weapon and gifts from the build button or a between-encounter menu. Damage feedback and defeat explanations distinguish frontal blocks, hits around guard, guard breaks, and unblockable floor ink.

### Saves and retries

The validated version-3 checkpoint stores the weapon, route, seed, health, ink, build, and current decision. Route/story/rest/shop/reward screens resume exactly; shop stock and every purchase are saved together. Combat restarts from the encounter entrance and regenerates the same spawns. Retrying rolls back the encounter's currency, enemies cleared and inventory while keeping time, damage, parries and retry counts. Storage denial falls back to an in-memory checkpoint during the session.

**Unfinished 2.0 runs cannot continue in the Adventure.** The new run key is `weby.stickSwing.run.v3`; 2.0 run keys are not read or deleted. Existing profile and settings keys are retained. First Page clear records stay separate from the new adventure clear count and best combat time. Saves stay on the current browser, device and origin.

## Development

No dependencies or build step are needed to play. ES modules require HTTP serving; don't open the game's HTML with a `file:` URL.

```sh
python -m http.server 8000
```

Then visit `http://localhost:8000/`. Windows users can run `run_game.bat`.

Run the automated checks with Node 20 or later:

```sh
node --test tests/*.test.mjs
```

The checks exercise combat simulation, all sixteen branch combinations with each weapon, input cancellation, tutorials, checkpoints, shop transactions, route links and news generation. A controller integration check exercises the actual menus and renderer calls with platform doubles. These are not browser or visual tests and do not substitute for a real playtest.

The Pages workflow runs these checks before publishing. The game is split into configuration, pure simulation, rendering, input, audio, validated storage, and UI modules under `games/stick-and-swing/src/`.

- [Add a game](docs/ADDING_GAMES.md)
- [Publish news](docs/PUBLISHING_NEWS.md)
- [Original review and future ideas](docs/GAME_REVIEW.md)

## Release policy

Finished updates are committed to GitHub and deployed by the existing Pages workflow on `main`. Include a news entry for player-visible changes. Remove obsolete files when replacing a feature instead of leaving multiple game implementations in the live site.
