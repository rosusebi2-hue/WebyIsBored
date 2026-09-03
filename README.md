# Stick & Swing — The Last Good Line

A hand-drawn browser action game with two modes:

- **Story Mode** — a four-chapter campaign told through animated comic-book cinematics, tutorial encounters, named characters, bosses and a real ending.
- **Wave Mode** — the replayable branching roguelite mode with battles, elites, treasure, forge pages, events, relics and endless progression.

## Run locally

On Windows, double-click `run_game.bat`.

That starts a local web server and opens the game at:

```text
http://localhost:8000
```

You can also run it manually from this folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

Using the local server is recommended instead of opening `index.html` directly because it gives the game a stable browser origin for saves and avoids local-file browser restrictions.

## Story autosave

Story Mode now stores a full campaign snapshot in browser `localStorage` roughly every 1.2 seconds and at important transitions.

The save includes:

- chapter and exact story scene
- current comic page
- whether you are in a cinematic, briefing, battle, or post-battle transition
- active enemies, their positions and remaining HP
- remaining queued enemies and enemy projectiles
- player position, HP and shield energy
- gold and total gold earned
- Ink level / XP
- equipped sword, shield and clothes
- equipment upgrade paths
- shop perks and randomized level perks
- relics

If you close the tab during a Story Mode fight and return using the same browser and site address, **Continue** restores that active encounter instead of restarting the chapter.

Important: browser saves belong to the site/origin. `http://localhost:8000`, a Netlify domain, and another browser are separate save locations. Clearing site data also deletes the save.

## Animated comics

The opening now shows Line actually being created by the Artist. Story scenes are presented as animated hand-drawn comic panels between encounters. Panels use procedural SVG line art, so the project remains lightweight and easy to edit without external image dependencies. Pencil strokes draw themselves onto the page, characters move inside panels, impact marks shake, and story beats reveal in short three-panel pages.

During comic scenes, use the on-screen **Turn the Page** button or press **Space**, **Enter**, or **Right Arrow**. Cinematics can also be skipped from the comic toolbar.

Gameplay animation was expanded too: Line now has a breathing idle, step rhythm, movement lean, dash afterimages, dust footsteps, eased sword-swing poses, a physical blocking stance, a shield that actually moves in front of his body, and shield recoil on successful blocks.

The story establishes that:

- Line was created as the simple hero of an unfinished fighting-game idea.
- Scrapsteel and the first shield were drawn while the Artist was experimenting with Line's combat.
- Nib began as a joke shopkeeper doodle.
- relics are pieces of mechanics and props the Artist abandoned.
- bosses are rejected characters/designs that survived being crossed out.
- the Margin Knight is an older, more complicated hero design that existed before Line.
- the Back Cover formed from everything the Artist discarded and tried to erase.

See `STORY.md` for the narrative outline.

## Project structure

```text
stick-and-swing-game/
├── index.html              Main HTML / UI structure
├── css/
│   └── style.css           Game UI, comic layout and animation styling
├── js/
│   ├── story-data.js       Story chapters, dialogue and cinematic data
│   └── game.js             Combat, rendering, UI, saves, shops and story controller
├── archive/                Older source versions, not loaded by the game
├── README.md
├── STORY.md
└── run_game.bat
```

## Netlify

Do not upload only `index.html`, because the game needs the `css/` and `js/` folders.

For Netlify Drop, drag the **entire extracted `stick-and-swing-game` folder** into the deploy area, with `index.html` directly inside that folder. If the Netlify interface you are using accepts ZIP deployments, the ZIP must contain `index.html` at its root rather than wrapping the site in another unnecessary parent directory.
