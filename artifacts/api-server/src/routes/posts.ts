import { Router, type IRouter } from "express";
import multer from "multer";
import crypto from "crypto";
import { db, postsTable, usersTable, likesTable, commentsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { storeImage } from "../lib/imageStorage.js";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG and PNG images are allowed"));
    }
  },
});

function formatPost(
  post: typeof postsTable.$inferSelect,
  author: typeof usersTable.$inferSelect,
  isLiked: boolean
) {
  return {
    id: post.id,
    content: post.content,
    image_url: post.image_url ?? null,
    is_active: post.is_active,
    like_count: post.like_count,
    comment_count: post.comment_count,
    is_liked: isLiked,
    author: {
      id: author.id,
      username: author.username,
      first_name: author.first_name,
      last_name: author.last_name,
      avatar_url: author.avatar_url ?? null,
    },
    created_at: post.created_at.toISOString(),
    updated_at: post.updated_at.toISOString(),
  };
}

async function getPostsWithLikes(
  posts: (typeof postsTable.$inferSelect)[],
  authors: (typeof usersTable.$inferSelect)[],
  currentUserId: number
) {
  if (!posts.length) return [];

  const postIds = posts.map((p) => p.id);
  const likedPosts =
    postIds.length > 0
      ? await db
          .select({ post_id: likesTable.post_id })
          .from(likesTable)
          .where(
            and(
              eq(likesTable.user_id, currentUserId),
              sql`${likesTable.post_id} = ANY(ARRAY[${sql.join(postIds.map((id) => sql`${id}`), sql`, `)}]::int[])`
            )
          )
      : [];

  const likedSet = new Set(likedPosts.map((l) => l.post_id));
  const authorMap = new Map(authors.map((a) => [a.id, a]));

  return posts.map((post) => formatPost(post, authorMap.get(post.author_id)!, likedSet.has(post.id)));
}

router.get("/", requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const currentUserId = req.user!.userId;

  const [posts, totalResult] = await Promise.all([
    db
      .select()
      .from(postsTable)
      .where(eq(postsTable.is_active, true))
      .orderBy(desc(postsTable.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(postsTable).where(eq(postsTable.is_active, true)),
  ]);

  const authorIds = [...new Set(posts.map((p) => p.author_id))];
  const authors = authorIds.length
    ? await db
        .select()
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(ARRAY[${sql.join(authorIds.map((id) => sql`${id}`), sql`, `)}]::int[])`)
    : [];

  const total = Number(totalResult[0]?.count ?? 0);
  const formatted = await getPostsWithLikes(posts, authors, currentUserId);

  res.json({
    posts: formatted,
    total,
    page,
    limit,
    has_next: offset + posts.length < total,
  });
});

router.post("/", requireAuth, upload.single("image"), async (req, res) => {
  const content = req.body.content;
  if (!content || content.length === 0) {
    res.status(400).json({ error: "Validation error", message: "Content is required" });
    return;
  }
  if (content.length > 280) {
    res.status(400).json({ error: "Validation error", message: "Content max 280 characters" });
    return;
  }

  let image_url: string | undefined;
  if (req.file) {
    const ext = req.file.mimetype === "image/jpeg" ? "jpg" : "png";
    const filename = `post-${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
    image_url = await storeImage(req.file.buffer, filename);
  }

  const [post] = await db
    .insert(postsTable)
    .values({ content, image_url, author_id: req.user!.userId })
    .returning();

  await db
    .update(usersTable)
    .set({ posts_count: sql`${usersTable.posts_count} + 1` })
    .where(eq(usersTable.id, req.user!.userId));

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.status(201).json(formatPost(post, author, false));
});

router.get("/:postId", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  if (isNaN(postId)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid post ID" });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, postId), eq(postsTable.is_active, true)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Not Found", message: "Post not found" });
    return;
  }

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.author_id)).limit(1);
  const [liked] = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.user_id, req.user!.userId), eq(likesTable.post_id, postId)))
    .limit(1);

  res.json(formatPost(post, author, !!liked));
});

router.patch("/:postId", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);

  if (!post) {
    res.status(404).json({ error: "Not Found", message: "Post not found" });
    return;
  }
  if (post.author_id !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden", message: "Not your post" });
    return;
  }

  const { content } = req.body;
  if (content && content.length > 280) {
    res.status(400).json({ error: "Validation error", message: "Content max 280 characters" });
    return;
  }

  const [updated] = await db
    .update(postsTable)
    .set({ content: content ?? post.content, updated_at: new Date() })
    .where(eq(postsTable.id, postId))
    .returning();

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, post.author_id)).limit(1);
  const [liked] = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.user_id, req.user!.userId), eq(likesTable.post_id, postId)))
    .limit(1);

  res.json(formatPost(updated, author, !!liked));
});

router.delete("/:postId", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);

  if (!post) {
    res.status(404).json({ error: "Not Found", message: "Post not found" });
    return;
  }
  if (post.author_id !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden", message: "Not your post" });
    return;
  }

  await db.update(postsTable).set({ is_active: false }).where(eq(postsTable.id, postId));
  await db
    .update(usersTable)
    .set({ posts_count: sql`GREATEST(${usersTable.posts_count} - 1, 0)` })
    .where(eq(usersTable.id, req.user!.userId));

  res.json({ message: "Post deleted successfully" });
});

router.post("/:postId/like", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const currentUserId = req.user!.userId;

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, postId), eq(postsTable.is_active, true)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Not Found", message: "Post not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.user_id, currentUserId), eq(likesTable.post_id, postId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "Bad Request", message: "Already liked this post" });
    return;
  }

  await db.insert(likesTable).values({ user_id: currentUserId, post_id: postId });
  await db
    .update(postsTable)
    .set({ like_count: sql`${postsTable.like_count} + 1` })
    .where(eq(postsTable.id, postId));

  res.json({ message: "Post liked" });
});

router.delete("/:postId/like", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const currentUserId = req.user!.userId;

  const [existing] = await db
    .select()
    .from(likesTable)
    .where(and(eq(likesTable.user_id, currentUserId), eq(likesTable.post_id, postId)))
    .limit(1);

  if (!existing) {
    res.status(400).json({ error: "Bad Request", message: "Not liked this post" });
    return;
  }

  await db
    .delete(likesTable)
    .where(and(eq(likesTable.user_id, currentUserId), eq(likesTable.post_id, postId)));
  await db
    .update(postsTable)
    .set({ like_count: sql`GREATEST(${postsTable.like_count} - 1, 0)` })
    .where(eq(postsTable.id, postId));

  res.json({ message: "Post unliked" });
});

router.get("/:postId/comments", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;

  const [comments, totalResult] = await Promise.all([
    db
      .select({ comment: commentsTable, author: usersTable })
      .from(commentsTable)
      .innerJoin(usersTable, eq(commentsTable.author_id, usersTable.id))
      .where(eq(commentsTable.post_id, postId))
      .orderBy(desc(commentsTable.created_at))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(commentsTable).where(eq(commentsTable.post_id, postId)),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);
  res.json({
    comments: comments.map(({ comment, author }) => ({
      id: comment.id,
      content: comment.content,
      post_id: comment.post_id,
      author: {
        id: author.id,
        username: author.username,
        first_name: author.first_name,
        last_name: author.last_name,
        avatar_url: author.avatar_url ?? null,
      },
      created_at: comment.created_at.toISOString(),
      updated_at: comment.updated_at.toISOString(),
    })),
    total,
    page,
    limit,
    has_next: offset + comments.length < total,
  });
});

router.post("/:postId/comments", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const { content } = req.body;

  if (!content || content.length === 0) {
    res.status(400).json({ error: "Validation error", message: "Content is required" });
    return;
  }
  if (content.length > 500) {
    res.status(400).json({ error: "Validation error", message: "Comment max 500 characters" });
    return;
  }

  const [post] = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, postId), eq(postsTable.is_active, true)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Not Found", message: "Post not found" });
    return;
  }

  const [comment] = await db
    .insert(commentsTable)
    .values({ content, author_id: req.user!.userId, post_id: postId })
    .returning();

  await db
    .update(postsTable)
    .set({ comment_count: sql`${postsTable.comment_count} + 1` })
    .where(eq(postsTable.id, postId));

  const [author] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  res.status(201).json({
    id: comment.id,
    content: comment.content,
    post_id: comment.post_id,
    author: {
      id: author.id,
      username: author.username,
      first_name: author.first_name,
      last_name: author.last_name,
      avatar_url: author.avatar_url ?? null,
    },
    created_at: comment.created_at.toISOString(),
    updated_at: comment.updated_at.toISOString(),
  });
});

router.delete("/:postId/comments/:commentId", requireAuth, async (req, res) => {
  const postId = parseInt(req.params.postId);
  const commentId = parseInt(req.params.commentId);

  const [comment] = await db
    .select()
    .from(commentsTable)
    .where(and(eq(commentsTable.id, commentId), eq(commentsTable.post_id, postId)))
    .limit(1);

  if (!comment) {
    res.status(404).json({ error: "Not Found", message: "Comment not found" });
    return;
  }
  if (comment.author_id !== req.user!.userId) {
    res.status(403).json({ error: "Forbidden", message: "Not your comment" });
    return;
  }

  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  await db
    .update(postsTable)
    .set({ comment_count: sql`GREATEST(${postsTable.comment_count} - 1, 0)` })
    .where(eq(postsTable.id, postId));

  res.json({ message: "Comment deleted" });
});

export default router;
