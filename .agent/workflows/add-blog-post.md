---
description: How to add a new blog post
---

1. Create a new markdown file in `src/content/posts/` with a descriptive filename (e.g., `2024-03-20-my-new-post.md`).

2. Add the following Frontmatter block at the very top of the file:

```yaml
---
title: "Your Post Title"
date: "2024-03-20"
summary: "A short description of your post."
tags: ["Tech", "Life"]
lang: "en" # or "zh"
readTime: "5 min read"
slug: "my-custom-slug" # Optional: overrides filename
---
```

3. Write your content below the `---` using standard Markdown.

4. (Optional) To preview locally, run `npm run dev`.

5. Commit and push your changes to GitHub to publish.
