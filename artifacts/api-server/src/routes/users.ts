import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { db, usersTable, followsTable } from "@workspace/db";
import { eq, and, ne, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { storeImage } from "../lib/imageStorage.js";
import { asyncHandler } from "../lib/asyncHandler.js";

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

function formatUser(user: typeof usersTable.$inferSelect, isFollowing = false) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    bio: user.bio ?? null,
    avatar_url: user.avatar_url ?? null,
    website: user.website ?? null,
    location: user.location ?? null,
    posts_count: user.posts_count,
    followers_count: user.followers_count,
    following_count: user.following_count,
    is_following: isFollowing,
    created_at: user.created_at.toISOString(),
    last_login: user.last_login?.toISOString() ?? null,
  };
}

router.get("/", requireAuth, asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const currentUserId = req.user!.userId;

  const [users, totalResult] = await Promise.all([
    db.select().from(usersTable).limit(limit).offset(offset),
    db.select({ count: sql<number>`count(*)` }).from(usersTable),
  ]);

  const followedIds = users.length
    ? await db
        .select({ following_id: followsTable.following_id })
        .from(followsTable)
        .where(
          and(
            eq(followsTable.follower_id, currentUserId),
            inArray(followsTable.following_id, users.map((u) => u.id))
          )
        )
    : [];

  const followedSet = new Set(followedIds.map((f) => f.following_id));
  const total = Number(totalResult[0]?.count ?? 0);

  res.json({
    users: users.map((u) => formatUser(u, followedSet.has(u.id))),
    total,
    page,
    limit,
    has_next: offset + users.length < total,
  });
}));

router.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const { bio, avatar_url, website, location, first_name, last_name } = req.body;

  const updateData: Record<string, unknown> = { updated_at: new Date() };
  if (bio !== undefined) {
    if (bio && bio.length > 160) {
      res.status(400).json({ error: "Validation error", message: "Bio max 160 characters" });
      return;
    }
    updateData.bio = bio;
  }
  if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
  if (website !== undefined) updateData.website = website;
  if (location !== undefined) updateData.location = location;
  if (first_name !== undefined) updateData.first_name = first_name;
  if (last_name !== undefined) updateData.last_name = last_name;

  const [updated] = await db
    .update(usersTable)
    .set(updateData)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json(formatUser(updated));
}));

router.post("/me/avatar", requireAuth, upload.single("avatar"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Bad Request", message: "No image file provided" });
    return;
  }

  const ext = req.file.mimetype === "image/jpeg" ? "jpg" : "png";
  const filename = `avatar-${req.user!.userId}-${crypto.randomBytes(8).toString("hex")}.${ext}`;
  const avatar_url = await storeImage(req.file.buffer, filename, req.file.mimetype);

  await db
    .update(usersTable)
    .set({ avatar_url, updated_at: new Date() })
    .where(eq(usersTable.id, req.user!.userId));

  res.json({ avatar_url, message: "Avatar uploaded successfully" });
}));

router.get("/:userId", requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  if (isNaN(userId)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid user ID" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }

  const currentUserId = req.user!.userId;
  let isFollowing = false;
  if (currentUserId !== userId) {
    const [follow] = await db
      .select()
      .from(followsTable)
      .where(and(eq(followsTable.follower_id, currentUserId), eq(followsTable.following_id, userId)))
      .limit(1);
    isFollowing = !!follow;
  }

  res.json(formatUser(user, isFollowing));
}));

router.post("/:userId/follow", requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const currentUserId = req.user!.userId;

  if (userId === currentUserId) {
    res.status(400).json({ error: "Bad Request", message: "Cannot follow yourself" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!target) {
    res.status(404).json({ error: "Not Found", message: "User not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(followsTable)
    .where(and(eq(followsTable.follower_id, currentUserId), eq(followsTable.following_id, userId)))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "Bad Request", message: "Already following this user" });
    return;
  }

  await db.insert(followsTable).values({ follower_id: currentUserId, following_id: userId });
  await Promise.all([
    db
      .update(usersTable)
      .set({ following_count: sql`${usersTable.following_count} + 1` })
      .where(eq(usersTable.id, currentUserId)),
    db
      .update(usersTable)
      .set({ followers_count: sql`${usersTable.followers_count} + 1` })
      .where(eq(usersTable.id, userId)),
  ]);

  res.json({ message: "Followed successfully" });
}));

router.delete("/:userId/follow", requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const currentUserId = req.user!.userId;

  const [existing] = await db
    .select()
    .from(followsTable)
    .where(and(eq(followsTable.follower_id, currentUserId), eq(followsTable.following_id, userId)))
    .limit(1);

  if (!existing) {
    res.status(400).json({ error: "Bad Request", message: "Not following this user" });
    return;
  }

  await db
    .delete(followsTable)
    .where(and(eq(followsTable.follower_id, currentUserId), eq(followsTable.following_id, userId)));

  await Promise.all([
    db
      .update(usersTable)
      .set({ following_count: sql`GREATEST(${usersTable.following_count} - 1, 0)` })
      .where(eq(usersTable.id, currentUserId)),
    db
      .update(usersTable)
      .set({ followers_count: sql`GREATEST(${usersTable.followers_count} - 1, 0)` })
      .where(eq(usersTable.id, userId)),
  ]);

  res.json({ message: "Unfollowed successfully" });
}));

router.get("/:userId/followers", requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const currentUserId = req.user!.userId;

  const followers = await db
    .select({ user: usersTable })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.follower_id, usersTable.id))
    .where(eq(followsTable.following_id, userId))
    .limit(limit)
    .offset(offset);

  const total = followers.length; // simplified
  res.json({
    users: followers.map((f) => formatUser(f.user, f.user.id !== currentUserId)),
    total,
    page,
    limit,
    has_next: false,
  });
}));

router.get("/:userId/following", requireAuth, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.userId as string);
  const page = Math.max(1, parseInt(String(req.query.page ?? "1")));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "20"))));
  const offset = (page - 1) * limit;
  const currentUserId = req.user!.userId;

  const following = await db
    .select({ user: usersTable })
    .from(followsTable)
    .innerJoin(usersTable, eq(followsTable.following_id, usersTable.id))
    .where(eq(followsTable.follower_id, userId))
    .limit(limit)
    .offset(offset);

  const total = following.length;
  res.json({
    users: following.map((f) => formatUser(f.user, f.user.id !== currentUserId)),
    total,
    page,
    limit,
    has_next: false,
  });
}));

export default router;
