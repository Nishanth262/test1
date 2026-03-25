import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const followsTable = pgTable("follows", {
  id: serial("id").primaryKey(),
  follower_id: integer("follower_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  following_id: integer("following_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("follows_unique").on(table.follower_id, table.following_id),
]);

export type Follow = typeof followsTable.$inferSelect;
