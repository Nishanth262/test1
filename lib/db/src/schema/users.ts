import { pgTable, serial, text, varchar, timestamp, boolean, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 30 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  first_name: varchar("first_name", { length: 100 }).notNull(),
  last_name: varchar("last_name", { length: 100 }).notNull(),
  bio: varchar("bio", { length: 160 }),
  avatar_url: text("avatar_url"),
  website: text("website"),
  location: varchar("location", { length: 100 }),
  followers_count: integer("followers_count").notNull().default(0),
  following_count: integer("following_count").notNull().default(0),
  posts_count: integer("posts_count").notNull().default(0),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
  followers_count: true,
  following_count: true,
  posts_count: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
