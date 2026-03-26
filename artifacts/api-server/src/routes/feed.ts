import { Router, type IRouter } from "express";
import { db, postsTable, usersTable, likesTable, followsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../lib/asyncHandler.js";

const router: IRouter = Router();

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const currentUserId = req.user!.userId;

  const following = await db
    .select({ following_id: followsTable.following_id })
    .from(followsTable)
    .where(eq(followsTable.follower_id, currentUserId));

  const followingIds = following.map((f) => f.following_id);

  const [posts, totalResult] = await Promise.all([
    followingIds.length > 0
      ? db
          .select()
          .from(postsTable)
          .where(
            and(
              eq(postsTable.is_active, true),
              inArray(postsTable.author_id, followingIds)
            )
          )
          .orderBy(desc(postsTable.created_at))
          .limit(limit)
          .offset(offset)
      : db
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
        .where(inArray(usersTable.id, authorIds))
    : [];

  const postIds = posts.map((p) => p.id);
  const likedPosts =
    postIds.length > 0
      ? await db
          .select({ post_id: likesTable.post_id })
          .from(likesTable)
          .where(
            and(
              eq(likesTable.user_id, currentUserId),
              inArray(likesTable.post_id, postIds)
            )
          )
      : [];

  const likedSet = new Set(likedPosts.map((l) => l.post_id));
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const total = Number(totalResult[0]?.count ?? 0);

  res.json({
    posts: posts.map((post) => {
      const author = authorMap.get(post.author_id)!;
      return {
        id: post.id,
        content: post.content,
        image_url: post.image_url ?? null,
        is_active: post.is_active,
        like_count: post.like_count,
        comment_count: post.comment_count,
        is_liked: likedSet.has(post.id),
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
    }),
    total,
    page,
    limit,
    has_next: offset + posts.length < total,
  });
}));

export default router;
