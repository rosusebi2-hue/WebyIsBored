# WebyIsBored

A static browser arcade hosted on Vercel at **https://webyisbored.com/**. The connected GitHub repository is the source of truth.

- `/` — playable games.
- `/games/stick-and-swing/` — **Stick & Swing 2.3: The Lost Drawing**.
- `/news/` — releases, patches, and website updates.
- `/coming-soon/` — clearly marked spaces for future games.

## The Lost Drawing

Chapter I is an authored ten-stop adventure about rescuing Rook, a lost paper bird, and protecting the road home. Five forks provide 32 possible routes. Fight two minibosses, collect three wing fragments, uncover an optional vault memory, and face the Brute with a new second-phase erasure attack. Clear combat rooms and walk through the marked doorway to continue.

The home screen keeps your collected memories. Pick one of three keepsakes for each new chapter attempt: a damaging dash, a perfect-block pulse, or a third-hit ink blade. The latter two unlock by rescuing Rook and completing the chapter. Memories are banked when their room is cleared and survive retries and new runs.

Three weapons are available immediately: Scrapsteel, Pagebreaker, and Emberbrand. Earn gifts and spend ink at shops to develop your build during a run. Three new gifts modify dashes, reflected shots, and third strikes. Weapon mastery unlocks alternate abilities, finishers, and appearances in the Workshop.

Extras retains the twelve-stop Sketchbook expedition, Boss Rush, and practice. These use the same game engine and weapon mastery. Practice preserves your saved run and grants no progression rewards.

## Controls and accessibility

Move with WASD or arrows, aim with the mouse, hold left click or Space to swing, hold right click or F to guard, use Shift to dash, Q for your ability, and Escape to pause. Keyboard and touch support automatic targeting. Touch offers a movement stick and four action buttons. Standard gamepads are supported.

Six practical lessons teach movement, swings, dashing, blocking, perfect blocks, and active abilities. Settings include remappable keys, touch placement and size, sound, reduced motion effects, high-contrast outlines, attack symbols, and optional chapter hints. Focus loss pauses the game.

English is the default website language. German, French, Spanish, Romanian, and Russian cover the hub, game, and news through the shared translation catalog. The selected language persists between pages.

## Saves and retries

The validated version-4 save envelope stores the checkpoint and persistent profile together. Existing 2.2 checkpoints still load; 2.1 checkpoints migrate. Combat resumes at the encounter entrance with the same seed, weapon, keepsake, health, ink, and gifts. Route, story, shop, rest, and reward decisions save immediately. Collectible fragments within an unfinished combat room reset on reload; banked memories remain.

Saves stay on the current browser, device, and origin. Storage denial falls back to memory for the session. Bug reports include the version, seed, checkpoint, recent events, controls, and errors; players choose whether to copy and share them.

## Development and release

No installation or build step is needed to play. ES modules require HTTP serving:

```sh
python -m http.server 8000
```

Open `http://localhost:8000/`. Windows users can use `run_game.bat`.

Before publishing, regenerate news and run the meaningful automated checks with Node 20 or later:

```sh
node scripts/build-news.mjs
node --test tests/*.test.mjs
```

Checks cover combat, chapter route completion with all three weapons, objectives, keepsakes, save migration, controls, translated content, navigation, and news consistency. Menu/controller integration uses platform doubles. These are not browser or visual playtests and do not establish game balance.

Publish completed changes to this GitHub repository and verify the connected Vercel deployment. Include player-facing notes in News. Remove obsolete implementations when replacing features; Git history preserves previous releases. The legacy GitHub Pages workflow remains in the repository, but Vercel serves the current domain.

- [Add a game](docs/ADDING_GAMES.md)
- [Publish news](docs/PUBLISHING_NEWS.md)
- [Historical review of the original game](docs/GAME_REVIEW.md)
