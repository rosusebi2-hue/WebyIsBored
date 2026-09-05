# Stick & Swing: original code review and remake proposal

**Historical review.** Version 2.0 replaces the code described below. The First Page is now the active game; see [release notes](../news/index.html#stick-and-swing-2-0) and the [current README](../README.md). Later chapters and additional loadouts remain future work.

Reviewed the game at commit `92f37bdce03be6ba49815a4cdb1ab6bb6193ab41` on 5 September 2026. This is a source review, with targeted executions of the real game functions in a Node VM using platform stubs. It is not a browser playtest or a completed balance study. The hub changes preserve the existing combat runtime and story data.

## My recommendation

Keep the sketchbook identity, Line, Nib, the Margin, and the four named bosses. Rebuild the player experience around **move, swing, dash, and counterattack**. Teach those actions by doing them, make enemies readable, and give the player fewer, more meaningful choices. First make one arena and one boss feel excellent; expand only after that slice is fun.

The game already has a lot of content. Its biggest problem is that complexity is spread across menus, hidden rules, inconsistent descriptions, and competing progression systems. Adding more content before repairing that foundation would make it harder to understand.

## How the current game works

The game is a vanilla JavaScript Canvas 2D arena fighter. Movement is free across both screen axes; this is not a platformer. Combat, rendering, audio, progression, saves, input, and UI transitions live together in one approximately 122 KB closure in [game.js](https://github.com/rosusebi2-hue/WebyIsBored/blob/92f37bdce03be6ba49815a4cdb1ab6bb6193ab41/js/game.js). [story-data.js](https://github.com/rosusebi2-hue/WebyIsBored/blob/92f37bdce03be6ba49815a4cdb1ab6bb6193ab41/js/story-data.js) holds the narrative, scene objectives, and tutorial text. HTML supplies the HUD and menus; CSS draws the interface and animates the comic panels.

| System | Actual behavior |
| --- | --- |
| Movement and aim | WASD/arrows move; mouse position sets facing. Touch movement sets facing, with nearby-enemy aim only while stationary. |
| Attack | A click/Space triggers a sword cone hit test, subject to cooldown. Attack range and facing matter. Holding the mouse button does not repeatedly attack. |
| Defense | Right click raises a frontal shield, slows movement, prevents swinging, and drains shield energy when it blocks. Dash gives a short burst of movement and invulnerability. |
| Story Mode | A nine-panel prologue, then four chapters of five combat encounters each. Block, shop, and dash unlock through Chapter I scenes. Comics and choices interrupt the fights. Each chapter ends with a named boss. |
| Wave Mode | Three random route cards offer battle, elite, rest, forge, treasure, or event. Every fifth combat encounter is a boss through Wave 20; an endless option follows. Non-combat visits do not advance that counter. |
| Enemies | Grunts approach and attack; runners lunge; brutes charge; spitters keep distance and shoot. Four bosses add charges/slams, radial projectiles, duels, or summons. Boss phases change at 66% and 32% HP. |
| Gold | Kills credit gold directly. Completed fights also give a base reward of `18 + 5 × wave`, modified by relevant perks/relics. No manual coin collection is required. |
| Shop | Six tabs: Stats, Perks, Swords, Shields, Clothes, Relics. There are eight core stats, five purchased perks, five swords, four shields, and four outfits, plus individual equipment upgrade nodes. Items unlock by wave. Buying equipment and equipping it are separate actions. |
| Ink XP | Kills grant XP. Level-ups pause for one of three random choices from ten perks. XP progression is separate from gold, and can interrupt combat. |
| Relics | Twelve possible relics; at most two carried. Choices can come from elites, bosses, treasure, or events. Taking a third writes into slot zero without asking which existing item to replace. |
| Persistence | Story snapshots, settings, and best records use localStorage. Wave runs reset; there is no cloud account or shared leaderboard. Saves are specific to the browser and origin. |
| Audio and visuals | Procedural oscillator music/SFX, Canvas figures and particles, CSS themes, SVG comic scenes. No game engine or multiplayer service. |

The four story chapters are The First Page, Red Ink, Burnt Pages, and The Back Cover. Their bosses are the Scribbled Brute, Ink Queen, Margin Knight, and Back Cover. The premise—abandoned drawings surviving their Artist—is the strongest part of the identity.

## Why the game can feel confusing

- The player learns combat and several progression vocabularies at once: gold, Ink, stats, shop perks, level perks, gear nodes, relics, waves, chapters, and pages.
- A large amount of screen space explains systems instead of teaching them through a small playable challenge. Some HUD controls appear before Story Mode allows using them.
- The same choice overlay is reused for unrelated decisions, and a single mutable `previousState` is used by multiple menus.
- Purchases can appear to have no effect because new gear is owned but not equipped. Some upgrades really do have no intended effect because of defects below.
- Story Mode still uses the random wave generator. A scene that says it teaches ranged combat does not guarantee the intended enemy composition.
- Wave Mode’s “map” is a fresh set of random cards, with no persistent route history or visible path to the boss.
- Long comic interruptions and mid-fight level choices compete with the flow of action.

## Concrete defects and mismatches

These are repair candidates for the remake, not changes bundled into the hub.

| Priority | Finding | Evidence and consequence |
| --- | --- | --- |
| Critical | An early elite can crash | `startEncounter` chooses from a filtered array using an `||` fallback. An empty array is truthy. Wave 1 has only grunts, so choosing an elite produces `undefined:elite`, then `spawnEnemy` accesses an absent definition. Reproduced in the VM. |
| High | Emberbrand’s cadence upgrade stops its fireballs | At rank 2, `fireballEvery` becomes 2 but `tryAttack` tests `attackCount % fireballEvery === 2`. That can never pass. Nine connected swings produced three fireballs without the upgrade and zero with it. |
| High | A level-up from resting loses the choice | `handleRestNode` calls `gainXP`, then immediately `openMap`, hiding the perk selection. Reproduced: the level increased while no perk was chosen. Event XP has the same transition pattern. |
| High | Gear effects can survive unequipping | `recomputePlayer` does not reset all conditional fields. Runner Afterimage remained at 0.18 after switching back to Wraps in the VM. Other fields, including `lowHpFury`, need the same audit. |
| High | Some shield upgrades have no practical effect | `blockEfficiency` is computed but not used to resolve damage. A successful block simply returns before damage. Increasing Aegis Wall therefore does not deliver the advertised extra efficiency. |
| High | Ordinary blocked projectiles are not consumed | `updateProjectiles` leaves a non-reflected blocked projectile alive; it can overlap again and drain more shield energy. The story tutorial says blocked projectiles disappear. |
| High | Pending reward choices are not restored | The save captures battle/scene phase, but not the pending choice or its options. Reloading during a level-up can restore combat after XP was already spent. Multiple level-ups in one `gainXP` call also overwrite the same choice screen. |
| High | Frame rate changes some enemy behavior | Several attacks/summons use fixed probabilities per update rather than time-based rates. Movement uses `dt`, but those decisions can occur more often on a faster display. |
| Medium | Third-hit numbering is off | The attack counter cycles `1, 2, 0`; a test for `=== 2` triggers on the second swing after a reset. This affects Three-Beat and the base Emberbrand timing. |
| Medium | Equipment purchase is a two-step operation | `makeEquipCard` buys/unlocks and returns before equipping. Use an explicit “Buy & equip” action, or clearly separate “Buy” and “Equip.” |
| Medium | Relic replacement contradicts the help text | The code always replaces slot zero. After the first replacement, slot zero is the newest item, not necessarily the oldest. Show both equipped relics and let players choose the replacement or skip. |
| Medium | Named perk descriptions do not match effects | Guard Drip heals only on perfect blocks, despite describing successful blocks generally. Clean Parry allows projectile reflection on ordinary blocks and does not implement its described energy refund. |
| Medium | Damage and event descriptions diverge | Lifesteal uses calculated damage including overkill, despite describing real damage dealt. Blood-red Note advertises +2 damage but increments a core rank worth +3. The Eraser max-HP penalty is overwritten by `recomputePlayer`. |
| Medium | “Auto-open route map” is misleading | The setting changes the delay from 1.5 to 2.2 seconds; it does not disable the automatic transition. |
| Medium | Some promised upgrades are incomplete | Emberbrand’s description mentions awakening into Ashbringer, but there is no implemented evolution path. Hexblade’s Mend upgrade increases healing, not the advertised chance of Mend. |
| Medium | Non-combat routes can be farmed | Rest, forge, and treasure generate another route selection without advancing danger or spending a finite route node. This allows repeated rewards without matching combat progress. |
| Medium | Losing focus does not pause combat | The blur listener clears keys/buttons, but leaves the game playing. Touch movement also needs explicit cancellation handling. |
| Medium | Story retry and new-game wording is risky | The death button says “Restart Chapter” while continuation resumes the saved scene. Starting Story Mode clears the current story save immediately. Make resume/retry/new campaign distinct. |

The move to the hub keeps the original runtime intact so these findings can be addressed together with the chosen redesign rather than piecemeal balance changes.

## Improvements I would make

### 1. A better first minute

Start with the hero on a small page, one visible objective, and a harmless practice enemy. Ask the player to move, then land a swing, then dodge a clearly marked attack. Introduce the shield afterward. Confirm each action before advancing. Keep optional dialogue available without blocking the tutorial.

Hide unavailable controls and shop categories until they are introduced. Use action names consistently: Health, Guard, Dash, Gold, and Level. Explain temporary run bonuses versus permanent unlocks explicitly.

### 2. Combat with clear feedback

Add a visible aim cue and readable sword arc, buffered inputs, a reliable three-hit rhythm, stronger impact feedback, and a clear recovery window after attacks. Offer hold-to-attack as an option to reduce repeated clicking. Telegraph dangerous enemy attacks with shapes and timing, not color alone.

Give blocking a clear rule: either full blocks with guard energy, or partial damage reduction with meaningful efficiency. Show perfect-block timing, guard breaks, and why damage got through. Dash and parry should create obvious counterattack opportunities. Adjustable shake, flashes, and effects should affect both the game and cinematics.

### 3. Fewer, stronger build choices

Start the remake with three distinct loadouts: balanced sword/shield, heavy breaker, and fast elemental blade. Favor abilities that visibly change attacks over long lists of small percentage upgrades. Give each a small, coherent upgrade path and show before/after effects.

Use gold for equipment and healing; use one between-room choice for run perks. Queue rewards until a safe point instead of repeatedly interrupting fights. Keep two relic slots, with explicit replacement and a skip option. Prevent irrelevant perks from appearing when a build cannot use them.

### 4. A shop that explains itself

Present a few relevant offers, show what changes compared with equipped gear, and use “Buy & equip.” Display affordability, current equipment, and the next unlock. Offer undo while still in the shop if the purchase has not affected combat. Replace technical category explanations with concise player-facing outcomes.

### 5. Enemies and rooms with purpose

Give each enemy a distinct silhouette, sound, wind-up, attack, and recovery. Script the tutorial’s enemy composition. Add cover, torn-page hazards, ink pools, and meaningful arena layouts rather than scaling only health and enemy count.

Vary objectives: defend a doodle, break seals, escape an advancing eraser, survive a timed swarm, or duel a rival. Rebuild bosses around recognizable patterns and punish windows. Keep the four story identities, but give each a signature mechanic.

### 6. Better pacing and story delivery

Shorten the opening, move some Margin dialogue into safe moments in the arena, and reserve full comic sequences for major events. Give Nib and rescued drawings visible roles between chapters. Save chapter recaps for returning players. Present one ending sequence rather than replaying the final chapter outro as the ending.

### 7. Progress and replayability

Use a finite, visible route with battle/rest/shop nodes and a marked boss destination. Show “Room 3 of 6” and what the player risks or gains at a branch. Add endless, boss rush, and a daily seeded challenge only after the core mode works.

Track best runs, achievements, unlocked loadouts, and cosmetics without making repeated grinding necessary to win. Build an end-of-run summary showing cause of death, build, damage sources, and one helpful retry hint. Shared leaderboards need a backend and score validation; browser storage alone cannot make scores trustworthy.

### 8. Reliable saves

Version and validate save data, save pending choices, checkpoint before dangerous transitions, and handle unavailable storage gracefully. Offer explicit Continue, New Game, and Retry Scene actions. Export/import saves can work locally; cross-device saves require accounts or another authenticated storage service. Changing the hostname/origin needs an explicit save-transfer strategy.

### 9. Mobile, controller, and accessibility

Separate movement from aiming on touch, add sensible aim assist, handle cancelled touches, and account for safe areas and small screens. Decouple arena coordinates from viewport size so the same encounter is not fundamentally harder on a phone. Add controller support and remappable keyboard controls.

Use readable interface text, keyboard-operable menus, visible focus, color-independent cues, subtitle controls, and a reduced-effects setting. Test the actual layout at small sizes and enlarged text. Do not force cinematic movement on players who request reduced motion.

### 10. Audio and art

Keep the hand-drawn identity, but establish consistent character proportions, enemy silhouettes, weapon effects, and UI icons. Use sound to distinguish a hit, block, parry, guard break, dash ready, and a boss wind-up. Add chapter ambience and more deliberate music transitions. New artwork should support those readable mechanics, not hide them.

### 11. A maintainable game foundation

Split the monolith into combat, enemy AI, world, progression, UI state, input, audio, and save modules. Keep configuration data separate from behavior. Centralize stat recomputation and transitions; cancel old timers on state/run changes. Use fixed simulation steps or time-based probabilities, a seeded random source for reproducible runs, and a small set of regression tests for saves, equipment, rewards, and spawning.

Profile before optimizing broadly. Likely targets are repeated computed-style reads, HUD writes every frame, particle allocation, and the all-pairs enemy separation loop. Cache palette values, update unchanged HUD fields less frequently, cap decorative effects, and consider spatial partitioning for larger encounters.

## If we change the direction completely

| Direction | What playing it would feel like | Tradeoff |
| --- | --- | --- |
| Focused action roguelite — recommended | Short room-based runs, deliberate sword/dash/parry combat, three clear loadouts, escalating bosses, optional story. | Reuses the existing identity and much of the game logic while making the core much clearer. |
| Physics playground | Swing oversized weapons, knock enemies through scenery, use ragdoll reactions, play short challenge arenas. | Strong immediate appeal; requires a physics foundation, new collision rules, and extensive tuning. |
| Sketchbook adventure | Explore connected pages, rescue drawings, solve environmental puzzles, unlock traversal, and discover why the Artist stopped. | Strong fit for the story; much larger world, level-design, camera, animation, and content scope. |
| Minimal survival arcade | Move, auto-attack, choose an upgrade at intervals, chase a short high-score run. | Easiest entry for a browser arcade; could become a separate second game so manual sword combat keeps its identity. |

Online co-op and competitive modes are possible later, but require authoritative simulation or carefully designed networking, sessions, hosting, reconciliation, and abuse controls. They should be separate milestones, not assumed additions to this static hub.

## Suggested implementation order

1. **Hub:** select a game, launch it, return to the catalog. Delivered in this change, with three clearly marked future slots.
2. **Playable remake slice:** one arena, three enemy types, one weapon, dash, block/parry, a five-step practical tutorial, one boss, and reliable restart/save behavior.
3. **Build system:** three distinct loadouts, a small set of meaningful upgrades, equipment comparison, and explicit relic replacement.
4. **Complete a short run:** finite route, controlled encounter pacing, polished rewards, death summary, and a tested difficulty curve.
5. **Expand:** remaining chapters, additional game modes, achievements/cosmetics, and later the second independent game for the hub.

A useful gate for the first slice is simple: a new player should know where to go, understand why they took damage, and make their first upgrade choice without opening a help page. Measure that with actual first-time playtests before expanding content.

## Validation performed for this change

- Checked local HTML asset references, route targets, anchors, and duplicate IDs.
- Compiled all active JavaScript files.
- Checked the catalog has exactly one playable game and three non-playable placeholders.
- Verified the existing active game runtime, story data, and game stylesheet are byte-for-byte unchanged.
- Executed real game startup, story-to-battle transition, movement, a render/update call, and save/restore with platform stubs.
- Reproduced the early elite crash, cadence fireball failure, lost rest level-up choice, and retained Afterimage effect in that harness.
- Checked stylesheet structure and the presence of responsive and reduced-motion rules. Visual layout, browser-specific interaction, touch behavior, and full-game balance still need a real browser playtest.
