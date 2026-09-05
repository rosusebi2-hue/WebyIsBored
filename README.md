# WebyIsBored

A static browser arcade, published at **https://webyisbored.com/** through GitHub Pages.

- `/` — playable games.
- `/games/stick-and-swing/` — **Stick & Swing 2.0: The First Page**.
- `/news/` — releases, patches, and site updates.
- `/coming-soon/` — clearly marked spaces for future games.

## Stick & Swing: The First Page

A new Canvas action game with a five-step practical tutorial, a four-room run, three enemy types, six possible run upgrades, and the two-phase Scribbled Brute. The player is Line, a forgotten sketch guided by the Margin. This is the first playable chapter, not the previous full campaign.

Move with WASD or the arrow keys. Aim with the mouse. Hold left click to swing, right click or F to guard, and Shift to dash. Space attacks with aim assist. Tap guard just before impact to reflect projectiles and empower the next swing. Escape pauses. Touch devices have a movement stick, three action buttons, and nearest-enemy aim assist.

Settings include sound, hold-to-attack, and reduced effects. Losing focus pauses the game. Completing a room presents one of three upgrades and restores health before continuing. A death can be retried from that room's checkpoint.

Room entrances and pending reward choices are saved locally with a validated, versioned format. Personal best times and tutorial completion are also local. Saves do not transfer between browsers or domains. **Old game saves are incompatible with the remake**; old storage keys are not read or deleted. The old runtime, styles, story data, duplicated game folder, and obsolete navigation stylesheet have been removed. Git history preserves previous versions.

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

The checks exercise real combat simulation, input cancellation, tutorials, rewards, checkpoint restoration, route links, and news generation. They do not substitute for a browser playtest or first-time player feedback.

The Pages workflow runs these checks before publishing. The game is split into configuration, pure simulation, rendering, input, audio, validated storage, and UI modules under `games/stick-and-swing/src/`.

- [Add a game](docs/ADDING_GAMES.md)
- [Publish news](docs/PUBLISHING_NEWS.md)
- [Original review and future ideas](docs/GAME_REVIEW.md)

## Release policy

Finished updates are committed to GitHub and deployed by the existing Pages workflow on `main`. Include a news entry for player-visible changes. Remove obsolete files when replacing a feature instead of leaving multiple game implementations in the live site.
