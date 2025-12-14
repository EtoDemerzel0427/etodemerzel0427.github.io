---
title: "React Server Components: A Mental Model Shift"
slug: "react-server-components"
date: "2024-05-10"
tags: ["React", "Web Development", "Performance"]
lang: "en"
summary: "Server Components are not just about performance; they are about blurring the line between backend and frontend..."
---

> [!NOTE]
> **This is a placeholder article.**
> The content below is generated for demonstration purposes to showcase the blog's rendering capabilities.
> 
> *这是一篇占位文章。以下内容仅用于演示博客的渲染效果。*

Server Components are not just about performance; they are about **blurring the line** between backend and frontend.

### Why RSC?

Traditionally, we fetched data on the client (useEffect + fetch) or used SSR (getServerSideProps). RSC gives us a third option: components that **only execute on the server** and stream UI to the client.

```jsx
// This runs on the server!
import db from './db';

async function Post({ id }) {
  const post = await db.post.findUnique({ where: { id } });
  return <article>{post.content}</article>;
}
```

### Zero Bundle Size

The dependencies used in Server Components (like that `db` library, or a heavy markdown parser) are **never downloaded** to the client. This is a game changer for bundle sizes.

### Conclusion

RSC requires unlearning some habits (no `useState` on the server!), but the simplified data model is worth it.
