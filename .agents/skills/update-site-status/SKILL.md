---
name: update-site-status
description: Update the weiran-verse personal website's top-left status from a user-provided sentence and photo. Use when the user says to update, change, refresh, or replace their website status/current moment, including Chinese requests such as “更新网站状态”, and when they invoke $update-site-status. Do not use for general homepage copy, blog posts, gallery items, or theme changes.
---

# Update Site Status

Update the site's structured status data and local photo asset, then verify the result.

## Inputs

Require:

- One short status sentence.
- One attached or locally accessible image file.

Accept these optional inputs without requiring them:

- `emoji`
- a longer Polaroid `note`
- `location`
- `date`
- image alt text

If either required input is missing, ask only for the missing item. Never invent personal status content, a location, or a photo.

## Workflow

1. Work from the `weiran-verse` repository root. Confirm `package.json` contains the `update-status` script.
2. Resolve the attached image to a local path. Do not replace it with a stock image or hotlink.
3. Run the deterministic updater with quoted arguments:

   ```bash
   npm run update-status -- --text "STATUS" --image "/absolute/path/to/image" --emoji "EMOJI" --note "NOTE" --location "LOCATION" --date "YYYY-MM-DD" --alt "ALT TEXT"
   ```

   Omit optional flags the user did not provide. The updater copies the image into `public/status/` and atomically updates `src/data/status.json`.
4. Inspect `src/data/status.json` and the new image path. Ensure the sentence and optional fields match the user's input exactly.
5. Run `npm run check` and `npm run build`. Fix only status-workflow regressions introduced by this update.
6. Report the changed status, stored image path, and validation results.

Only start a browser preview or dev server when the user asks for visual verification or the change exposes a UI regression that cannot be verified through checks and builds alone. Browser and server lifecycle decisions belong to the surrounding development task, not this content-update skill.

## Boundaries

- Do not commit, push, deploy, or publish unless the user explicitly asks.
- Do not modify unrelated homepage, blog, gallery, music, or theme content.
- Do not delete earlier files in `public/status/`; they may be useful history and are safe to clean up separately.
- Preserve the image's original format. The supported inputs are AVIF, GIF, JPEG, PNG, and WebP.
