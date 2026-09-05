# WebyIsBored working agreements

These preferences were explicitly requested by the repository owner in this project:

- Release completed requested updates on GitHub and verify the connected Vercel deployment. The owner moved hosting to Vercel; keep using this repository and its custom domain.
- The owner welcomes major game redesigns when they improve the game. Preserve an understandable, polished experience rather than retaining old mechanics by default.
- Remove obsolete files when replacing implementations. Do not keep duplicate old games in the published site; Git history already preserves earlier revisions.
- News and Coming Soon are separate pages at `/news/` and `/coming-soon/`.
- Include player-facing release or patch notes in the News feed when shipping updates.

Technical context: static HTML/CSS/JavaScript, no install step, no backend. Keep game assets self-contained under `games/<slug>/`. Run the meaningful simulation and site tests before publishing. Do not claim a browser playtest unless one was actually performed. The historical game review in `docs/GAME_REVIEW.md` describes the removed original game, not the current runtime.
