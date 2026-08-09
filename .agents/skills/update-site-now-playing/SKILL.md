---
name: update-site-now-playing
description: Update the weiran-verse personal website's Now Playing game card while preserving every game in Gallery. Use when the user asks to change the current game, update game progress, says “更新 Now Playing” or “更新正在玩的游戏”, or invokes $update-site-now-playing. Do not use for the music player, songs, books, or visual theme changes.
---

# Update Site Now Playing

Point the homepage Now Playing card to a Gallery game. Preserve all previous Gallery entries.

## Inputs

For an existing Gallery game, require only enough information to identify it. Inspect `src/data/library.js` and `src/data/library-additions.json` to resolve its ID.

For a new game, require:

- title
- studio/developer
- an attached/local cover image, site-local image path, or cover URL

For homepage game-card covers, prefer a local landscape asset suitable for the banner treatment. `GameCard` renders covers with `w-full h-full object-cover object-top`; use a wide image (prefer 16:9 or wider, with important subjects near the upper/center area), avoid square or portrait covers with built-in side whitespace, and verify the source dimensions before selecting it. The desktop card spans two grid columns at a fixed 240px row height, so a wide composition prevents gray side bands and excessive cropping.

Accept optional platform, progress, rating, summary, review, year, and genre. Never delete or overwrite the previously current game.

## Workflow

1. Work from the `weiran-verse` repository root and confirm `package.json` contains `update-now-playing`.
2. To select an existing Gallery game, run:

   ```bash
   npm run update-now-playing -- --id "GAME_ID"
   ```

3. To add a new game, run:

   ```bash
   npm run update-now-playing -- --title "TITLE" --studio "STUDIO" --cover "/absolute/path/or/url" --platform "PLATFORM"
   ```

   Add optional metadata flags when provided. The updater appends the new game to `src/data/library-additions.json`, copies local covers into `public/library/games/`, and updates only the current game reference in `src/data/current-library.json`.
4. Inspect both JSON files. Confirm the new/current game is present and earlier games remain unchanged.
5. For a cover change, inspect the local asset dimensions and preview it at the homepage banner aspect ratio before updating the cover path. Keep older files in `public/library/games/` intact.
6. Run `npm run check` and `npm run build`.
7. Report the selected game, whether a Gallery entry was added, the cover dimensions/aspect-ratio decision, and validation results.

Only start a browser preview or dev server when requested or needed to diagnose a UI regression.

## Boundaries

- Do not commit, push, deploy, or publish unless explicitly requested.
- Do not update status, reading, songs, or theme code.
- Do not remove or rewrite earlier Gallery games unless explicitly requested.
- Do not delete older files in `public/library/games/`.
