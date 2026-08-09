---
name: update-site-now-reading
description: Update the weiran-verse personal website's Now Reading book or reading progress. Use when the user asks to change the current book, update reading progress, says “更新 Now Reading” or “更新正在阅读”, or invokes $update-site-now-reading. Do not use for blog posts, general gallery curation, or visual theme changes.
---

# Update Site Now Reading

Point the homepage Now Reading card to a Gallery book. Preserve all previous Gallery entries.

## Inputs

For an existing Gallery book, require only enough information to identify it. Inspect `src/data/library.js` and `src/data/library-additions.json` to resolve its ID.

For a new book, require:

- title
- author
- an attached/local cover image, site-local image path, or cover URL

Accept progress from 0 to 100. Default a newly selected book to 0 when the user does not provide progress. Also accept an optional link, rating, summary, review, year, and genre.

For a progress-only request, require only the new percentage. Apply it as an override to the current Gallery item rather than replacing that item.

## Workflow

1. Work from the `weiran-verse` repository root and confirm `package.json` contains `update-now-reading`.
2. To select an existing Gallery book, run:

   ```bash
   npm run update-now-reading -- --id "BOOK_ID"
   ```
3. To add a new book, run:

   ```bash
   npm run update-now-reading -- --title "TITLE" --author "AUTHOR" --cover "/absolute/path/or/url" --progress "PERCENT"
   ```

   Add optional `--link`, `--rating`, `--summary`, `--review`, `--year`, or `--genre` values when provided. The updater appends the book to `src/data/library-additions.json`, copies local covers into `public/library/books/`, and updates only the current book reference in `src/data/current-library.json`.
4. For progress only, run:

   ```bash
   npm run update-now-reading -- --progress "PERCENT"
   ```
5. Inspect both JSON files. Confirm the current book is present and earlier books remain unchanged.
6. Run `npm run check` and `npm run build`.
7. Report the selected book, whether a Gallery entry was added, progress, and validation results.

Only start a browser preview or dev server when requested or needed to diagnose a UI regression.

## Boundaries

- Do not commit, push, deploy, or publish unless explicitly requested.
- Do not update status, games, unrelated Gallery entries, or theme code.
- Do not remove or rewrite earlier Gallery books unless explicitly requested.
- Do not delete older files in `public/library/books/`.
