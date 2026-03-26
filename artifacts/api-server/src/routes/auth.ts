import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { RegisterUserBody, LoginUserBody } from "@workspace/api-zod";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

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

router.post("/register", async (req, res) => {
  try {
    const parsed = RegisterUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", message: parsed.error.message });
      return;
    }

    const { email, username, password, first_name, last_name } = parsed.data;

    const existing = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, email), eq(usersTable.username, username)))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Conflict", message: "Email or username already exists" });
      return;
    }

    const password_hash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({ email, username, password_hash, first_name, last_name })
      .returning();

    const access_token = signToken({ userId: user.id, username: user.username });
    res.status(201).json({ access_token, user: formatUser(user) });
  } catch (error) {
    logger.error({ err: error }, "Register endpoint failed");
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Internal Server Error", message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = LoginUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", message: parsed.error.message });
      return;
    }

    const { login, password } = parsed.data;

    const [user] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.email, login), eq(usersTable.username, login)))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
      return;
    }

    await db
      .update(usersTable)
      .set({ last_login: new Date() })
      .where(eq(usersTable.id, user.id));

    const access_token = signToken({ userId: user.id, username: user.username });
    res.json({ access_token, user: formatUser(user) });
  } catch (error) {
    logger.error({ err: error }, "Login endpoint failed");
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Internal Server Error", message });
  }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
