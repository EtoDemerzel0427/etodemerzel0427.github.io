---
description: How to add a new blog post
---

1. Use the included CLI tool to automatically generate the post file and frontmatter. Run the following command in the workspace root:

   ```bash
   npm run new-post "Your Post Title"
   ```

   This will automatically:
   - Create a markdown file in `src/content/posts/` with the correct date prefix and slug (e.g., `2026-07-04-your-post-title.md`).
   - Populate the template with basic frontmatter.

2. Open the newly created file and update the Frontmatter if needed:

   ```yaml
   ---
   title: "Your Post Title"
   date: "2026-07-04"
   summary: "TODO: Write a short summary here..."
   tags: ["General"]
   lang: "en" # "en" or "zh"
   ---
   ```

3. Write your content below the `---` separator using standard Markdown.

4. (Optional) Preview your changes locally:

   ```bash
   npm run dev
   ```

5. Stage, commit, and push your changes to GitHub to publish.

