# Publishing news

The public update log is `/news/`. Posts are defined in **`assets/hub/news.json`**, newest first. The page is generated as static HTML, so every post is readable and linkable without JavaScript.

## Add a release or patch

1. Add an object at the beginning of `assets/hub/news.json`. Use a unique lowercase, hyphenated `id`, an ISO date, type (`Release`, `Patch`, or `Site update`), game, title, summary, and sections. `version` and `featured` are optional.
2. A section may have a `paragraph`, `items` array, or both. Plain text is escaped automatically. The `link` is relative to the news page: `../games/stick-and-swing/` or `../`.
3. Run:

```sh
node scripts/build-news.mjs
node --test tests/*.test.mjs
```

4. Commit both the JSON and generated `news/index.html`. Publish to GitHub and verify the Pages deployment.

A post with `id: 'stick-and-swing-2-0'` is directly linkable at `/news/#stick-and-swing-2-0`. There is no public submission form or login: updates are authored in the repository and released with the site.

State actual shipped changes and label future plans clearly. Mention changes that affect existing saves or controls. Keep old posts so players can see the release history.
